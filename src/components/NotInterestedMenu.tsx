import { ThumbsDown, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

  return (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
