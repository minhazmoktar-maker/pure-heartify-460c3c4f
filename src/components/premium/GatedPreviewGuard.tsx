import { useEffect, useState } from "react";
import UpgradeSheet from "@/components/premium/UpgradeSheet";

/**
 * Global listener for `heartify:preview-cap-reached` events dispatched by the
 * player when a non-premium listener finishes a 30s sample of a gated track.
 * Renders the shared UpgradeSheet so any surface that uses PlayerContext.play()
 * gets a consistent upgrade prompt without wiring modal state per component.
 */
export default function GatedPreviewGuard() {
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<string | undefined>();

  useEffect(() => {
    const onCap = (e: Event) => {
      const detail = (e as CustomEvent<{ title?: string }>).detail;
      setFeature(detail?.title ? `"${detail.title}"` : "This reciter");
      setOpen(true);
    };
    window.addEventListener("heartify:preview-cap-reached", onCap);
    return () => window.removeEventListener("heartify:preview-cap-reached", onCap);
  }, []);

  return <UpgradeSheet open={open} onOpenChange={setOpen} feature={feature} />;
}
