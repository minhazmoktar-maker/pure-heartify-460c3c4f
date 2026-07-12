// Deletes the authenticated user's account.
//
// Store-compliance: Apple App Store guideline 5.1.1(v) requires in-app
// account deletion whenever an app supports account creation. This function
// verifies the caller's JWT, then calls public.scrub_user_data(uid) which
// introspects information_schema and scrubs EVERY user-scoped table
// automatically as the schema evolves — no hand-maintained allow-list.
//
// GDPR Art. 17 (Right to erasure) and CCPA §1798.105 (Right to delete)
// are both satisfied by this endpoint.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { enforceRateLimit } from '../_shared/rateLimit.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST' && req.method !== 'DELETE') return json({ error: 'Method not allowed' }, 405);

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
  const userId = userData.user.id;

  let body: { confirm?: string } = {};
  try { body = await req.json(); } catch { /* empty body */ }
  if (body.confirm !== 'DELETE') {
    return json({ error: 'Confirmation required. Send { "confirm": "DELETE" }.' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const limited = await enforceRateLimit(admin, {
    identity: userId, action: 'delete_account', limit: 3, windowSeconds: 3600,
  });
  if (limited) return json({ error: 'rate_limited' }, 429);

  // Platform owners must transfer ownership first.
  const { data: ownerRow } = await admin
    .from('platform_owners').select('user_id').eq('user_id', userId).maybeSingle();
  if (ownerRow) {
    return json({ error: 'Platform owners cannot self-delete. Transfer ownership first.' }, 403);
  }

  // 1. Scrub every user-scoped table via the introspection-driven RPC.
  //    This automatically covers new tables added later — no hand-maintained list.
  const { data: scrubReport, error: scrubErr } = await admin.rpc('scrub_user_data', { _uid: userId });
  if (scrubErr) {
    return json({ error: 'Scrub failed', details: scrubErr.message }, 500);
  }

  // 2. Roles + profile (may already be handled above, safe to re-run).
  await admin.from('user_roles').delete().eq('user_id', userId);
  await admin.from('profiles').delete().eq('user_id', userId);

  // 3. Delete storage objects the user owns (avatars, exports, etc.).
  try {
    for (const bucket of ['avatars', 'user-data-exports']) {
      const { data: files } = await admin.storage.from(bucket).list(userId);
      if (files?.length) {
        await admin.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
      }
    }
  } catch { /* best-effort */ }

  // 4. Finally, delete the auth user. Invalidates all sessions.
  const { error: authDelErr } = await admin.auth.admin.deleteUser(userId);
  if (authDelErr) {
    return json({ error: 'Failed to delete auth user', details: authDelErr.message, scrub: scrubReport }, 500);
  }

  return json({ ok: true, scrubbed: scrubReport });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
