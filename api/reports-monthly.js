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

async function requireReportsPermission(supabaseAdmin, accessToken) {
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
    .select('is_admin, is_active, permissions')
    .eq('email', requesterEmail)
    .maybeSingle();

  if (profileError) {
    return { ok: false, status: 403, message: 'Not authorized (profile lookup failed)' };
  }

  if (!profile?.is_active) {
    return { ok: false, status: 403, message: 'Account inactive' };
  }

  if (profile?.is_admin) {
    return { ok: true, requesterEmail };
  }

  const perms = Array.isArray(profile?.permissions) ? profile.permissions : [];
  if (perms.includes('reports') || perms.includes('reports_monthly')) {
    return { ok: true, requesterEmail };
  }

  return { ok: false, status: 403, message: 'Insufficient permissions' };
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
      error: 'Server not configured',
      hint: 'Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY',
    });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const accessToken = getBearerToken(req);
  const authz = await requireReportsPermission(supabaseAdmin, accessToken);
  if (!authz.ok) {
    res.status(authz.status).json({ error: authz.message });
    return;
  }

  let body = req.body;
  if (!body || typeof body !== 'object') {
    try { body = JSON.parse(req.body || '{}'); } catch { body = {}; }
  }

  const { year, month, startDate, endDate } = body || {};

  let startStr = startDate;
  let endStr = endDate;
  if (!startStr || !endStr) {
    const now = new Date();
    const y = typeof year === 'number' ? year : now.getFullYear();
    const m = typeof month === 'number' ? month : now.getMonth() + 1; // 1-based
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    startStr = startStr || start;
    endStr = endStr || end;
  }

  const [costingRes, rentalRes, slaRes] = await Promise.all([
    supabaseAdmin.from('costing_entries')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: false }),
    supabaseAdmin.from('rental_incomes')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: false }),
    supabaseAdmin.from('sla_incomes')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: false }),
  ]);

  const anyError = costingRes.error || rentalRes.error || slaRes.error;
  if (anyError) {
    res.status(400).json({
      error: anyError.message || 'Failed to fetch monthly report data',
      details: {
        costing: costingRes.error?.message || null,
        rental: rentalRes.error?.message || null,
        sla: slaRes.error?.message || null,
      },
    });
    return;
  }

  res.status(200).json({
    ok: true,
    range: { start: startStr, end: endStr },
    costing: costingRes.data || [],
    rental: rentalRes.data || [],
    sla: slaRes.data || [],
  });
}
