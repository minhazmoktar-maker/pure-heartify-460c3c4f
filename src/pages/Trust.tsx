import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Lock, Eye, FileCheck, Users, AlertCircle, Database, Clock, Server, ShieldCheck, Landmark } from "lucide-react";

type SigningInstitution = {
  slug: string;
  name: string;
  org_type: string | null;
  country: string | null;
  website: string | null;
  logo_url: string | null;
  public_statement: string | null;
  cosign_count: number | null;
  since: string | null;
};

function useSigningInstitutions() {
  return useQuery({
    queryKey: ["signing-institutions"],
    queryFn: async (): Promise<SigningInstitution[]> => {
      const { data, error } = await supabase.rpc("list_signing_institutions");
      if (error) throw error;
      return (data ?? []) as SigningInstitution[];
    },
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}


type TrustStats = {
  approved_channels: number;
  reviewed_videos: number;
  removed_videos: number;
  languages_covered: number;
  surfaced_videos?: number;
  attested_videos?: number;
  ledger_records?: number;
  ledger_chain_head?: string | null;
  generated_at: string;
};


function useTrustStats() {
  return useQuery({
    queryKey: ["trust-stats"],
    queryFn: async (): Promise<TrustStats | null> => {
      const { data, error } = await supabase.rpc("get_trust_stats");
      if (error) throw error;
      return (data as unknown as TrustStats) ?? null;
    },
    staleTime: 60 * 60 * 1000, // 1h — aggregate counts move slowly
    gcTime: 6 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

function StatTile({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  return (
    <div className="rounded-card border border-border bg-card p-4 text-center">
      {loading || value === undefined ? (
        <Skeleton className="mx-auto h-7 w-16" />
      ) : (
        <div className="text-heading font-semibold tabular-nums text-foreground">
          {value.toLocaleString()}
        </div>
      )}
      <div className="mt-1 text-micro uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

/**
 * Public Trust page. App-owned editable content maintained by the Heartify team.
 * This page describes app-visible controls and current practices; it is not an
 * independent certification.
 */
export default function Trust() {
  const { data: stats, isLoading } = useTrustStats();
  const { data: institutions, isLoading: institutionsLoading } = useSigningInstitutions();

  const surfaced = stats?.surfaced_videos ?? 0;
  const coveragePct =
    surfaced > 0
      ? `${Math.min(100, Math.round(((stats?.attested_videos ?? 0) / surfaced) * 1000) / 10)}%`
      : "—";



  return (
    <>
      <SEO
        title="Trust & Security — Heartify"
        description="How Heartify protects your data, moderates content, and safeguards your ibādah journey."
        path="/trust"
      />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <PageHeader
          title="Trust & Security"
          subtitle="This page is maintained by the Heartify team to answer common security, privacy, and content questions. It reflects controls currently enabled in the app, not an independent certification."
        />

        {/* Aggregate moderation stats — anonymised counts only. No moderator
            identities or per-item data are exposed. Backed by the
            SECURITY DEFINER RPC public.get_trust_stats(). */}
        <section aria-label="Moderation at a glance" className="mt-8">
          <div className="mb-3 flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Moderation at a glance
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Approved channels" value={stats?.approved_channels} loading={isLoading} />
            <StatTile label="Reviewed videos" value={stats?.reviewed_videos} loading={isLoading} />
            <StatTile label="Videos removed" value={stats?.removed_videos} loading={isLoading} />
            <StatTile label="Languages covered" value={stats?.languages_covered} loading={isLoading} />
          </div>

          <div className="mt-3 rounded-card border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="text-micro uppercase tracking-wider text-muted-foreground">
                  Attestation coverage
                </div>
                <p className="mt-1 text-sm text-foreground">
                  Every video we surface carries a signed, append-only attestation record you can look up.
                </p>
              </div>
              {isLoading || stats?.attested_videos === undefined ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="text-heading font-semibold tabular-nums text-foreground">
                  {coveragePct}
                  <span className="ml-1 text-micro font-normal text-muted-foreground">
                    ({stats.attested_videos.toLocaleString()} of {(stats.surfaced_videos ?? 0).toLocaleString()})
                  </span>
                </div>
              )}
            </div>
            {stats?.ledger_chain_head ? (
              <p className="mt-3 break-all font-mono text-micro text-muted-foreground">
                Ledger chain head: {stats.ledger_chain_head}
              </p>
            ) : null}
          </div>

          <p className="mt-2 text-micro text-muted-foreground">
            Counts are aggregated from the live moderation ledger and refresh hourly. We never publish individual moderator names or per-decision details.
          </p>

        </section>

        {/* Institutions that independently co-sign our attestation ledger. Only
            public directory fields are exposed — signing keys never leave the
            backend. Empty state is honest: it invites partners instead of
            implying endorsements we do not have. */}
        <section aria-label="Independent co-signers" className="mt-8">
          <div className="mb-3 flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
            <Landmark className="h-3.5 w-3.5 text-primary" />
            Independent co-signers
          </div>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">
              Institutions can cryptographically co-sign entries in our attestation ledger. A co-signature
              binds their key to the exact ledger state at signing time, so anyone can verify it later on the{" "}
              <Link to="/verify" className="text-primary underline underline-offset-2">
                verification page
              </Link>
              .
            </p>

            {institutionsLoading ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : institutions && institutions.length > 0 ? (
              <ul className="mt-4 divide-y divide-border">
                {institutions.map((i) => (
                  <li key={i.slug} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">{i.name}</div>
                      <div className="truncate text-micro text-muted-foreground">
                        {[i.org_type, i.country].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-pill bg-muted px-2.5 py-1 text-micro tabular-nums text-muted-foreground">
                      {(i.cosign_count ?? 0).toLocaleString()} co-signatures
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-card border border-dashed border-border p-4 text-sm text-muted-foreground">
                No institutions have co-signed yet. We publish partners here only once their signature is on
                the ledger — never as a logo wall.
              </p>
            )}

            <Link
              to="/contact"
              className="mt-4 inline-flex min-h-[44px] items-center rounded-pill bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Become a co-signing institution
            </Link>
          </Card>
        </section>



        <div className="mt-8 grid gap-4">
          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <Shield className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Content trust</h2>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Every video and audio track is reviewed through a multi-stage moderation pipeline before appearing on the feed.</li>
                  <li>Approved creators are tracked in a public channel-trust ledger with per-channel scores and revocation history.</li>
                  <li>Users can report any item as non-halal; reports route directly into the moderation review queue.</li>
                  <li>Content featuring music-forward material or non-Islamic dress code is filtered by policy.</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <Lock className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Access & authentication</h2>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Email/password with leaked-password (HIBP) protection enabled.</li>
                  <li>Google Sign-In and optional multi-factor authentication (TOTP).</li>
                  <li>Admin and moderator actions require MFA and are logged to an immutable audit trail.</li>
                  <li>Session tokens are short-lived and rotated automatically.</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <Eye className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Data collection & use</h2>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Row-level security is enforced on every user-owned table so users can only read and write their own data.</li>
                  <li>Playback progress, streaks, and preferences are stored to power your experience — never sold.</li>
                  <li>No third-party ad networks. No behavioural ad tracking.</li>
                  <li>Analytics events are sanitized to strip PII before storage.</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <Users className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Your rights</h2>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Export or delete your account and all associated data from Profile → Settings.</li>
                  <li>Household seats on Heartify+ can be revoked at any time by the primary account.</li>
                  <li>See our <a className="underline" href="/privacy">Privacy Policy</a> and <a className="underline" href="/terms">Terms</a> for the full legal basis.</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <FileCheck className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Platform & hosting</h2>
                <p className="text-sm text-muted-foreground">
                  Heartify runs on a managed cloud backend with encryption in transit (TLS 1.2+) and at rest. Database access is scoped by role and enforced by row-level security policies. The hosting platform provides infrastructure controls; Heartify is responsible for application-level access rules and content moderation.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <Database className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Subprocessors & integrations</h2>
                <p className="text-sm text-muted-foreground mb-2">
                  Heartify uses a small set of processors to run the service. This list is maintained by the Heartify team.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li><strong className="text-foreground">Managed backend & database</strong> — authentication, storage, and Postgres hosting.</li>
                  <li><strong className="text-foreground">YouTube Data API</strong> — video metadata and playback (public content only).</li>
                  <li><strong className="text-foreground">Push delivery</strong> — Web Push (VAPID) and platform APNs / FCM for mobile.</li>
                  <li><strong className="text-foreground">Error monitoring</strong> — Sentry, receiving stack traces with PII stripped.</li>
                </ul>
                <p className="mt-2 text-micro text-muted-foreground">
                  We do not sell personal data and do not share it with advertising networks. A data-processing addendum is available on request via <a className="underline" href="mailto:privacy@heartify.app">privacy@heartify.app</a>.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <Clock className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Retention & deletion</h2>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Account profile and playback history are kept while your account is active.</li>
                  <li>Analytics events are retained for up to 24 months in aggregated form, then purged by the nightly retention job.</li>
                  <li>Deleted accounts are erased from user-owned tables immediately; residual references in audit and moderation logs are anonymised within 30 days.</li>
                  <li>Backups are encrypted and rotated on a rolling 30-day window.</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <Server className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Incident response</h2>
                <p className="text-sm text-muted-foreground">
                  We monitor error rates, moderation SLAs, and edge-function health continuously. If a security incident affects your data, we will notify affected users by email without undue delay and post an update on our public status page. Post-incident summaries are shared once remediation is complete.
                </p>
              </div>
            </div>
          </Card>


          <Card className="p-6 border-primary/20">
            <div className="flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Report a security issue</h2>
                <p className="text-sm text-muted-foreground">
                  If you believe you've found a vulnerability, please email{" "}
                  <a className="underline" href="mailto:security@heartify.app">security@heartify.app</a>.
                  We investigate every report and aim to respond within 72 hours.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <p className="text-micro text-muted-foreground mt-8 text-center">
          Last reviewed: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}
        </p>
      </div>
    </>
  );
}
