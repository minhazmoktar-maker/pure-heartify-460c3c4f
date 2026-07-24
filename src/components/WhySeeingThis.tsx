import { useState } from "react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * "Why am I seeing this?" transparency dialog.
 *
 * Heartify's recommender explains itself in plain language. This component is
 * intentionally static — the concrete per-video signals are surfaced by the
 * recommender in the future, but the trust promise (no engagement bait, no
 * inappropriate content, human-approved channels) never changes.
 */
export default function WhySeeingThis({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            className="inline-flex items-center gap-1 rounded-pill border border-border px-3 py-1 text-micro font-medium hover:bg-accent"
            aria-label="Why am I seeing this?"
          >
            <Info className="h-3.5 w-3.5" /> Why this?
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Why you're seeing this</DialogTitle>
          <DialogDescription>
            Heartify's recommendations are transparent by design.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-3 text-sm text-foreground">
          <li>
            <strong>Human-approved channel.</strong> Every channel is reviewed by our
            moderation team against strict halal standards before its videos appear.
          </li>
          <li>
            <strong>Matches your interests.</strong> Topics, reciters, and languages
            you've followed or watched shape what we surface — not raw watch time.
          </li>
          <li>
            <strong>Diverse & fresh.</strong> We cap how often any one channel or
            topic repeats, so your feed stays balanced across scholars and subjects.
          </li>
          <li>
            <strong>Zero engagement bait.</strong> We never boost content just because
            it's viral. No music, no inappropriate imagery — ever.
          </li>
        </ul>
        <p className="pt-2 text-micro text-muted-foreground">
          Tap <em>Not interested</em> on any video to teach the feed what you don't want.
        </p>
      </DialogContent>
    </Dialog>
  );
}
