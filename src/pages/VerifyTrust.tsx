import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ShieldCheck, Copy, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Institution {
  slug: string;
  name: string;
  org_type: string | null;
  country: string | null;
  website: string | null;
  logo_url: string | null;
  statement: string | null;
  cosigned: number | null;
  since: string | null;
}

const BADGE_SNIPPET = `<a href="https://heartifyapp.com/verify" rel="noopener">
  <img src="https://heartifyapp.com/badge/reviewed-on-heartify.svg"
       alt="Reviewed on Heartify — halal-first content review"
       width="180" height="40" loading="lazy" />
</a>`;

/**
 * `/verify` — the public trust surface. Explains the attestation chain, lists
 * the institutions that co-sign Heartify's review decisions, and hands
 * communities an embeddable badge they can put on their own site.
 */
export default function VerifyTrust() {
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["cosigning-institutions-public"],
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<Institution[]> => {
      const { data, error } = await supabase.rpc("list_cosigning_institutions");
      if (error) throw error;
      return (data as unknown as Institution[]) ?? [];
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["cosign-trust-summary"],
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<CosignSummary | null> => {
      const { data, error } = await supabase.rpc("get_cosign_trust_summary");
      if (error) throw error;
      return ((data as unknown as CosignSummary[]) ?? [])[0] ?? null;
    },
  });


  const institutions = data ?? [];
  const totalCosigned = institutions.reduce((s, i) => s + (i.cosigned ?? 0), 0);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(BADGE_SNIPPET);
      setCopied(true);
      toast.success("Badge code copied");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy — select the code manually.");
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-28">
      <SEO
        title="Verify Heartify — Institution Attestations & Public Badge"
        description="How Heartify's content review can be checked independently: tamper-evident attestations, institutional co-signatures, and an embeddable Reviewed on Heartify badge for mosques and schools."
        path="/verify"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Verify Heartify",
          url: "https://heartifyapp.com/verify",
          description:
            "Public attestation and institutional co-signing programme for Heartify's halal-first content review.",
        }}
      />
      <Navbar />

      <main className="mx-auto max-w-[820px] px-4 py-8 md:px-6 md:py-12">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
          <h1 className="text-3xl font-bold tracking-tight">Verify Heartify</h1>
        </div>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Trust should not rest on a claim. Every video Heartify serves carries a public
          attestation record: which review stages ran, at what confidence, from which channel
          tier, and a digest chained to the record before it so nothing can be quietly
          rewritten. Anyone — a parent, an imam, a school — can open that record.
        </p>

        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight">Check any video</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Open a video and choose “Why is this here?”, or visit{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">heartifyapp.com/verify/&lt;video-id&gt;</code>{" "}
            directly. The page shows the tier, reviewer chain, timeline of decisions, ledger
            digest, and any institutional co-signatures on that exact record.
          </p>
        </section>

        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight">Co-signing institutions</h2>
            {!isLoading && institutions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {totalCosigned.toLocaleString()} co-signed records
              </p>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Institutions hold their own signing key. When they co-sign a record they sign the
            ledger digest, so their endorsement is bound to that specific decision and breaks
            if the decision changes.
          </p>

          {isLoading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-card" />
              ))}
            </div>
          ) : institutions.length === 0 ? (
            <Card className="mt-4 p-4">
              <p className="text-sm text-muted-foreground">
                No institution has published a co-signature yet. Mosques, seminaries and
                schools can join the programme — we issue a signing key and your endorsement
                appears on every record you sign.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/contact">Apply to co-sign</Link>
              </Button>
            </Card>
          ) : (
            <ul className="mt-4 space-y-3">
              {institutions.map((i) => (
                <li key={i.slug}>
                  <Card className="flex items-start gap-3 p-4">
                    {i.logo_url ? (
                      <img
                        src={i.logo_url}
                        alt={`${i.name} logo`}
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded-md object-contain"
                      />
                    ) : (
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-muted">
                        <BadgeCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">{i.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {[i.org_type, i.country, i.cosigned ? `${i.cosigned} co-signed` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {i.statement && (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          “{i.statement}”
                        </p>
                      )}
                      {i.website && (
                        <a
                          href={i.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4"
                        >
                          {new URL(i.website).hostname}
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">Public badge</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Community sites, madrasahs and schools can display the badge below to show they
            point their families at reviewed content. It links back to this page so anyone can
            check what the review actually means.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <img
              src="/badge/reviewed-on-heartify.svg"
              alt="Reviewed on Heartify — halal-first content review"
              width={180}
              height={40}
            />
            <Button variant="outline" size="sm" onClick={copy}>
              <Copy className="me-1.5 h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy embed code"}
            </Button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-card border border-border bg-muted/40 p-3 text-xs leading-relaxed">
            <code>{BADGE_SNIPPET}</code>
          </pre>
        </section>

        <section className="mt-10 border-t border-border pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Related
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/trust" className="text-primary underline underline-offset-4">
                Trust &amp; safety standards
              </Link>
            </li>
            <li>
              <Link to="/channel-trust" className="text-primary underline underline-offset-4">
                How channel tiers are decided
              </Link>
            </li>
            <li>
              <Link to="/halal-video" className="text-primary underline underline-offset-4">
                What the halal floor excludes
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
