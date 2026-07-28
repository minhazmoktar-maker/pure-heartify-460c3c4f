/**
 * Coarse, non-identifying device signals used as a cold-start diversity
 * input. Deliberately low-entropy (3 device classes) so it can never act as
 * a fingerprint — it only nudges the shuffle seed apart for users with no
 * personalization history.
 */

export type DeviceClass = "phone" | "tablet" | "desktop";

export function getDeviceClass(): DeviceClass {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  const w = window.innerWidth || 1024;
  if (/ipad|tablet/.test(ua) || (w >= 640 && w < 1024 && /mobi|android/.test(ua))) return "tablet";
  if (/mobi|android|iphone/.test(ua) || w < 640) return "phone";
  return "desktop";
}
