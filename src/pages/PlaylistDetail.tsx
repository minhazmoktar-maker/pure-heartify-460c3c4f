import { useParams, Link } from "react-router-dom";
import { Loader2, Lock, Globe2, Link as LinkIcon, Play, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SEO from "@/components/SEO";
import { usePlaylist, usePlaylists } from "@/hooks/usePlaylists";
import { useAuth } from "@/contexts/AuthContext";

const VIS_ICON = { private: Lock, unlisted: LinkIcon, public: Globe2 } as const;

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isLoading } = usePlaylist(id);
  const { removeItem } = usePlaylists();

  if (isLoading) {
    return <Loader2 className="mx-auto mt-16 h-6 w-6 animate-spin text-muted-foreground" />;
  }
  if (!data?.playlist) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-heading font-semibold text-foreground">Playlist not found</p>
        <p className="text-sm text-muted-foreground">It may have been deleted or is private.</p>
      </div>
    );
  }
  const { playlist, items } = data;
  const isOwner = user?.id === playlist.owner_id;
  const Icon = VIS_ICON[playlist.visibility];

  return (
    <>
      <SEO path="/playlists"
        title={`${playlist.title} — Playlist — Heartify`}
        description={playlist.description ?? `A halal video playlist on Heartify.`}
      />
      <PageHeader
        title={playlist.title}
        subtitle={playlist.description ?? undefined}
      />
      <div className="container mx-auto max-w-4xl px-4 pb-16">
        <p className="mb-6 text-micro text-muted-foreground">
          <Icon className="mr-1 inline h-3 w-3" />
          {playlist.visibility} · {items.length} videos
        </p>
        {items.length === 0 ? (
          <div className="rounded-card border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            {isOwner ? "Add videos to this playlist from any watch page." : "This playlist is empty."}
          </div>
        ) : (
          <ol className="space-y-2">
            {items.map((it, idx) => (
              <li key={it.id} className="flex items-center gap-3 rounded-card border border-border bg-card p-3">
                <span className="w-6 text-right text-sm font-medium text-muted-foreground">{idx + 1}</span>
                <img
                  src={`https://i.ytimg.com/vi/${it.video_id}/mqdefault.jpg`}
                  alt=""
                  className="h-16 w-28 rounded object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <Link to={`/watch/${it.video_id}`} className="line-clamp-1 text-sm font-medium hover:text-primary">
                    {it.video_id}
                  </Link>
                  <p className="text-micro text-muted-foreground">Added {new Date(it.added_at).toLocaleDateString()}</p>
                </div>
                <Link
                  to={`/watch/${it.video_id}`}
                  className="rounded-pill bg-primary p-2 text-primary-foreground hover:opacity-90"
                  aria-label="Play"
                >
                  <Play className="h-4 w-4" />
                </Link>
                {isOwner && (
                  <button
                    aria-label="Remove"
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                    onClick={() => removeItem.mutate({ playlistId: playlist.id, videoId: it.video_id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
