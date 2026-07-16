import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AtSign, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";

/**
 * Lets the signed-in user claim a public handle used at /u/:handle.
 * Fully driven by the `set_profile_handle` RPC (validation lives in SQL).
 */
export default function HandleClaimCard() {
  const { user } = useAuth();
  const [current, setCurrent] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("handle")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setCurrent(data?.handle ?? null);
        setValue(data?.handle ?? "");
        setLoading(false);
      });
  }, [user]);

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc("set_profile_handle", { _handle: value });
    setSaving(false);
    if (error) {
      const map: Record<string, string> = {
        invalid_handle: "Use 3–24 letters, numbers or underscores.",
        handle_taken: "That handle is already taken.",
        not_authenticated: "Please sign in first.",
      };
      const msg = map[error.message] ?? error.message;
      toast.error(msg);
      return;
    }
    setCurrent(data as string);
    toast.success("Handle saved");
  };

  if (loading) return null;

  const publicUrl = current ? `/u/${current}` : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AtSign className="h-4 w-4 text-primary" /> Public handle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-micro text-muted-foreground">
          Claim a username to get a shareable page at{" "}
          <span className="font-mono">heartify.app/u/yourname</span>.
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="yourname"
              className="pl-7"
              maxLength={24}
            />
          </div>
          <Button onClick={save} disabled={saving || value === current || value.length < 3}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
        </div>
        {publicUrl && (
          <Link
            to={publicUrl}
            className="flex items-center gap-1.5 text-micro text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> View public profile
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
