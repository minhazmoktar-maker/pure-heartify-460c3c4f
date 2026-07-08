import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/**
 * Community-facing report button for a video (or channel).
 *
 * Reports never auto-remove content — they insert into `video_reports`
 * for moderator triage. The submit-report edge function enforces
 * rate limits and duplicate suppression.
 */

const REASONS: { value: string; label: string; description: string }[] = [
  { value: "inappropriate_content", label: "Inappropriate content", description: "Not aligned with Islamic values" },
  { value: "music_or_haram",        label: "Music / haram audio",   description: "Contains prohibited music or content" },
  { value: "misinformation",        label: "Misinformation",         description: "Factually or theologically incorrect" },
  { value: "sexual_content",        label: "Sexual content",         description: "Nudity, suggestive material" },
  { value: "violence",              label: "Graphic violence",       description: "Excessive violent imagery" },
  { value: "hate_speech",           label: "Hate speech",            description: "Attacks on groups or individuals" },
  { value: "copyright",             label: "Copyright issue",        description: "Unauthorized use of protected content" },
  { value: "spam",                  label: "Spam or clickbait",      description: "Misleading title or spammy channel" },
  { value: "wrong_metadata",        label: "Wrong metadata",         description: "Title, reciter, or category is wrong" },
  { value: "broken_video",          label: "Broken video",           description: "Won't play or has audio issues" },
  { value: "other",                 label: "Other",                  description: "Something else worth flagging" },
];

interface ReportButtonProps {
  videoId?: string;
  channelId?: string;
  videoTitle?: string;
  channelTitle?: string;
  variant?: "outline" | "ghost" | "secondary";
  size?: "sm" | "default";
  className?: string;
}

export function ReportButton({
  videoId, channelId, videoTitle, channelTitle,
  variant = "outline", size = "sm", className,
}: ReportButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [notifyReporter, setNotifyReporter] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason("");
    setDetails("");
    setNotifyReporter(true);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Sign in to report content");
      navigate("/login");
      return;
    }
    if (!reason) {
      toast.error("Please choose a reason");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-report", {
        body: {
          video_id: videoId,
          channel_id: channelId,
          video_title: videoTitle,
          channel_title: channelTitle,
          reason,
          details: details.trim() || undefined,
          notify_reporter: notifyReporter,
          platform: "web",
        },
      });
      if (error) throw error;
      if ((data as { duplicate?: boolean })?.duplicate) {
        toast.info("You've already reported this — our team is on it.");
      } else {
        toast.success("Report received. Thank you for helping keep the platform clean.");
      }
      reset();
      setOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit report";
      if (msg.includes("rate_limited")) {
        toast.error("You've submitted a lot of reports recently. Please wait a bit.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Flag className="mr-1.5 h-3.5 w-3.5" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Report content</DialogTitle>
          <DialogDescription>
            Reports are reviewed by a human moderator. False or spammy reports may be rate-limited.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm font-medium">Reason</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="max-h-72 overflow-y-auto pr-1">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  htmlFor={`reason-${r.value}`}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm transition-colors hover:bg-accent"
                >
                  <RadioGroupItem id={`reason-${r.value}`} value={r.value} className="mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-medium">{r.label}</div>
                    <div className="text-xs text-muted-foreground">{r.description}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="report-details" className="mb-2 block text-sm font-medium">
              Extra details <span className="text-muted-foreground">(optional, up to 2000 chars)</span>
            </Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
              rows={3}
              placeholder="Timestamps, quotes, links — anything that helps moderators act quickly."
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={notifyReporter}
              onCheckedChange={(v) => setNotifyReporter(v === true)}
            />
            Notify me when a moderator resolves this report
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !reason}>
            {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Flag className="mr-1.5 h-4 w-4" />}
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ReportButton;
