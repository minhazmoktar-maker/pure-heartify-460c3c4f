import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, KeyRound, Copy } from "lucide-react";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

type Institution = {
  slug: string;
  name: string;
  org_type: string | null;
  country: string | null;
  website: string | null;
  logo_url: string | null;
  statement: string | null;
  cosigned: number;
  since: string | null;
};

const EMPTY = {
  slug: "",
  name: "",
  org_type: "",
  country: "",
  website: "",
  logo_url: "",
  contact_email: "",
  public_statement: "",
};

/**
 * Onboarding console for co-signing partner institutions. Keys are minted once
 * and never retrievable — the partner stores it and calls `institution_cosign`.
 */
export default function AdminInstitutions() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const [mintedKey, setMintedKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["cosigning-institutions"],
    queryFn: async (): Promise<Institution[]> => {
      const { data, error } = await supabase.rpc("list_cosigning_institutions" as never);
      if (error) throw error;
      return (data as unknown as Institution[]) ?? [];
    },
  });

  const register = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("admin_register_institution" as never, {
        _slug: form.slug,
        _name: form.name,
        _org_type: form.org_type || null,
        _country: form.country || null,
        _website: form.website || null,
        _logo_url: form.logo_url || null,
        _contact_email: form.contact_email || null,
        _public_statement: form.public_statement || null,
      } as never);
      if (error) throw error;
      return data as unknown as { api_key: string };
    },
    onSuccess: (res) => {
      setMintedKey(res.api_key);
      setForm({ ...EMPTY });
      qc.invalidateQueries({ queryKey: ["cosigning-institutions"] });
      toast.success("Institution registered — copy the signing key now.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (vars: { slug: string; status: string }) => {
      const { error } = await supabase.rpc("admin_set_institution_status" as never, {
        _slug: vars.slug,
        _status: vars.status,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cosigning-institutions"] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <SEO
        title="Co-signing institutions · Heartify admin"
        description="Onboard partner institutions that independently co-sign Heartify moderation attestations."
        path="/admin/institutions"
      />

      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <Building2 className="h-5 w-5 text-primary" aria-hidden />
          Co-signing institutions
        </h1>
        <p className="mt-1 text-caption text-muted-foreground">
          Partners sign the attestation ledger digest with their own key. Their badge appears on
          every /verify page they have co-signed.
        </p>

        <Card className="mt-5 p-5">
          <h2 className="text-base font-semibold">Register a partner</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["name", "Institution name"],
                ["slug", "Slug (e.g. al-azhar-ifta)"],
                ["org_type", "Type (university, fatwa council…)"],
                ["country", "Country"],
                ["website", "Website URL"],
                ["logo_url", "Logo URL"],
                ["contact_email", "Contact email"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-caption text-muted-foreground">
                {label}
                <Input
                  className="mt-1"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <label className="mt-3 block text-caption text-muted-foreground">
            Public statement (shown on /verify)
            <Textarea
              className="mt-1"
              rows={3}
              value={form.public_statement}
              onChange={(e) => setForm((f) => ({ ...f, public_statement: e.target.value }))}
            />
          </label>
          <Button
            className="mt-4 h-11"
            disabled={register.isPending || !form.slug.trim() || !form.name.trim()}
            onClick={() => register.mutate()}
          >
            <KeyRound className="mr-2 h-4 w-4" aria-hidden />
            Register &amp; mint signing key
          </Button>

          {mintedKey && (
            <div className="mt-4 rounded-card border border-border bg-muted/40 p-3">
              <p className="text-caption font-medium text-foreground">
                Signing key — shown once. Send it to the partner over a secure channel.
              </p>
              <p className="mt-1 break-all font-mono text-micro text-foreground">{mintedKey}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-10"
                onClick={() => {
                  navigator.clipboard?.writeText(mintedKey);
                  toast.success("Copied");
                }}
              >
                <Copy className="mr-2 h-4 w-4" aria-hidden />
                Copy key
              </Button>
            </div>
          )}
        </Card>

        <Card className="mt-5 p-5">
          <h2 className="text-base font-semibold">Active partners</h2>
          {isLoading ? (
            <p className="mt-2 text-caption text-muted-foreground">Loading…</p>
          ) : (data ?? []).length === 0 ? (
            <p className="mt-2 text-caption text-muted-foreground">No partners onboarded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {(data ?? []).map((i) => (
                <li key={i.slug} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {i.name}
                    </span>
                    <span className="block text-micro text-muted-foreground">
                      {i.slug} · {i.cosigned} co-signed
                    </span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 shrink-0"
                    onClick={() => setStatus.mutate({ slug: i.slug, status: "suspended" })}
                  >
                    Suspend
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
