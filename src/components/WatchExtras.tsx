import { useState } from "react";
import { Clock, Check, Share2 } from "lucide-react";
import { usePlaylists } from "@/hooks/usePlaylists";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  videoId: string;
  getCurrentTime?: () => number | null;
}

const WATCH_LATER_TITLE = "Watch later";

export function WatchLaterButton({ videoId }: Props) {
  const { user } = useAuth();
  const { playlists, addItem, create } = usePlaylists();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const onClick = async () => {
    if (!user) {
      toast.info("Sign in to save videos.");
      return;
    }
    setBusy(true);
    try {
      let target = playlists.find((p) => p.title === WATCH_LATER_TITLE);
      if (!target) {
        target = await create.mutateAsync({
          title: WATCH_LATER_TITLE,
          description: "Videos I want to come back to.",
          visibility: "private",
        });
      }
      await addItem.mutateAsync({ playlistId: target.id, videoId });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
    >
      {saved ? <Check className="h-3.5 w-3.5 text-primary" /> : <Clock className="h-3.5 w-3.5" />}
      {saved ? "Saved" : "Watch later"}
    </button>
  );
}

export function ShareAtTimeButton({ videoId, getCurrentTime }: Props) {
  const onClick = async () => {
    let seconds = 0;
    if (getCurrentTime) {
      const t = getCurrentTime();
      seconds = t !== null && t > 0 ? Math.floor(t) : 0;
    }
    if (!seconds) {
      const raw = window.prompt("Share at time (seconds, e.g. 42):", "0");
      if (raw === null) return;
      seconds = Math.max(0, Math.floor(Number(raw)) || 0);
    }
    const url = `${window.location.origin}/watch/${videoId}${seconds ? `?t=${seconds}` : ""}`;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: "Heartify video" });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(seconds ? `Link copied at ${seconds}s` : "Link copied");
      }
    } catch {
      /* user cancelled */
    }
  };
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent"
    >
      <Share2 className="h-3.5 w-3.5" />
      Share at time
    </button>
  );
}
