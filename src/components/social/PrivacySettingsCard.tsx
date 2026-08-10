import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Level = "everyone" | "connections" | "nobody";

const FIELDS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: "profile_visibility", label: "Profile", hint: "Who can open your public profile" },
  { key: "progress_visibility", label: "Progress", hint: "Weekly minutes, videos and Daily Doses" },
  { key: "streak_visibility", label: "Streak", hint: "Your current and longest streak" },
  { key: "activity_visibility", label: "Activity", hint: "What you've been learning recently" },
];

interface Settings {
  profile_visibility: Level;
  progress_visibility: Level;
  streak_visibility: Level;
  activity_visibility: Level;
  discoverable: boolean;
}

const DEFAULTS: Settings = {
  profile_visibility: "everyone",
  progress_visibility: "connections",
  streak_visibility: "connections",
  activity_visibility: "connections",
  discoverable: true,
};

/**
 * Privacy controls for the Connections system. Defaults are privacy-friendly:
 * progress, streak and activity are visible to connections only.
 */
export default function PrivacySettingsCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [local, setLocal] = useState<Settings>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["privacy-settings", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async (): Promise<Settings> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("profile_visibility,progress_visibility,streak_visibility,activity_visibility,discoverable")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return { ...DEFAULTS, ...(data ?? {}) } as Settings;
    },
  });

  useEffect(() => {
    if (data) setLocal(data);
  }, [data]);

  if (!user) return null;

  const save = async (patch: Partial<Settings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    setSaving(true);
    const { error } = await supabase.from("profiles").update(patch).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      setLocal(local);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["privacy-settings"] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Connections privacy
          {(isLoading || saving) && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />}
        </CardTitle>
        <CardDescription>You choose what your circle can see. Nothing is public by default except your profile.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Label htmlFor={`vis-${f.key}`} className="text-sm">{f.label}</Label>
              <p className="text-micro text-muted-foreground">{f.hint}</p>
            </div>
            <Select
              value={local[f.key] as Level}
              onValueChange={(v) => save({ [f.key]: v as Level } as Partial<Settings>)}
            >
              <SelectTrigger id={`vis-${f.key}`} className="h-11 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="connections">Connections only</SelectItem>
                <SelectItem value="nobody">Nobody</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <div>
            <Label htmlFor="vis-discoverable" className="text-sm">Findable by username</Label>
            <p className="text-micro text-muted-foreground">Let members find you in "Find friends"</p>
          </div>
          <Switch
            id="vis-discoverable"
            checked={local.discoverable}
            onCheckedChange={(v) => save({ discoverable: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
