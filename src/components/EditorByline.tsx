import { PenSquare } from "lucide-react";

interface Props {
  editor?: string;      // display name of the curator
  role?: string;        // e.g. "Editor", "Head of Moderation"
  updatedAt?: string;   // ISO date
  reason?: string;      // short editorial rationale (one sentence)
}

/**
 * Wave 2 — editorial byline surface. Signals human curation on Editor Picks
 * and topic landings. Kept intentionally light: one line, one icon, no chrome.
 */
export default function EditorByline({
  editor = "Heartify Editors",
  role = "Editorial Team",
  updatedAt,
  reason,
}: Props) {
  const stamp = updatedAt
    ? new Date(updatedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;
  return (
    <div className="flex flex-col gap-1 rounded-card border border-border/60 bg-card/60 px-3 py-2 text-micro text-muted-foreground">
      <div className="flex items-center gap-2">
        <PenSquare className="h-3.5 w-3.5 text-primary" aria-hidden />
        <span className="font-medium text-foreground">{editor}</span>
        <span className="text-muted-foreground">· {role}</span>
        {stamp && <span className="ml-auto">{stamp}</span>}
      </div>
      {reason && <p className="text-muted-foreground">{reason}</p>}
    </div>
  );
}
