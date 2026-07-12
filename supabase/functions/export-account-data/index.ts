// GDPR Art. 15/20 & CCPA §1798.110 — Right to access / data portability.
//
// Bundles every row public.export_user_data(uid) returns for the caller into a
// single JSON file, uploads it to the private `user-data-exports` bucket, and
// returns a 24-hour signed URL. Rate-limited to 1 export/day per user.
//
// The JSON structure is: { generated_at, user: {id,email,created_at,...}, data: { table: [rows] } }.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { enforceRateLimit } from '../_shared/rateLimit.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST' && req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: 'Server misconfigured' }, 500);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return json({ error: 'Missing bearer token' }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401);
  const user = userData.user;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Rate-limit: 1 export per 24h. Prevents budget-drain (schema scans are heavy).
  const limited = await enforceRateLimit(admin, {
    identity: user.id, action: 'export_account_data', limit: 1, windowSeconds: 86400,
  });
  if (limited) {
    return json({ error: 'You can only export your data once per 24 hours.' }, 429);
  }

  // Collect all user-scoped rows via the SECURITY DEFINER RPC.
  const { data: dataRows, error: exportErr } = await admin.rpc('export_user_data', { _uid: user.id });
  if (exportErr) return json({ error: 'Export failed', details: exportErr.message }, 500);

  const bundle = {
    generated_at: new Date().toISOString(),
    format_version: 1,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
    },
    data: dataRows ?? {},
    _readme: 'This file contains every record we hold that references your account. Contact privacy@heartify.app with questions.',
  };

  const filename = `${user.id}/heartify-data-export-${Date.now()}.json`;
  const body = new TextEncoder().encode(JSON.stringify(bundle, null, 2));

  const { error: uploadErr } = await admin.storage.from('user-data-exports').upload(filename, body, {
    contentType: 'application/json',
    upsert: true,
  });
  if (uploadErr) return json({ error: 'Upload failed', details: uploadErr.message }, 500);

  const { data: signed, error: signErr } = await admin.storage
    .from('user-data-exports')
    .createSignedUrl(filename, 60 * 60 * 24); // 24h
  if (signErr || !signed) return json({ error: 'Sign failed', details: signErr?.message }, 500);

  return json({
    ok: true,
    download_url: signed.signedUrl,
    expires_in_seconds: 86400,
    bytes: body.byteLength,
    tables_included: Object.keys(bundle.data),
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
