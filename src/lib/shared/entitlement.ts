// Pure plan → capability mapping. Consumed by useEntitlement on the web and
// mirrored by native clients (Swift/Kotlin) so premium behavior stays identical.
import type { EntitlementSummary } from "./types";

export type Capability =
  | "premium_content"
  | "offline_downloads"
  | "hd_streaming"
  | "background_audio"
  | "advanced_recitations"
  | "widgets"
  | "complications"
  | "smart_stack";

export const PLAN_CAPABILITIES: Record<string, Capability[]> = {
  free: ["widgets", "complications", "smart_stack"],
  premium: [
    "premium_content",
    "offline_downloads",
    "hd_streaming",
    "background_audio",
    "advanced_recitations",
    "widgets",
    "complications",
    "smart_stack",
  ],
  family: [
    "premium_content",
    "offline_downloads",
    "hd_streaming",
    "background_audio",
    "advanced_recitations",
    "widgets",
    "complications",
    "smart_stack",
  ],
};

export function isActive(ent: EntitlementSummary | null | undefined): boolean {
  if (!ent) return false;
  if (ent.plan === "free") return false;
  if (!ent.expires_at) return true;
  return new Date(ent.expires_at).getTime() > Date.now();
}

export function capabilities(ent: EntitlementSummary | null | undefined): Capability[] {
  const plan = isActive(ent) ? ent!.plan : "free";
  return PLAN_CAPABILITIES[plan] ?? PLAN_CAPABILITIES.free;
}

export function hasCapability(ent: EntitlementSummary | null | undefined, cap: Capability): boolean {
  return capabilities(ent).includes(cap);
}
