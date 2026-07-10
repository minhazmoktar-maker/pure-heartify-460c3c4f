import { supabase } from "@/integrations/supabase/client";
import { track } from "./analytics";
import { toast } from "sonner";

export type ShareKind =
  | "streak_milestone"
  | "khatm_juz"
  | "khatm_complete"
  | "weekly_recap"
  | "badge_earned"
  | "referral_invite";

interface ShareOptions {
  kind: ShareKind;
  refId?: string;
  title: string;
  text: string;
  url?: string;
}

/**
 * Unified share helper. Uses Web Share API when available, falls back to clipboard.
 * Logs a `share_events` row (fire-and-forget) and emits an analytics event.
 * Never throws — swallows errors so UI never breaks.
 */
export async function shareContent(opts: ShareOptions): Promise<"native" | "clipboard" | "cancelled"> {
  const url = opts.url ?? (typeof window !== "undefined" ? window.location.origin : "");
  let channel: "native" | "clipboard" | "cancelled" = "cancelled";

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: opts.title, text: opts.text, url });
      channel = "native";
    } catch {
      channel = "cancelled";
    }
  }

  if (channel === "cancelled") {
    try {
      await navigator.clipboard.writeText(`${opts.text} ${url}`.trim());
      toast.success("Copied to clipboard");
      channel = "clipboard";
    } catch {
      toast.error("Unable to share");
      return "cancelled";
    }
  }

  // Fire-and-forget logging
  void track("share.completed", { kind: opts.kind, ref_id: opts.refId ?? null, channel });
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("share_events").insert({
        user_id: user.id,
        kind: opts.kind,
        ref_id: opts.refId ?? null,
        channel,
      });
    }
  } catch {
    /* noop */
  }
  return channel;
}
