import { useState } from "react";
import { AlertTriangle, Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Track } from "@/data/audio";
import { detectPlatform } from "@/hooks/useCrossDevicePlayback";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const REASONS: { value: string; label: string; hint: string }[] = [
  { value: "wont_play", label: "Won't play", hint: "Errors, silence, or infinite buffering." },
  { value: "wrong_audio", label: "Wrong audio", hint: "Different track than the title says." },
  { value: "invalid_metadata", label: "Bad metadata", hint: "Wrong title, artist, duration, or cover." },
  { value: "poor_quality", label: "Poor quality", hint: "Distortion, cuts, or low bitrate." },
  { value: "offensive", label: "Halal concern", hint: "Content shouldn't be in the catalog." },
  { value: "other", label: "Something else", hint: "Describe the issue below." },
];

interface Props {
  track: Track;
  errorCode?: string | null;
  compact?: boolean;
  triggerClassName?: string;
}

const ReportAudioDialog = ({ track, errorCode, compact, triggerClassName }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("wont_play");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) {
      toast.error("Sign in required", { description: "Please sign in to submit a report." });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("audio_reports").insert({
      user_id: user.id,
      track_id: track.id,
      track_title: track.title,
      track_url: track.url,
      reason,
      details: details.trim() || null,
      error_code: errorCode ?? null,
      user_agent: navigator.userAgent,
      platform: detectPlatform(),
    });
    setBusy(false);
    if (error) {
      toast.error("Couldn't send report", { description: error.message });
      return;
    }
    toast.success("Thank you", { description: "The Premium team will review this shortly." });
    setDetails("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          aria-label={`Report a problem with ${track.title}`}
          className={
            triggerClassName ??
            (compact
              ? "text-muted-foreground hover:text-destructive"
              : "inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-destructive hover:text-destructive")
          }
        >
          <Flag className={compact ? "h-3.5 w-3.5" : "h-3 w-3"} />
          {!compact && <span>Report</span>}
        </button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Report an audio problem
          </DialogTitle>
          <DialogDescription>
            "{track.title}" — {track.artist}. Your report helps us keep the Premium catalog clean.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
          {REASONS.map((r) => (
            <label
              key={r.value}
              htmlFor={`reason-${r.value}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm hover:bg-secondary"
            >
              <RadioGroupItem id={`reason-${r.value}`} value={r.value} className="mt-0.5" />
              <div>
                <p className="font-medium text-foreground">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.hint}</p>
              </div>
            </label>
          ))}
        </RadioGroup>

        <div className="space-y-1.5">
          <Label htmlFor="details" className="text-xs">
            Details (optional)
          </Label>
          <Textarea
            id="details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Time-stamp, what you heard, what device you're on…"
            maxLength={500}
            rows={3}
          />
          {errorCode && (
            <p className="text-[11px] text-muted-foreground">
              Attached debug info: <code className="rounded bg-muted px-1">{errorCode}</code>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Sending…" : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportAudioDialog;
