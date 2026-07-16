import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useReferral } from "@/hooks/useReferral";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { shareContent } from "@/lib/share";
import { growth } from "@/lib/growthEvents";

const SEEN_KEY_PREFIX = "heartify.invite_prompt.seen.";

interface Props {
  trigger: string; // e.g. "streak_milestone_7", "khatm_juz_first"
  headline: string;
  body: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Modal shown at high-intent moments (streak milestones, first juz, badge earned).
 * Deduplicated per trigger via localStorage so we never nag.
 */
export function InvitePrompt({ trigger, headline, body, open: controlled, onOpenChange }: Props) {
  const enabled = useFeatureFlag("viral.invite_hooks", true);
  const { shareUrl, code } = useReferral();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (controlled !== undefined) {
      setOpen(controlled);
      return;
    }
  }, [controlled]);

  const setOpenSafe = (v: boolean) => {
    setOpen(v);
    onOpenChange?.(v);
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    growth.referralInvited(trigger);
    await shareContent({
      kind: "referral_invite",
      refId: code ?? undefined,
      title: "Join me on Heartify",
      text: body,
      url: shareUrl,
    });
    localStorage.setItem(SEEN_KEY_PREFIX + trigger, "1");
    setOpenSafe(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(SEEN_KEY_PREFIX + trigger, "1");
    setOpenSafe(false);
  };

  if (!enabled) return null;

  return (
    <ResponsiveModal open={open} onOpenChange={setOpenSafe}>
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" aria-hidden />
            {headline}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>{body}</ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <ResponsiveModalFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleDismiss}>
            Not now
          </Button>
          <Button onClick={handleShare} disabled={!shareUrl}>
            Share invite
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

/** Utility for imperative-style triggering. */
export function shouldShowInvitePrompt(trigger: string): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(SEEN_KEY_PREFIX + trigger);
}
