import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Lightbulb, Loader2, Youtube, Radio } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * User-facing "Suggest content" flow.
 *
 * Writes into the same `video_candidates` / `channel_candidates` tables the
 * ingestion pipeline uses, tagged `source='user_suggestion'`. From there
 * admins triage in the moderation console — nothing appears on the platform
 * until it clears review.
 */

const VIDEO_ID_RE = /(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/;
const CHANNEL_ID_RE = /(?:channel\/)(UC[A-Za-z0-9_-]{22})/;
const HANDLE_RE = /(?:@)([A-Za-z0-9_.-]{3,40})/;

function extractVideoId(url: string): string | null {
  const m = url.match(VIDEO_ID_RE);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}
function extractChannelHint(url: string): { id: string | null; handle: string | null } {
  const idMatch = url.match(CHANNEL_ID_RE);
  const handleMatch = url.match(HANDLE_RE);
  return { id: idMatch?.[1] ?? null, handle: handleMatch?.[1] ?? null };
}

interface Props {
  trigger?: React.ReactNode;
}

export default function SuggestContentDialog({ trigger }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"video" | "channel">("video");
  const [submitting, setSubmitting] = useState(false);

  // video form
  const [vUrl, setVUrl] = useState("");
  const [vTitle, setVTitle] = useState("");
  const [vReason, setVReason] = useState("");

  // channel form
  const [cUrl, setCUrl] = useState("");
  const [cTitle, setCTitle] = useState("");
  const [cCategory, setCCategory] = useState("");
  const [cReason, setCReason] = useState("");

  const reset = () => {
    setVUrl(""); setVTitle(""); setVReason("");
    setCUrl(""); setCTitle(""); setCCategory(""); setCReason("");
  };

  const submit = async () => {
    if (!user) { toast.error("Sign in to suggest content"); navigate("/login"); return; }

    setSubmitting(true);
    try {
      if (tab === "video") {
        const vid = extractVideoId(vUrl);
        if (!vid) {
          toast.error("Couldn't read that YouTube link", { description: "Paste a full URL like https://youtu.be/... or the 11-character video id." });
          return;
        }
        if (!vTitle.trim() || vTitle.trim().length < 3) {
          toast.error("Add a short title so moderators know what it is.");
          return;
        }
        const { error } = await supabase.from("video_candidates").insert({
          youtube_video_id: vid,
          title: vTitle.trim(),
          description: vReason.trim() || null,
          submitted_by: user.id,
          status: "pending",
          evidence: { source: "user_suggestion", submitted_url: vUrl.trim() },
        });
        if (error) throw error;
      } else {
        const hint = extractChannelHint(cUrl);
        // We need a canonical id or handle; require at least one.
        if (!hint.id && !hint.handle) {
          toast.error("Couldn't identify that channel", { description: "Paste the channel URL (…/channel/UCxxxx or …/@handle)." });
          return;
        }
        if (!cTitle.trim() || cTitle.trim().length < 2) {
          toast.error("Add the channel's name.");
          return;
        }
        const { error } = await supabase.from("channel_candidates").insert({
          youtube_channel_id: hint.id ?? `handle:${hint.handle}`,
          handle: hint.handle,
          title: cTitle.trim(),
          category: cCategory.trim() || null,
          description: cReason.trim() || null,
          source: "user_suggestion",
          submitted_by: user.id,
          status: "pending",
          evidence: { submitted_url: cUrl.trim() },
        });
        if (error) throw error;
      }
      toast.success("Suggestion submitted", {
        description: "Our moderation team will review it and it'll appear once approved.",
      });
      reset();
      setOpen(false);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "Failed to submit suggestion";
      const msg = raw.toLowerCase().includes("duplicate")
        ? "Someone already suggested this — thanks anyway!"
        : raw;
      toast.error("Couldn't submit", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button className="inline-flex items-center gap-1.5 rounded-pill border border-primary/40 bg-primary/5 px-3 py-1.5 text-micro font-semibold text-primary hover:bg-primary/10">
            <Lightbulb className="h-3.5 w-3.5" /> Suggest content
          </button>
        )}
      </DialogTrigger>
      <DialogContent
        className="max-w-lg"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !submitting) {
            e.preventDefault();
            submit();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" /> Suggest halal content
          </DialogTitle>
          <DialogDescription>
            Recommend a video or channel for the library. Nothing goes live until a moderator has reviewed it.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "video" | "channel")} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="video"><Youtube className="mr-1.5 h-3.5 w-3.5" /> Video</TabsTrigger>
            <TabsTrigger value="channel"><Radio className="mr-1.5 h-3.5 w-3.5" /> Channel</TabsTrigger>
          </TabsList>

          <TabsContent value="video" className="mt-4 space-y-3">
            <div>
              <Label htmlFor="v-url">YouTube link or video id</Label>
              <Input id="v-url" autoFocus placeholder="https://youtu.be/…" value={vUrl} onChange={(e) => setVUrl(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="v-title">Title</Label>
              <Input id="v-title" placeholder="Surah Al-Fatiha by …" value={vTitle} onChange={(e) => setVTitle(e.target.value)} maxLength={200} />
            </div>
            <div>
              <Label htmlFor="v-reason">Why is this worth adding? <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea id="v-reason" rows={3} placeholder="Reciter, why it's halal, any context…" value={vReason} onChange={(e) => setVReason(e.target.value)} maxLength={500} />
            </div>
          </TabsContent>

          <TabsContent value="channel" className="mt-4 space-y-3">
            <div>
              <Label htmlFor="c-url">Channel URL</Label>
              <Input id="c-url" placeholder="https://youtube.com/@channel or …/channel/UC…" value={cUrl} onChange={(e) => setCUrl(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="c-title">Channel name</Label>
              <Input id="c-title" placeholder="e.g. Yaqeen Institute" value={cTitle} onChange={(e) => setCTitle(e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label htmlFor="c-cat">Category <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="c-cat" placeholder="Quran, Lectures, Nasheed…" value={cCategory} onChange={(e) => setCCategory(e.target.value)} maxLength={60} />
            </div>
            <div>
              <Label htmlFor="c-reason">Why this channel? <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea id="c-reason" rows={3} placeholder="Scholarly credentials, sample video, endorsements…" value={cReason} onChange={(e) => setCReason(e.target.value)} maxLength={500} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-2 sm:items-center">
          <p className="mr-auto hidden text-[11px] text-muted-foreground sm:block">
            Tip: press <kbd className="rounded border border-border bg-muted px-1">⌘</kbd>+<kbd className="rounded border border-border bg-muted px-1">Enter</kbd> to submit
          </p>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="mr-1.5 h-3.5 w-3.5" />}
            Submit for review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
