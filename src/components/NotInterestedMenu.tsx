import { useState } from "react";
import { ThumbsDown, MoreVertical, Info } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNegativeFeedback, type NegativeReason } from "@/hooks/useNegativeFeedback";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Props {
  videoId: string;
  compact?: boolean;
}

const REASONS: { key: NegativeReason; label: string }[] = [
  { key: "not_interested", label: "Not interested" },
  { key: "already_watched", label: "Already watched" },
  { key: "dislike", label: "Don't like this" },
  { key: "offensive", label: "Feels inappropriate" },
];

export default function NotInterestedMenu({ videoId, compact }: Props) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { notInterested } = useNegativeFeedback();
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Feedback on this video"
            className={
              compact
                ? "rounded-pill p-1.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-accent hover:text-foreground"
                : "inline-flex items-center gap-1 rounded-pill border border-border px-3 py-1 text-micro font-medium transition-colors hover:bg-accent"
            }
            onClick={(e) => e.stopPropagation()}
          >
            {compact ? <MoreVertical className="h-4 w-4" /> : (<><ThumbsDown className="h-3.5 w-3.5" /> Not interested</>)}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>Show less like this</DropdownMenuLabel>
          {REASONS.map((r) => (
            <DropdownMenuItem
              key={r.key}
              onClick={(e) => {
                e.stopPropagation();
                if (!user) return nav("/login");
                notInterested.mutate({ videoId, reason: r.key });
              }}
            >
              {r.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setWhyOpen(true);
            }}
          >
            <Info className="mr-2 h-4 w-4" /> Why am I seeing this?
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={whyOpen} onOpenChange={setWhyOpen}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Why you're seeing this</DialogTitle>
            <DialogDescription>
              Heartify's recommendations are transparent by design.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-3 text-sm text-foreground">
            <li><strong>Human-approved channel.</strong> Every channel is reviewed against strict halal standards before its videos appear.</li>
            <li><strong>Matches your interests.</strong> Topics, reciters, and languages you follow or watch shape what we surface — not raw watch time.</li>
            <li><strong>Diverse &amp; fresh.</strong> We cap how often any one channel or topic repeats, so your feed stays balanced.</li>
            <li><strong>Zero engagement bait.</strong> No music, no inappropriate imagery — ever.</li>
          </ul>
          <p className="pt-2 text-micro text-muted-foreground">
            Use <em>Not interested</em> to teach the feed what you don't want.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
