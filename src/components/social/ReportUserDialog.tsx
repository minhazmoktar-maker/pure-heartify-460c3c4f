import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { useConnections } from "@/hooks/useSocial";

const REASONS = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment" },
  { id: "inappropriate", label: "Inappropriate behaviour" },
  { id: "abuse", label: "Abuse" },
  { id: "other", label: "Other" },
];

/** Report a member into the admin moderation queue. */
export default function ReportUserDialog({
  handle,
  open,
  onOpenChange,
}: {
  handle: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { reportUser } = useConnections();
  const [reason, setReason] = useState("spam");
  const [description, setDescription] = useState("");

  const submit = async () => {
    if (!handle) return;
    await reportUser.mutateAsync({ handle, reason, description: description.trim().slice(0, 1000) });
    onOpenChange(false);
    setDescription("");
    setReason("spam");
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" aria-hidden /> Report @{handle}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Reports go to Heartify's moderation team. Only share what's needed.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <RadioGroup value={reason} onValueChange={setReason} className="space-y-1">
          {REASONS.map((r) => (
            <div key={r.id} className="flex min-h-11 items-center gap-3 rounded-card border px-3">
              <RadioGroupItem value={r.id} id={`report-${r.id}`} />
              <Label htmlFor={`report-${r.id}`} className="flex-1 cursor-pointer">
                {r.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="space-y-2">
          <Label htmlFor="report-details">Details (optional)</Label>
          <Textarea
            id="report-details"
            maxLength={1000}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened?"
          />
        </div>

        <ResponsiveModalFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={reportUser.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={reportUser.isPending || !handle}>
            {reportUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Submit report
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
