import { useState } from "react";
import { Loader2, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { useChallenges, type Challenge, type ConnectionRow } from "@/hooks/useSocial";
import { cn } from "@/lib/utils";

const TYPES: { id: Challenge["type"]; label: string; unit: string; defaultGoal: number }[] = [
  { id: "doses", label: "Daily Doses", unit: "doses", defaultGoal: 5 },
  { id: "minutes", label: "Learning minutes", unit: "minutes", defaultGoal: 120 },
  { id: "videos", label: "Videos completed", unit: "videos", defaultGoal: 10 },
  { id: "sessions", label: "Learning days", unit: "days", defaultGoal: 7 },
  { id: "sadaqah_days", label: "Sadaqah days", unit: "days with sadaqah", defaultGoal: 7 },
  { id: "sadaqah_acts", label: "Sadaqah acts", unit: "sadaqah acts", defaultGoal: 10 },
];

const DURATIONS = [3, 7, 14, 30];

/**
 * Create an invite-only accountability challenge with connections.
 * Progress is never entered by hand — the server computes it from real activity.
 */
export default function CreateChallengeDialog({
  open,
  onOpenChange,
  connections,
  presetHandle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  connections: ConnectionRow[];
  presetHandle?: string | null;
}) {
  const { create } = useChallenges();
  const [type, setType] = useState<Challenge["type"]>("doses");
  const [days, setDays] = useState(7);
  const [goal, setGoal] = useState(5);
  const [title, setTitle] = useState("");
  const [invited, setInvited] = useState<string[]>(presetHandle ? [presetHandle] : []);

  const active = TYPES.find((t) => t.id === type)!;
  const resolvedTitle = title.trim() || `${days}-Day ${active.label} Challenge`;

  const toggle = (handle: string) =>
    setInvited((prev) => (prev.includes(handle) ? prev.filter((h) => h !== handle) : [...prev, handle]));

  const submit = async () => {
    await create.mutateAsync({ type, title: resolvedTitle, goal, days, handles: invited });
    onOpenChange(false);
    setTitle("");
    setInvited([]);
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-h-[90dvh] overflow-y-auto">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" aria-hidden /> Create a challenge
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Invite-only and private to your circle. Progress is measured from your real Heartify activity.
            Sadaqah challenges count acts and days only — amounts always stay private on your device.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Challenge type</legend>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setType(t.id);
                    setGoal(t.defaultGoal);
                  }}
                  aria-pressed={type === t.id}
                  className={cn(
                    "min-h-11 rounded-card border p-3 text-left text-sm transition-colors",
                    type === t.id ? "border-primary bg-primary/5 font-medium" : "hover:border-primary/50",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {type.startsWith("sadaqah") && (
              <p className="text-micro text-muted-foreground">
                Only how often you gave is shared — never how much.
              </p>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Duration</legend>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  aria-pressed={days === d}
                  className={cn(
                    "min-h-11 rounded-pill border px-4 text-sm transition-colors",
                    days === d ? "border-primary bg-primary/5 font-medium" : "hover:border-primary/50",
                  )}
                >
                  {d} days
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="challenge-goal">Goal ({active.unit})</Label>
            <Input
              id="challenge-goal"
              type="number"
              inputMode="numeric"
              min={1}
              max={100000}
              value={goal}
              onChange={(e) => setGoal(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="challenge-title">Title (optional)</Label>
            <Input
              id="challenge-title"
              maxLength={120}
              placeholder={resolvedTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Invite connections</p>
            {connections.length === 0 ? (
              <p className="text-micro text-muted-foreground">
                Connect with someone first — challenges are invite-only.
              </p>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-card border p-2">
                {connections.map((c) => (
                  <li key={c.user_handle}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-card px-2 hover:bg-muted/50">
                      <Checkbox
                        checked={invited.includes(c.user_handle)}
                        onCheckedChange={() => toggle(c.user_handle)}
                        aria-label={`Invite @${c.user_handle}`}
                      />
                      <span className="truncate text-sm">
                        {c.display_name || `@${c.user_handle}`}
                        <span className="ml-1 font-mono text-micro text-muted-foreground">@{c.user_handle}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <ResponsiveModalFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending || connections.length === 0}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Create challenge
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
