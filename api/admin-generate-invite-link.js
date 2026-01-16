import { createClient } from '@supabase/supabase-js';

const SUPER_ADMIN_EMAIL = 'erich.oberholzer@gmail.com';

function getSupabaseUrl() {
  const raw = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  return typeof raw === 'string' ? raw.trim() : raw;
}

function getServiceRoleKey() {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return typeof raw === 'string' ? raw.trim() : raw;
}

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function normalizeSupabaseUrl(url) {
  if (!url || typeof url !== 'string') return null;
  return url.trim().replace(/\/+$/, '');
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

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email: emailLower,
    options: {
      redirectTo: redirect || undefined,
    },
  });

  if (linkError) {
    res.status(400).json({
      ok: false,
      error: linkError.message || 'Failed to generate invite link',
    });
    return;
  }

  res.status(200).json({ ok: true, actionLink: linkData?.properties?.action_link || null });
}
