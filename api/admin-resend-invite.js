import { createClient } from '@supabase/supabase-js';

const SUPER_ADMIN_EMAIL = 'erich.oberholzer@gmail.com';

function getSupabaseUrl() {
  const raw = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  return typeof raw === 'string' ? raw.replace(/\\n/g, '').trim() : raw;
}

function getServiceRoleKey() {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return typeof raw === 'string' ? raw.replace(/\\n/g, '').trim() : raw;
}

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function normalizeSupabaseUrl(url) {
  if (!url || typeof url !== 'string') return null;
  return url.replace(/\\n/g, '').trim().replace(/\/+$/, '');
}

function base64UrlDecode(input) {
  if (!input || typeof input !== 'string') return null;
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  try {
    return Buffer.from(padded, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function decodeJwtClaims(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const json = base64UrlDecode(parts[1]);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getJwtRole(token) {
  const claims = decodeJwtClaims(token);
  return claims?.role || claims?.user_role || null;
}

async function requireAdmin(supabaseAdmin, accessToken, supabaseUrl) {
  if (!accessToken) {
    return {
      ok: false,
      status: 401,
      message: 'Missing Authorization bearer token',
      hint: 'You may need to sign out and sign in again.',
    };
  }

  const normalizedUrl = normalizeSupabaseUrl(supabaseUrl);
  const expectedIss = normalizedUrl ? `${normalizedUrl}/auth/v1` : null;
  const claims = decodeJwtClaims(accessToken);
  if (expectedIss && claims?.iss && claims.iss !== expectedIss) {
    return {
      ok: false,
      status: 401,
      message: 'Token issuer mismatch',
      details: { tokenIss: claims.iss, expectedIss },
      hint: 'The deployed API is likely configured for a different Supabase project. Ensure Vercel env vars SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY match the frontend VITE_SUPABASE_URL.',
    };
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !userData?.user?.email) {
    return {
      ok: false,
      status: 401,
      message: 'Invalid or expired session',
      details: userError?.message || null,
      hint: 'If you already signed out/in and this persists, check for a Supabase project mismatch between frontend and Vercel serverless env vars.',
    };
  }

  const requesterEmail = userData.user.email.toLowerCase();
  if (requesterEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return { ok: true, requesterEmail };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('approved_users')
    .select('is_admin, is_active')
    .eq('email', requesterEmail)
    .maybeSingle();

  if (profileError) {
    return { ok: false, status: 403, message: 'Not authorized (profile lookup failed)' };
  }

  if (!profile?.is_active || !profile?.is_admin) {
    return { ok: false, status: 403, message: 'Not authorized' };
  }

  return { ok: true, requesterEmail };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({
      error: 'Server invite not configured',
      hint: 'Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY',
    });
    return;
  }

  const serviceRole = getJwtRole(serviceRoleKey);
  if (serviceRole && serviceRole !== 'service_role') {
    res.status(500).json({
      error: 'Server invite not configured',
      hint:
        'SUPABASE_SERVICE_ROLE_KEY is not a service_role key. In Vercel, set SUPABASE_SERVICE_ROLE_KEY to the Supabase Project Settings → API → service_role secret (not the anon key).',
      details: { role: serviceRole },
    });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const accessToken = getBearerToken(req);
  const authz = await requireAdmin(supabaseAdmin, accessToken, supabaseUrl);
  if (!authz.ok) {
    res.status(authz.status).json({ error: authz.message, details: authz.details || null, hint: authz.hint || null });
    return;
  }

  const { email, redirectTo } = req.body || {};
  const emailLower = typeof email === 'string' ? email.toLowerCase().trim() : '';
  const redirect = typeof redirectTo === 'string' && redirectTo.trim() ? redirectTo.trim() : null;

  if (!emailLower) {
    res.status(400).json({ error: 'Missing email' });
    return;
  }

  // Resend strategy:
  // 1. Try invite (works for users not yet created in Auth)
  // 2. If "already registered", look up the existing auth user.
  //    - If they have NOT confirmed (still pending invite acceptance), delete the
  //      stale auth user and re-invite. This is the common case when the original
  //      invite email failed to deliver.
  //    - If they HAVE confirmed, do not delete; surface a clear message.
  // 3. As a final fallback, generate a manual invite link for delivery.
  let { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    emailLower,
    { redirectTo: redirect || undefined }
  );

  if (!inviteError) {
    res.status(200).json({ ok: true, emailSent: true, userId: inviteData?.user?.id || null });
    return;
  }

  const alreadyRegistered = /already\s+been\s+registered|already\s+registered|already\s+exists/i.test(
    inviteError.message || ''
  );

  if (alreadyRegistered) {
    // Find the existing auth user.
    let existingUser = null;
    try {
      // listUsers does not support a server-side email filter in all SDK versions; page through.
      let page = 1;
      const perPage = 200;
      // Cap pages to avoid runaway loops.
      while (page <= 25 && !existingUser) {
        const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });
        if (listError) break;
        const users = list?.users || [];
        existingUser = users.find((u) => (u.email || '').toLowerCase() === emailLower) || null;
        if (users.length < perPage) break;
        page += 1;
      }
    } catch (e) {
      // ignore lookup failure; we'll fall through to manual link
    }

    const isPending = existingUser && !existingUser.email_confirmed_at && !existingUser.last_sign_in_at;

    if (existingUser && isPending) {
      // Delete and re-invite to refresh the invitation token and re-send the email.
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      if (!deleteError) {
        const retry = await supabaseAdmin.auth.admin.inviteUserByEmail(emailLower, {
          redirectTo: redirect || undefined,
        });
        if (!retry.error) {
          res.status(200).json({
            ok: true,
            emailSent: true,
            userId: retry.data?.user?.id || null,
            note: 'Stale unconfirmed invite was reset and a fresh invitation email was sent.',
          });
          return;
        }
        inviteError = retry.error;
      } else {
        // surface delete error in details below
        inviteError = new Error(
          `${inviteError.message} (cleanup of stale auth user failed: ${deleteError.message})`
        );
      }
    } else if (existingUser && !isPending) {
      res.status(409).json({
        ok: false,
        error: 'This user has already accepted their invitation and signed in. Use "Reset password" instead of resending an invite.',
      });
      return;
    }
  }

  // Final fallback: produce a manual link the admin can deliver.
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email: emailLower,
    options: { redirectTo: redirect || undefined },
  });

  if (linkError) {
    res.status(400).json({
      ok: false,
      error: inviteError.message || 'Failed to resend invite',
      details: linkError.message || 'Failed to generate fallback link',
    });
    return;
  }

  res.status(200).json({
    ok: true,
    emailSent: false,
    warning: inviteError.message || 'Invite email could not be sent',
    actionLink: linkData?.properties?.action_link || null,
  });
}
