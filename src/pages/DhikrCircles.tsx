import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, Plus, Users, Sparkles, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import {
  contributeToDhikrCircle,
  createDhikrCircle,
  endDhikrCircle,
  useDhikrCircles,
  type DhikrCircle,
} from "@/hooks/useDhikrCircles";
import { useAuth } from "@/contexts/AuthContext";
import { shareContent } from "@/lib/share";

const PHRASE_PRESETS = [
  { label: "SubhanAllah", value: "SubhanAllah" },
  { label: "Alhamdulillah", value: "Alhamdulillah" },
  { label: "Allahu Akbar", value: "Allahu Akbar" },
  { label: "La ilaha illa Allah", value: "La ilaha illa Allah" },
  { label: "Astaghfirullah", value: "Astaghfirullah" },
];

function CircleCard({ circle, isHost }: { circle: DhikrCircle; isHost: boolean }) {
  const [busy, setBusy] = useState(false);
  const pct = Math.min(100, Math.round((Number(circle.current_count) / circle.target_count) * 100));

  const contribute = async (n: number) => {
    setBusy(true);
    try {
      await contributeToDhikrCircle(circle.id, n);
      toast.success(`+${n} ${circle.phrase}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not contribute");
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    setBusy(true);
    try {
      await endDhikrCircle(circle.id);
      toast.success("Circle ended");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not end circle");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="truncate">{circle.title}</span>
          <span className="text-xs font-normal text-muted-foreground">{circle.phrase}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={pct} />
        <div className="flex items-center justify-between text-sm">
          <span className="tabular-nums">
            {Number(circle.current_count).toLocaleString()} /{" "}
            {circle.target_count.toLocaleString()}
          </span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 10, 33, 100].map((n) => (
            <Button
              key={n}
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => contribute(n)}
            >
              +{n}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              shareContent({
                kind: "dhikr_circle",
                refId: circle.id,
                title: circle.title,
                text: `Join our dhikr circle: ${circle.phrase}`,
                url: `${window.location.origin}/c/${circle.id}`,
              })
            }
          >
            <Share2 className="h-4 w-4" />
          </Button>
          {isHost && (
            <Button size="sm" variant="outline" disabled={busy} onClick={close} className="ml-auto">
              End
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateCircleDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [phrase, setPhrase] = useState(PHRASE_PRESETS[0].value);
  const [target, setTarget] = useState(1000);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || !phrase.trim() || target < 1) {
      toast.error("Fill in title, phrase, and a valid goal");
      return;
    }
    setSaving(true);
    try {
      await createDhikrCircle({ title: title.trim(), phrase: phrase.trim(), target_count: target });
      toast.success("Circle created");
      setOpen(false);
      setTitle("");
      setTarget(1000);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New circle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a dhikr circle</DialogTitle>
          <DialogDescription>
            Invite others to hit a shared goal together. Counts update live for everyone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Friday night SubhanAllah 100k"
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phrase">Phrase</Label>
            <div className="flex flex-wrap gap-1">
              {PHRASE_PRESETS.map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  size="sm"
                  variant={phrase === p.value ? "default" : "outline"}
                  onClick={() => setPhrase(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <Input
              id="phrase"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              maxLength={60}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target">Goal count</Label>
            <Input
              id="target"
              type="number"
              min={1}
              max={1000000}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DhikrCircles() {
  const { user } = useAuth();
  const { circles, loading, refresh } = useDhikrCircles();

  const activeSorted = useMemo(
    () => [...circles].sort((a, b) => Number(b.current_count) - Number(a.current_count)),
    [circles]
  );

  return (
    <>
      <Helmet>
        <title>Dhikr Circles — Heartify</title>
        <meta
          name="description"
          content="Join live dhikr circles and contribute to a shared remembrance goal together."
        />
      </Helmet>
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <Sparkles className="h-6 w-6 text-primary" /> Dhikr Circles
            </h1>
            <p className="text-sm text-muted-foreground">
              Live shared counters. Every tap adds to the group total.
            </p>
          </div>
          {user && <CreateCircleDialog onCreated={refresh} />}
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading circles…
          </div>
        ) : activeSorted.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No active circles yet"
            description={
              user
                ? "Be the first to start one — invite friends and rack up the collective reward, in shā' Allāh."
                : "Sign in to start the first circle and invite your friends."
            }
            actionLabel={user ? undefined : "Sign in"}
            actionHref={user ? undefined : "/auth"}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeSorted.map((c) => (
              <CircleCard key={c.id} circle={c} isHost={!!user && c.host_user_id === user.id} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
