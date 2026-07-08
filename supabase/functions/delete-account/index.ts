// Deletes the authenticated user's account.
//
// Store-compliance: Apple App Store guideline 5.1.1(v) requires in-app
// account deletion whenever an app supports account creation. This function
// verifies the caller's JWT, scrubs user-owned rows across all tables that
// hold personal data, then removes the auth user via the service-role client.
//
// The function intentionally does NOT touch aggregated analytics rows —
// those are either already anonymised (no PII) or governed by data-retention
// policies. User-scoped PII tables are cleared explicitly below.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Tables that store rows keyed by user_id and must be scrubbed on deletion.
// Keep this list in sync with the schema — every new user-scoped table should
// be added here so account deletion remains complete.
const USER_SCOPED_TABLES = [
  'audio_playback_positions',
  'audio_reports',
  'daily_dose',
  'device_tokens',
  'dose_completions',
  'entitlements',
  'favorite_categories',
  'favorites',
  'recommendation_events',
  'referrals',
  'search_queries',
  'streaks',
  'user_interests',
  'user_locale_preferences',
  'watch_history',
] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json({ error: 'Missing bearer token' }, 401);
  }

  // Validate the caller's JWT via the anon client — verify_jwt is disabled
  // by default in Lovable-managed functions, so we authenticate in-code.
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: 'Unauthorized' }, 401);
  }
  const userId = userData.user.id;

  // Require an explicit confirmation string in the body so this cannot fire
  // from an accidental request or CSRF-ish scenario.
  let body: { confirm?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body → treated as missing confirmation
  }
  if (body.confirm !== 'DELETE') {
    return json({ error: 'Confirmation required. Send { "confirm": "DELETE" }.' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Refuse to delete platform owners — they must be transferred first, or
  // the platform loses its last admin. Matches prevent_last_owner_removal().
  const { data: ownerRow } = await admin
    .from('platform_owners')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (ownerRow) {
    return json(
      { error: 'Platform owners cannot self-delete. Transfer ownership first.' },
      403,
    );
  }

  const errors: string[] = [];

  // 1. Scrub user-scoped tables. We intentionally continue on failure per
  //    table so a single locked row cannot leave the user half-deleted.
  for (const table of USER_SCOPED_TABLES) {
    const { error } = await admin.from(table).delete().eq('user_id', userId);
    if (error) errors.push(`${table}: ${error.message}`);
  }

  // 2. Anonymise moderation/audit records so we keep the trail but drop PII.
  //    audit tables reference the actor via metadata; nulling the FK is
  //    enough for compliance without corrupting historical analytics.
  await admin.from('privileged_actions_log').update({ actor_id: null }).eq('actor_id', userId);
  await admin.from('moderation_overrides').update({ admin_id: null as unknown as string }).eq('admin_id', userId).then(() => {}, () => {});

  // 3. Remove auth-level linkage: roles then profile.
  await admin.from('user_roles').delete().eq('user_id', userId);
  await admin.from('profiles').delete().eq('user_id', userId);

  // 4. Finally, delete the auth user itself. This invalidates all sessions.
  const { error: authDelErr } = await admin.auth.admin.deleteUser(userId);
  if (authDelErr) {
    errors.push(`auth: ${authDelErr.message}`);
    return json({ error: 'Failed to delete account', details: errors }, 500);
  }

  return json({ ok: true, warnings: errors.length ? errors : undefined });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
