import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Gift, HeartHandshake, MessageCircle, Sparkles } from "lucide-react";
import ReferralCard from "@/components/ReferralCard";
import ShareImageButton from "@/components/ShareImageButton";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import { useReferral } from "@/hooks/useReferral";
import SEO from "@/components/SEO";
import { track } from "@/lib/analytics";

/**
 * Dedicated invite / growth surface. Combines the referral card, a shareable
 * card generator, and a WhatsApp deep-link. Kept intentionally short so the
 * primary action is always visible above the fold on mobile.
 */
export default function Invite() {
  const { shareUrl, redeemedCount } = useReferral();

  useEffect(() => {
    void track("invite_page_viewed");
  }, []);

  const inviteText =
    "Join me on Heartify — a calm, halal space for beneficial content. Reclaim your attention. 🤍";

  return (
    <>
      <SEO
        title="Invite a friend — Heartify"
        description="Share Heartify with someone who'd benefit. A calm, halal space for beneficial content."
        path="/invite"
      />

      <main className="mx-auto max-w-2xl px-4 pt-4 pb-24">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground tap-target"
          aria-label="Back to profile"
        >
          <ChevronLeft className="h-4 w-4" />
          Profile
        </Link>

        <header className="mt-4">
          <div className="inline-flex items-center gap-1.5 rounded-pill bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Growth of good
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">Invite a friend</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            The best of you are those who benefit others.
            {redeemedCount > 0 && (
              <>
                {" "}
                <span className="text-primary font-medium">
                  {redeemedCount} {redeemedCount === 1 ? "friend has" : "friends have"} joined through you.
                </span>
              </>
            )}
          </p>
        </header>

        <div className="mt-5">
          <ReferralCard />
        </div>

        <section className="mt-4 rounded-card border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-primary/10">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-foreground">Send a personal invite</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                One message on WhatsApp or a shareable card is often more effective than a link.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <WhatsAppShareButton
              message={inviteText}
              url={shareUrl ?? (typeof window !== "undefined" ? window.location.origin : "")}
            />
            <ShareImageButton
              variant="solid"
              label="Shareable card"
              input={{
                variant: "quote",
                kicker: "Reclaim your attention",
                translation:
                  "A calm, halal space for beneficial content. Made for the Ummah.",
                attribution: "— Heartify",
              }}
              meta={{
                title: "Heartify",
                text: inviteText,
                url: shareUrl ?? undefined,
              }}
            />
          </div>
        </section>

        <section className="mt-4 rounded-card border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-primary/10">
              <HeartHandshake className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground">Tips for a good invite</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li>• Send it to one person at a time — not a broadcast.</li>
                <li>• Mention a specific feature they'd love (Qur'an, scholars, daily du'a).</li>
                <li>• Follow up in a few days — most people forget the first tap.</li>
              </ul>
            </div>
          </div>
        </section>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Gift className="h-3.5 w-3.5" aria-hidden />
          Every accepted invite unlocks tier progress and rewards.
        </p>
      </main>
    </>
  );
}
