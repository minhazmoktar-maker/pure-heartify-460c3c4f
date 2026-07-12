import { useState } from "react";
import { Plus, Loader2, Lock, Link as LinkIcon, Globe2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlaylists, type Playlist } from "@/hooks/usePlaylists";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Props {
  videoId: string;
  variant?: "icon" | "button";
}

export default function AddToPlaylistDialog({ videoId, variant = "button" }: Props) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { playlists, isLoading, create, addItem } = usePlaylists();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  if (!user) {
    return (
      <Button size="sm" variant="outline" onClick={() => nav("/login")}>
        <Plus className="mr-1.5 h-4 w-4" /> Save
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <button aria-label="Add to playlist" className="rounded-full border border-border p-2 hover:bg-accent">
            <Plus className="h-4 w-4" />
          </button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus className="mr-1.5 h-4 w-4" /> Save
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save to playlist</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <div className="space-y-2">
            {playlists.length === 0 && !creating && (
              <p className="text-sm text-muted-foreground">You don't have any playlists yet.</p>
            )}
            <ul className="max-h-64 space-y-1 overflow-auto">
              {playlists.map((p: Playlist) => (
                <li key={p.id}>
                  <button
                    className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm transition hover:bg-accent"
                    onClick={async () => {
                      await addItem.mutateAsync({ playlistId: p.id, videoId });
                      setOpen(false);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {p.visibility === "private" && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      {p.visibility === "unlisted" && <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                      {p.visibility === "public" && <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />}
                      {p.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.items_count}</span>
                  </button>
                </li>
              ))}
            </ul>
            {creating ? (
              <div className="flex gap-2">
                <Input placeholder="New playlist name" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
                <Button
                  size="sm"
                  disabled={create.isPending || title.trim().length === 0}
                  onClick={async () => {
                    const p = await create.mutateAsync({ title });
                    await addItem.mutateAsync({ playlistId: p.id, videoId });
                    setTitle("");
                    setCreating(false);
                    setOpen(false);
                  }}
                >
                  Create
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" className="w-full" onClick={() => setCreating(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> New playlist
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
