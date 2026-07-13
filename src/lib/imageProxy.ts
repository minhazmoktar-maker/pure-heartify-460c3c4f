// Client helper for the image-proxy edge function.
// Signing happens server-side; here we only build the callable URL for
// pre-signed values a server route hands us. Anonymous callers should
// request the URL from a trusted endpoint that holds IMAGE_PROXY_SIGNING_KEY.
//
// Usage:
//   <img src={imageProxyUrl(signed)} loading="lazy" decoding="async" />

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;

export interface SignedImage {
  u: string;        // upstream URL (already whitelisted server-side)
  e: number;        // epoch seconds when signature expires
  s: string;        // hex signature
  ttl?: number;     // optional cache override in seconds
}

export function imageProxyUrl(signed: SignedImage): string {
  if (!PROJECT_ID) return signed.u; // graceful fallback in local dev
  const base = `https://${PROJECT_ID}.supabase.co/functions/v1/image-proxy`;
  const params = new URLSearchParams({
    u: signed.u,
    e: String(signed.e),
    s: signed.s,
  });
  if (signed.ttl) params.set("ttl", String(signed.ttl));
  return `${base}?${params.toString()}`;
}
