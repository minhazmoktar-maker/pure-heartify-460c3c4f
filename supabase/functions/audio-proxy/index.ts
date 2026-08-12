import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * audio-proxy — CORS-safe streaming passthrough for public recitation CDNs.
 *
 * Many Qur'an audio CDNs (mp3quran.net, everyayah, archive.org …) serve audio
 * without `Access-Control-Allow-Origin`, so the browser can play them in an
 * <audio> tag but cannot `fetch()` the bytes for offline download. This
 * function re-streams the file with CORS headers so downloads work.
 *
 * Only an explicit host allowlist is proxied (no open relay), only GET/HEAD,
 * and Range requests are forwarded so seeking/resume keeps working.
 */

const ALLOWED_HOSTS = [
  'mp3quran.net',
  'server6.mp3quran.net',
  'download.quranicaudio.com',
  'audio.qurancdn.com',
  'verses.quran.com',
  'everyayah.com',
  'www.everyayah.com',
  'archive.org',
  'ia800000.us.archive.org',
  'cdn.islamic.network',
  'podcasts.muslimcentral.com',
  'server.muslimcentral.com',
];

function hostAllowed(host: string): boolean {
  const h = host.toLowerCase();
  return ALLOWED_HOSTS.some((a) => h === a || h.endsWith(`.${a}`));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const raw = new URL(req.url).searchParams.get('url');
  if (!raw) {
    return new Response(JSON.stringify({ error: 'url_required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_url' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (target.protocol !== 'https:' || !hostAllowed(target.hostname)) {
    return new Response(JSON.stringify({ error: 'host_not_allowed' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const forward = new Headers();
  const range = req.headers.get('range');
  if (range) forward.set('range', range);
  forward.set('user-agent', 'Heartify-AudioProxy/1.0');

  try {
    const upstream = await fetch(target.toString(), {
      method: req.method,
      headers: forward,
      redirect: 'follow',
    });

    const out = new Headers(corsHeaders);
    for (const key of ['content-type', 'content-length', 'accept-ranges', 'content-range', 'etag', 'last-modified']) {
      const v = upstream.headers.get(key);
      if (v) out.set(key, v);
    }
    if (!out.has('content-type')) out.set('content-type', 'audio/mpeg');
    out.set('cache-control', 'public, max-age=604800');

    return new Response(req.method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      headers: out,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'upstream_failed', detail: String(e) }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
