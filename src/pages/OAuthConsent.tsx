import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// Beta namespace — narrow local types so TS is happy without touching generated client.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 py-10">
      {error ? (
        <div className="w-full rounded-card border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : !details ? (
        <p className="text-sm text-muted-foreground">Loading authorization request…</p>
      ) : (
        <div className="w-full space-y-5 rounded-card border border-border bg-card p-6 shadow-sm">
          <div>
            <h1 className="font-heading text-heading font-semibold">
              Connect {details.client?.name ?? "an app"} to Heartify
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This lets {details.client?.name ?? "the client"} use Heartify as you. It does not bypass
              Heartify's permissions or backend policies.
            </p>
          </div>
          {details.client?.redirect_uri && (
            <p className="text-micro text-muted-foreground">
              Redirects to: <span className="font-mono">{details.client.redirect_uri}</span>
            </p>
          )}
          <div className="flex gap-3">
            <Button disabled={busy} onClick={() => decide(true)}>Approve</Button>
            <Button disabled={busy} variant="outline" onClick={() => decide(false)}>Cancel connection</Button>
          </div>
        </div>
      )}
    </main>
  );
}
