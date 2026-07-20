import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { shareGeneratedImage, type ShareImageInput } from "@/lib/shareImage";
import { track } from "@/lib/analytics";

interface Props {
  input: ShareImageInput;
  meta?: { title?: string; text?: string; url?: string };
  label?: string;
  variant?: "solid" | "ghost";
  className?: string;
}

/**
 * One-tap share button. Generates a branded PNG on-device then invokes the
 * native share sheet (Web Share Level 2). Falls back to download on desktop.
 */
export default function ShareImageButton({
  input,
  meta = {},
  label = "Share",
  variant = "ghost",
  className,
}: Props) {
  const [busy, setBusy] = useState(false);
  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      const channel = await shareGeneratedImage(input, {
        text: meta.text,
        title: meta.title,
        url: meta.url ?? (typeof window !== "undefined" ? window.location.href : undefined),
      });
      void track("share.image", { variant: input.variant, channel });
      if (channel === "download") toast.success("Image saved — attach it to any app");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create image");
    } finally {
      setBusy(false);
    }
  }
  const base =
    variant === "solid"
      ? "bg-primary text-primary-foreground hover:opacity-90"
      : "border border-border bg-card text-foreground hover:bg-secondary";
  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      className={cn(
        "tap-target inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-semibold transition disabled:opacity-60",
        base,
        className,
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      {label}
    </button>
  );
}
