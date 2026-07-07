import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Batch verifier: takes { channels: [{ youtube_channel_id, handle?, title?, category?, source? }, ...] }
// and delegates to verify-channel for each, aggregating results.
// Admin-only.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const channels = Array.isArray(body?.channels) ? body.channels : [];
    if (channels.length === 0 || channels.length > 50) {
      return new Response(JSON.stringify({ error: 'provide 1..50 channels' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];
    let approved = 0, rejected = 0, pending = 0, failed = 0;

    for (const ch of channels) {
      try {
        const invokeRes = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-channel`,
          {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
            },
            body: JSON.stringify(ch),
          }
        );
        const json = await invokeRes.json();
        if (!invokeRes.ok) {
          failed++;
          results.push({ youtube_channel_id: ch.youtube_channel_id, error: json?.error ?? invokeRes.statusText });
          continue;
        }
        if (json.status === 'approved') approved++;
        else if (json.status === 'rejected') rejected++;
        else pending++;
        results.push({
          youtube_channel_id: ch.youtube_channel_id,
          status: json.status,
          confidence: json.confidence,
          duplicate_risk: json.evidence?.duplicate_match ? 'high' : 'low',
        });
      } catch (e: any) {
        failed++;
        results.push({ youtube_channel_id: ch.youtube_channel_id, error: String(e?.message ?? e) });
      }
    }

    return new Response(JSON.stringify({
      processed: results.length, approved, rejected, pending, failed, results,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('batch-verify-channels error', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
