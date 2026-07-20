import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, Lock, Globe2, Link as LinkIcon, Trash2, ListMusic } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SEO from "@/components/SEO";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useAuth } from "@/contexts/AuthContext";

const VIS_ICON = { private: Lock, unlisted: LinkIcon, public: Globe2 } as const;

export default function Playlists() {
  const { user } = useAuth();
  const { playlists, isLoading, create, remove } = usePlaylists();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "unlisted" | "public">("private");

  if (!user) {
    return (
      <>
        <SEO path="/playlists" title="Playlists — Heartify" description="Save halal videos into your own playlists." />
        <PageHeader title="Playlists" subtitle="Sign in to build your own collections." />
        <div className="container mx-auto max-w-2xl px-4 py-8 text-center">
          <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO path="/playlists" title="Your Playlists — Heartify" description="Your saved halal video playlists." />
      <PageHeader title="Playlists" subtitle="Build collections of videos to revisit and share." />
      <div className="container mx-auto max-w-4xl px-4 pb-16">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}
          </p>
          <ResponsiveModal open={open} onOpenChange={setOpen}>
            <ResponsiveModalTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> New playlist
              </Button>
            </ResponsiveModalTrigger>
            <ResponsiveModalContent>
              <ResponsiveModalHeader>
                <ResponsiveModalTitle>Create a playlist</ResponsiveModalTitle>
              </ResponsiveModalHeader>
              <div className="space-y-3">
                <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
                <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} />
                <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private — only you</SelectItem>
                    <SelectItem value="unlisted">Unlisted — anyone with the link</SelectItem>
                    <SelectItem value="public">Public — listed on your profile</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  disabled={create.isPending || title.trim().length === 0}
                  onClick={async () => {
                    await create.mutateAsync({ title, description, visibility });
                    setTitle(""); setDescription(""); setVisibility("private"); setOpen(false);
                  }}
                >
                  Create
                </Button>
              </div>
            </ResponsiveModalContent>
          </ResponsiveModal>
        </div>

        {isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : playlists.length === 0 ? (
          <EmptyState
            illustration="empty-list"
            icon={ListMusic}
            title="No playlists yet"
            description="Save halal videos into collections you can revisit and share."
            actionLabel="Create your first playlist"
            onAction={() => setOpen(true)}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {playlists.map((p) => {
              const Icon = VIS_ICON[p.visibility];
              return (
                <li key={p.id} className="group rounded-card border border-border bg-card p-4 transition hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <Link to={`/p/${p.id}`} className="flex-1">
                      <h3 className="font-semibold text-foreground group-hover:text-primary">{p.title}</h3>
                      <p className="mt-0.5 text-micro text-muted-foreground">
                        <Icon className="mr-1 inline h-3 w-3" />
                        {p.visibility} · {p.items_count} video{p.items_count === 1 ? "" : "s"}
                      </p>
                    </Link>
                    <button
                      aria-label="Delete playlist"
                      className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-destructive group-hover:opacity-100"
                      onClick={() => {
                        if (confirm(`Delete "${p.title}"?`)) remove.mutate(p.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {p.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
