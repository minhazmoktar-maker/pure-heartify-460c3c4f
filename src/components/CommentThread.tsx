import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, Reply, MoreVertical, Flag, UserX, Trash2, Pencil } from "lucide-react";
import { useComments, type CommentRow } from "@/hooks/useComments";
import { useAuth } from "@/contexts/AuthContext";
import { useUserBlocks } from "@/hooks/useUserBlocks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";

interface Props {
  videoId: string;
}

function Composer({ videoId, parentId, onDone, autoFocus }: { videoId: string; parentId?: string; onDone?: () => void; autoFocus?: boolean }) {
  const { user } = useAuth();
  const { post } = useComments(videoId);
  const [text, setText] = useState("");

  if (!user) {
    return (
      <div className="rounded-card border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary underline-offset-2 hover:underline">
          Sign in
        </Link>{" "}
        to join the conversation.
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="h-9 w-9 shrink-0 rounded-pill bg-primary/20" />
      <div className="flex-1 space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={parentId ? "Write a reply…" : "Share a thought — please keep it respectful"}
          rows={parentId ? 2 : 3}
          maxLength={2000}
          autoFocus={autoFocus}
        />
        <div className="flex items-center justify-between">
          <p className="text-micro text-muted-foreground">{text.length}/2000</p>
          <div className="flex gap-2">
            {onDone && (
              <Button size="sm" variant="ghost" onClick={onDone}>
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              disabled={post.isPending || text.trim().length === 0}
              onClick={async () => {
                await post.mutateAsync({ body: text, parentId: parentId ?? null });
                setText("");
                onDone?.();
              }}
            >
              {parentId ? "Reply" : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ videoId, c, children }: { videoId: string; c: CommentRow; children?: React.ReactNode }) {
  const { user } = useAuth();
  const { toggleLike, edit, remove } = useComments(videoId);
  const { block } = useUserBlocks();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.body);
  const isOwn = user?.id === c.user_id;

  return (
    <div className="flex gap-3">
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-pill bg-muted">
        {c.author_avatar && <img src={c.author_avatar} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-foreground">{c.author_name}</span>
          <span className="text-micro text-muted-foreground">
            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
            {c.edited_at && " · edited"}
          </span>
        </div>
        {editing ? (
          <div className="mt-1 space-y-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} maxLength={2000} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(c.body); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  await edit.mutateAsync({ id: c.id, body: draft });
                  setEditing(false);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">{c.body}</p>
        )}
        <div className="mt-2 flex items-center gap-4 text-micro text-muted-foreground">
          <button
            className="flex items-center gap-1 transition hover:text-foreground"
            onClick={() => toggleLike.mutate({ id: c.id, liked: !!c.liked_by_me })}
            aria-label={c.liked_by_me ? "Unlike comment" : "Like comment"}
          >
            <Heart className={`h-4 w-4 ${c.liked_by_me ? "fill-red-500 text-red-500" : ""}`} />
            {c.likes_count > 0 && <span>{c.likes_count}</span>}
          </button>
          {!c.parent_id && (
            <button className="flex items-center gap-1 transition hover:text-foreground" onClick={() => setReplying((r) => !r)}>
              <Reply className="h-4 w-4" /> Reply
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label="More" className="rounded p-1 hover:bg-accent">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwn && (
                <>
                  <DropdownMenuItem onClick={() => setEditing(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => remove.mutate(c.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
              {!isOwn && user && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to={`/appeals/new?kind=comment&ref=${c.id}`}>
                      <Flag className="mr-2 h-4 w-4" /> Report
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => block.mutate(c.user_id)}>
                    <UserX className="mr-2 h-4 w-4" /> Block user
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {replying && (
          <div className="mt-3">
            <Composer videoId={videoId} parentId={c.id} onDone={() => setReplying(false)} autoFocus />
          </div>
        )}
        {children && <div className="mt-3 space-y-4 border-l-2 border-border pl-4">{children}</div>}
      </div>
    </div>
  );
}

export default function CommentThread({ videoId }: Props) {
  const { data, isLoading } = useComments(videoId);
  const comments = data ?? [];
  const roots = comments.filter((c) => !c.parent_id);
  const repliesByParent = new Map<string, CommentRow[]>();
  comments.filter((c) => c.parent_id).forEach((c) => {
    const arr = repliesByParent.get(c.parent_id!) ?? [];
    arr.push(c);
    repliesByParent.set(c.parent_id!, arr);
  });

  return (
    <section className="mt-6 space-y-6" aria-label="Comments">
      <header className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-foreground">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </h2>
      </header>
      <Composer videoId={videoId} />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : roots.length === 0 ? (
        <p className="text-sm text-muted-foreground">Be the first to share a reflection.</p>
      ) : (
        <div className="space-y-6">
          {roots.map((c) => (
            <CommentItem key={c.id} videoId={videoId} c={c}>
              {(repliesByParent.get(c.id) ?? []).map((r) => (
                <CommentItem key={r.id} videoId={videoId} c={r} />
              ))}
            </CommentItem>
          ))}
        </div>
      )}
    </section>
  );
}
