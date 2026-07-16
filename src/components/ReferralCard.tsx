import { Gift, Copy, Check, Share2, Trophy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useReferral } from "@/hooks/useReferral";
import { track } from "@/lib/analytics";

const ReferralCard = () => {
  const { code, shareUrl, redeemedCount, tier, loading, copy } = useReferral();
  const [copied, setCopied] = useState(false);

  if (loading || !code) return null;


  const handleCopy = async () => {
    const ok = await copy();
    if (ok) {
      setCopied(true);
      track("referral_link_copied", { code });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    track("referral_link_shared", { code });
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Heartify — intentional, halal content",
          text: "Join me on Heartify, a calm space for beneficial content.",
          url: shareUrl,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="rounded-card border border-border bg-gradient-to-br from-card to-card/40 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-pill bg-primary/10">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">Invite a friend</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Share Heartify with someone who'd benefit. {redeemedCount > 0 && (
              <span className="text-primary font-medium">{redeemedCount} joined so far.</span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <div className="flex-1 rounded-card border border-border bg-background px-3 py-2 text-sm font-mono text-foreground truncate">
          {shareUrl}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" onClick={handleShare} className="gap-1.5">
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>
      </div>

      {tier && (
        <div className="mt-5 rounded-card border border-border/60 bg-background/60 p-3">
          <div className="flex items-center justify-between text-micro">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Trophy className="h-3.5 w-3.5 text-primary" />
              {tier.current_tier ? tier.current_tier.label : "No tier yet"}
            </span>
            {tier.next_tier ? (
              <span className="text-muted-foreground">
                {tier.next_tier.remaining} to {tier.next_tier.label}
              </span>
            ) : (
              <span className="text-primary font-medium">Top tier reached</span>
            )}
          </div>
          {tier.next_tier && (
            <Progress
              className="mt-2 h-1.5"
              value={Math.min(
                100,
                (redeemedCount / tier.next_tier.threshold) * 100,
              )}
            />
          )}
        </div>
      )}
    </div>

  );
};

export default ReferralCard;
