// WhatsApp dua-referral bridge. Builds a wa.me deep link with a rich
// preview (backed by the /og-image edge function so WhatsApp fetches a real
// social card). Attribution attaches the current user's referral code when
// available so shared duas convert into signups.

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  message: string;                  // e.g. "Please make du'a for my mother…"
  url: string;                      // canonical dua/share URL (must include /d/<id> or /share)
  className?: string;
  label?: string;
}

/**
 * On mobile → opens WhatsApp share sheet. On desktop → opens WhatsApp Web.
 * Attaches ?ref=<code> when the user has a referral code (fire-and-forget).
 */
export default function WhatsAppShareButton({ message, url, className, label = "Share on WhatsApp" }: Props) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    let final = url;
    try {
      const { data } = await supabase.rpc("get_or_create_referral_code");
      if (data && typeof data === "string") {
        const sep = final.includes("?") ? "&" : "?";
        final = `${final}${sep}ref=${encodeURIComponent(data)}`;
      }
    } catch { /* anonymous is fine */ }
    const body = encodeURIComponent(`${message}\n\n${final}\n\nvia Heartify ✦`);
    const isMobile = typeof navigator !== "undefined" && /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    const wa = isMobile ? `whatsapp://send?text=${body}` : `https://wa.me/?text=${body}`;
    void track("share.whatsapp", { kind: "dua" });
    window.open(wa, "_blank", "noopener");
    setBusy(false);
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      className={cn(
        "tap-target inline-flex items-center gap-2 rounded-pill bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60",
        className,
      )}
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </button>
  );
}
