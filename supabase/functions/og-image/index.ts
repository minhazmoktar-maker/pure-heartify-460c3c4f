// Branded Open Graph card renderer. Returns an SVG image (1200×630) that
// social platforms and the /share flows can point at with ?title=&kicker=.
// SVG is used instead of PNG because it renders instantly with zero deps,
// and Twitter/Facebook/WhatsApp accept image/svg+xml for OG previews via
// content-type sniffing when served with a proper mime. For platforms that
// reject SVG, wrap with an image proxy at the edge.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const clamp = (s: string, max: number) =>
  s.length <= max ? s : s.slice(0, max - 1) + "…";

const esc = (s: string) =>
  s.replace(/[<>&"']/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === '"' ? "&quot;" : "&apos;",
  );

function wrap(text: string, perLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > perLine) {
      lines.push(cur.trim());
      cur = w;
      if (lines.length === maxLines - 1) break;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur && lines.length < maxLines) lines.push(clamp(cur, perLine));
  return lines;
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const title = esc(clamp(url.searchParams.get("title") ?? "Heartify", 120));
  const kicker = esc(clamp(url.searchParams.get("kicker") ?? "Curated Halal Video & Audio", 60));
  const brand = esc(url.searchParams.get("brand") ?? "Heartify ✦");

  const titleLines = wrap(title, 24, 3);
  const titleSvg = titleLines
    .map((l, i) => `<tspan x="80" dy="${i === 0 ? 0 : 90}">${l}</tspan>`)
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="60%" stop-color="#0f2a24"/>
      <stop offset="100%" stop-color="#134e3a"/>
    </linearGradient>
    <radialGradient id="glow" cx="85%" cy="15%" r="60%">
      <stop offset="0%" stop-color="#22d3a5" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#22d3a5" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto" fill="#ecfdf5">
    <text x="80" y="120" font-size="28" letter-spacing="6" fill="#5eead4" font-weight="600">${kicker.toUpperCase()}</text>
    <text x="80" y="260" font-size="80" font-weight="800">${titleSvg}</text>
    <text x="80" y="560" font-size="32" fill="#a7f3d0" font-weight="700">${brand}</text>
    <text x="80" y="595" font-size="22" fill="#94a3b8">pure-heartify.lovable.app</text>
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      ...corsHeaders,
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
});
