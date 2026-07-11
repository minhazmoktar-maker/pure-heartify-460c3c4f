import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Users, BookOpen, Loader2, Sparkles } from "lucide-react";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import { z } from "zod";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

interface KhatmGroup {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  is_public: boolean;
  completed_at: string | null;
  created_at: string;
}

const CreateSchema = z.object({
  name: z.string().trim().min(3, "At least 3 characters").max(80),
  description: z.string().trim().max(400).optional(),
  intention: z.string().trim().max(200).optional(),
  is_public: z.boolean().default(false),
});

export default function GroupKhatmList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<KhatmGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    intention: "",
    is_public: false,
  });

  const load = async () => {
    setLoading(true);
    // Groups where I'm a member OR I own OR public
    const { data: memberships } = await supabase
      .from("khatm_group_members")
      .select("group_id")
      .eq("user_id", user?.id ?? "00000000-0000-0000-0000-000000000000");
    const ids = (memberships ?? []).map((m) => m.group_id);
    const { data } = await supabase
      .from("khatm_groups")
      .select("id,name,description,invite_code,is_public,completed_at,created_at")
      .or(
        [
          user?.id ? `owner_id.eq.${user.id}` : null,
          ids.length ? `id.in.(${ids.join(",")})` : null,
        ]
          .filter(Boolean)
          .join(",") || "id.eq.00000000-0000-0000-0000-000000000000",
      )
      .order("created_at", { ascending: false });
    setGroups((data ?? []) as KhatmGroup[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const create = async () => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    const parsed = CreateSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("khatm_groups")
      .insert({
        owner_id: user.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        intention: parsed.data.intention || null,
        is_public: parsed.data.is_public,
      })
      .select("id,invite_code")
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Could not create group");
      setSaving(false);
      return;
    }
    // Auto-join owner
    await supabase.from("khatm_group_members").insert({
      group_id: data.id,
      user_id: user.id,
      role: "owner",
    });
    await track("khatm_group_created", { group_id: data.id, is_public: parsed.data.is_public });
    setOpen(false);
    setSaving(false);
    setForm({ name: "", description: "", intention: "", is_public: false });
    navigate(`/khatm/group/${data.id}`);
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Group Khatm — Complete the Quran together"
        description="Start or join a Khatm circle: 30 members, 30 Juz, one shared completion." path="/khatm/groups"
      />
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Group Khatm</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              30 members, 30 Juz. Read together, complete the Quran together.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5" disabled={!user}>
                <Plus className="h-4 w-4" aria-hidden /> New group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Khatm group</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="kg-name">Name</Label>
                  <Input
                    id="kg-name"
                    value={form.name}
                    maxLength={80}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ramadan 1447 · Family Khatm"
                  />
                </div>
                <div>
                  <Label htmlFor="kg-desc">Description (optional)</Label>
                  <Textarea
                    id="kg-desc"
                    value={form.description}
                    maxLength={400}
                    rows={2}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="A short note for members"
                  />
                </div>
                <div>
                  <Label htmlFor="kg-int">Intention (niyyah, optional)</Label>
                  <Input
                    id="kg-int"
                    value={form.intention}
                    maxLength={200}
                    onChange={(e) => setForm((f) => ({ ...f, intention: e.target.value }))}
                    placeholder="e.g., for the shifa of ..."
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label htmlFor="kg-public" className="text-sm">Public listing</Label>
                    <p className="text-xs text-muted-foreground">
                      Anyone can discover this group. Off = invite link only.
                    </p>
                  </div>
                  <Switch
                    id="kg-public"
                    checked={form.is_public}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_public: v }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={create} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create group"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {loading ? (
          <PageSkeleton variant="list" />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No groups yet"
            description="Create a group and invite friends and family to complete the Quran together."
            actionLabel={user ? "Create a group" : undefined}
            onAction={user ? () => setOpen(true) : undefined}
            tone="gold"
          />
        ) : (
          <div className="grid gap-3">
            {groups.map((g) => (
              <Link
                key={g.id}
                to={`/khatm/group/${g.id}`}
                className="block transition-transform hover:-translate-y-0.5"
              >
                <Card className="p-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{g.name}</h3>
                      {g.completed_at && (
                        <span className="heartify-chip heartify-chip--primary">Completed</span>
                      )}
                      {g.is_public && !g.completed_at && (
                        <span className="heartify-chip heartify-chip--muted">Public</span>
                      )}
                    </div>
                    {g.description && (
                      <p className="text-sm text-muted-foreground truncate">{g.description}</p>
                    )}
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
