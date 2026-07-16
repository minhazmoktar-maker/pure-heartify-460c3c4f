import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

/**
 * Sends a lightweight "nudge" notification to another user by handle.
 * Backed by the `send_nudge_by_handle` RPC — the server enforces rate limits
 * and self-nudge protection.
 */
interface Props {
  handle: string;
  displayName?: string | null;
}

const PRESETS: Record<string, { label: string; message: string }> = {
  streak: { label: "Keep your streak alive", message: "Your streak is calling — one dose keeps it going!" },
  dose:   { label: "Today's dose",           message: "Take today's dose with me, in shaa Allah." },
  khatm:  { label: "Join the khatm",         message: "Join our khatm — every juz counts." },
  general:{ label: "Just a nudge",           message: "Thinking of you — keep going!" },
};

export default function NudgeButton({ handle, displayName }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<keyof typeof PRESETS>("streak");
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const onSend = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("send_nudge_by_handle", {
      _handle: handle,
      _kind: kind,
      _message: PRESETS[kind].message,
    });
    setBusy(false);
    const payload = (data ?? {}) as { ok?: boolean; error?: string };
    if (error || payload.error) {
      const code = payload.error ?? "unknown";
      const messages: Record<string, string> = {
        daily_limit_reached: "You've sent your 5 nudges for today.",
        recipient_already_nudged_today: `You already nudged @${handle} today.`,
        cannot_nudge_self: "You can't nudge yourself.",
        handle_not_found: "Handle not found.",
      };
      toast({ title: "Couldn't send", description: messages[code] ?? code, variant: "destructive" });
      return;
    }
    void track("nudge.sent", { handle, kind });
    toast({ title: "Nudge sent", description: `${displayName ?? "@" + handle} will see it in their notifications.` });
    setOpen(false);
  };

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      <ResponsiveModalTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Bell className="h-4 w-4" /> Nudge
        </Button>
      </ResponsiveModalTrigger>
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Send a nudge</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Encourage {displayName ? <b>{displayName}</b> : <>@{handle}</>} with a quick reminder.
            Limit: 5 nudges/day, 1 per person/day.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <RadioGroup value={kind} onValueChange={(v) => setKind(v as keyof typeof PRESETS)} className="space-y-2">
          {Object.entries(PRESETS).map(([k, p]) => (
            <div key={k} className="flex items-start gap-2 rounded-card border p-3">
              <RadioGroupItem value={k} id={`nudge-${k}`} className="mt-0.5" />
              <Label htmlFor={`nudge-${k}`} className="flex-1 cursor-pointer">
                <div className="font-medium">{p.label}</div>
                <div className="text-micro text-muted-foreground">{p.message}</div>
              </Label>
            </div>
          ))}
        </RadioGroup>
        <ResponsiveModalFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={onSend} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send nudge
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
