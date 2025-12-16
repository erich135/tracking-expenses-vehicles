import { createClient } from '@supabase/supabase-js';

const SUPER_ADMIN_EMAIL = 'erich.oberholzer@gmail.com';

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

async function requireAdmin(supabaseAdmin, accessToken) {
  if (!accessToken) {
    return { ok: false, status: 401, message: 'Missing Authorization bearer token' };
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !userData?.user?.email) {
    return { ok: false, status: 401, message: 'Invalid or expired session' };
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
  const authz = await requireAdmin(supabaseAdmin, accessToken);
  if (!authz.ok) {
    res.status(authz.status).json({ error: authz.message });
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
