import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ShieldCheck, BadgeCheck, Clock, Hash, ExternalLink, AlertTriangle, ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import CoSignatures from "@/components/CoSignatures";

type Attestation = {
  found: boolean;
  video_id: string;
  title?: string;
  channel_id?: string;
  channel_title?: string;
  thumbnail_url?: string;
  category?: string;
  content_language?: string;
  is_trusted_channel?: boolean;
  moderation?: {
    state: string;
    stage?: string | null;
    confidence?: number | null;
    risk?: number | null;
    provider?: string | null;
    updated_at?: string | null;
  };
  tier?: "A" | "B" | "C" | "D";
  reviewer_chain?: string;
  decision_count?: number;
  latest_decision?: Record<string, unknown> | null;
  timeline?: Array<{
    stage: string;
    state: string;
    confidence?: number | null;
    risk?: number | null;
    provider?: string | null;
    actor_kind?: string | null;
    reasoning?: string | null;
    rule_hits?: unknown;
    created_at: string;
  }>;
  ledger?: {
    record_id: string;
    sequence: number;
    ledger_version: string;
    issuer: string;
    issued_at: string;
    digest: string;
    prev_digest?: string | null;
    chain_digest: string;
    claims?: Record<string, unknown>;
    verified: boolean;
    stale: boolean;
  } | null;
  attestation?: {
    algorithm: string;
    digest: string;
    issued_at: string;
    issuer: string;
    canonical_form?: string;
    ledger_backed?: boolean;
  };
};


const TIER_LABEL: Record<string, { name: string; tone: string; desc: string }> = {
  A: {
    name: "Tier A · Trusted",
    tone: "bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]",
    desc: "From a channel Heartify has explicitly vetted and endorsed. Every upload from this source is reviewed against strict halal-first standards.",
  },
  B: {
    name: "Tier B · High confidence",
    tone: "bg-emerald-500/15 text-emerald-600",
    desc: "Passed automated review with high confidence (≥ 0.90) and matches Heartify's beneficial-content criteria.",
  },
  C: {
    name: "Tier C · Reviewed",
    tone: "bg-primary/10 text-primary",
    desc: "Passed automated review with moderate confidence (≥ 0.70). Held to the same hard rules against female visibility, music, and haram visuals.",
  },
  D: {
    name: "Tier D · Under review",
    tone: "bg-muted text-muted-foreground",
    desc: "Awaiting or in additional review. Not shown in the main feed until it meets tier C or higher.",
  },
};

function fmt(date?: string | null) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return date;
  }
}

export default function Verify() {
  const { videoId } = useParams<{ videoId: string }>();
  const [data, setData] = useState<Attestation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!videoId) return;
      setLoading(true);
      const { data: res, error: e } = await supabase.rpc("get_public_attestation", { _video_id: videoId });
      if (cancelled) return;
      if (e) setError(e.message);
      else setData(res as unknown as Attestation);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const found = data?.found === true;
  const tier = data?.tier ?? "D";
  const tierMeta = TIER_LABEL[tier] ?? TIER_LABEL.D;
  const path = `/verify/${videoId ?? ""}`;

  const jsonLd = found
    ? {
        "@context": "https://schema.org",
        "@type": "ClaimReview",
        datePublished: data?.attestation?.issued_at,
        url: `https://pure-heartify.lovable.app${path}`,
        claimReviewed: `Halal-first moderation attestation for "${data?.title}"`,
        itemReviewed: {
          "@type": "VideoObject",
          name: data?.title,
          identifier: data?.video_id,
          author: { "@type": "Organization", name: data?.channel_title },
        },
        author: { "@type": "Organization", name: "Heartify Moderation" },
        reviewRating: {
          "@type": "Rating",
          ratingValue: tier === "A" ? 5 : tier === "B" ? 4 : tier === "C" ? 3 : 2,
          bestRating: 5,
          worstRating: 1,
          alternateName: tierMeta.name,
        },
      }
    : undefined;

  return (
    <>
      <SEO
        title={found ? `Verify moderation — ${data?.title ?? "video"} · Heartify` : "Verify moderation · Heartify"}
        description={
          found
            ? `Independently verifiable moderation attestation for "${data?.title}" by ${data?.channel_title}. Tier ${tier}, ${data?.reviewer_chain}.`
            : "Public attestation registry for every video approved on Heartify. Look up any video to see who reviewed it, when, and why."
        }
        path={path}
        type="article"
        jsonLd={jsonLd as Record<string, unknown> | undefined}
      />
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <Link
          to={videoId ? `/watch/${videoId}` : "/"}
          className="mb-4 inline-flex items-center gap-1 text-micro text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to video
        </Link>

        <header className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-pill bg-primary/10 px-3 py-1 text-micro font-semibold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Moderation attestation
          </div>
          <h1 className="text-hero font-bold text-foreground">Verify this video</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Every video on Heartify carries a public attestation you can look up here. This page shows the reviewer
            chain, tier, model version, and decision timeline behind this specific video — so "halal-approved" is a
            claim you can verify, not a marketing word.
          </p>
        </header>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <Card className="p-6 text-sm text-destructive">
            <AlertTriangle className="mb-2 h-5 w-5" />
            Couldn't load the attestation. Try refreshing.
          </Card>
        ) : !found ? (
          <Card className="p-6">
            <h2 className="text-heading font-semibold text-foreground">No record found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We don't have an attestation for video ID <code className="rounded bg-muted px-1">{videoId}</code>. This
              video may have been removed, is still awaiting review, or was never on Heartify.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/trust"
                className="rounded-pill border border-border px-3 py-1 text-micro font-medium hover:bg-accent"
              >
                Learn how moderation works
              </Link>
              <Link
                to="/contact"
                className="rounded-pill border border-border px-3 py-1 text-micro font-medium hover:bg-accent"
              >
                Report an issue
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Header card */}
            <Card className="p-5">
              <div className="flex gap-4">
                {data?.thumbnail_url ? (
                  <img
                    src={data.thumbnail_url}
                    alt=""
                    loading="lazy"
                    className="hidden h-24 w-40 shrink-0 rounded-card border border-border object-cover sm:block"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-micro font-semibold ${tierMeta.tone}`}>
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {tierMeta.name}
                  </span>
                  <h2 className="mt-2 line-clamp-2 text-heading font-semibold text-foreground">{data?.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">by {data?.channel_title}</p>
                  <p className="mt-3 text-sm text-foreground">{tierMeta.desc}</p>
                </div>
              </div>
            </Card>

            {/* Reviewer chain */}
            <Card className="p-5">
              <h3 className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
                Reviewer chain
              </h3>
              <p className="mt-2 text-body font-medium text-foreground">{data?.reviewer_chain}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-micro uppercase tracking-wider text-muted-foreground">State</dt>
                  <dd className="font-medium text-foreground">{data?.moderation?.state ?? "approved"}</dd>
                </div>
                <div>
                  <dt className="text-micro uppercase tracking-wider text-muted-foreground">Stage</dt>
                  <dd className="font-medium text-foreground">{data?.moderation?.stage ?? "auto_approve"}</dd>
                </div>
                <div>
                  <dt className="text-micro uppercase tracking-wider text-muted-foreground">Model</dt>
                  <dd className="font-medium text-foreground">
                    {data?.moderation?.provider ?? "heartify.rules.v1"}
                  </dd>
                </div>
                <div>
                  <dt className="text-micro uppercase tracking-wider text-muted-foreground">Confidence</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {data?.moderation?.confidence != null
                      ? Number(data.moderation.confidence).toFixed(2)
                      : data?.is_trusted_channel
                      ? "1.00"
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-micro uppercase tracking-wider text-muted-foreground">Category</dt>
                  <dd className="font-medium text-foreground">{data?.category ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-micro uppercase tracking-wider text-muted-foreground">Language</dt>
                  <dd className="font-medium text-foreground">{data?.content_language ?? "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-micro uppercase tracking-wider text-muted-foreground">Last updated</dt>
                  <dd className="font-medium text-foreground">{fmt(data?.moderation?.updated_at)}</dd>
                </div>
              </dl>
            </Card>

            {/* Timeline */}
            <Card className="p-5">
              <h3 className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
                Decision timeline
              </h3>
              {data?.timeline && data.timeline.length > 0 ? (
                <ol className="mt-3 space-y-3">
                  {data.timeline.map((t, i) => (
                    <li key={i} className="flex gap-3 border-l-2 border-primary/40 pl-3">
                      <Clock className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {t.stage} → {t.state}
                          {t.confidence != null ? (
                            <span className="ml-2 text-micro text-muted-foreground">
                              conf {Number(t.confidence).toFixed(2)}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-micro text-muted-foreground">
                          {fmt(t.created_at)} · {t.provider ?? "heartify"} · {t.actor_kind ?? "auto"}
                        </p>
                        {t.reasoning ? (
                          <p className="mt-1 text-sm text-foreground/80">{t.reasoning}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  This video was approved through the trusted-channel fast path. No per-video reasoning is recorded,
                  but every upload from{" "}
                  <span className="font-medium text-foreground">{data?.channel_title}</span> is held to the same
                  hard rules (no female visibility, no music, no haram visuals).
                </p>
              )}
            </Card>

            <CoSignatures videoId={data?.video_id} />

            {/* Attestation ledger record */}
            <Card className="p-5">
              <h3 className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
                Attestation ledger record
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Heartify keeps an append-only ledger of every review. Each record commits to the one before it, so a
                past attestation cannot be quietly rewritten. The digest below is a deterministic SHA-256 fingerprint
                you can recompute from the fields on this page.
              </p>

              {data?.ledger ? (
                <>
                  <div
                    className={`mt-3 inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-micro font-semibold ${
                      data.ledger.stale
                        ? "bg-muted text-muted-foreground"
                        : "bg-emerald-500/15 text-emerald-600"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {data.ledger.stale
                      ? "Re-review pending — new record queued"
                      : "Ledger record matches current review"}
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-micro uppercase tracking-wider text-muted-foreground">Record</dt>
                      <dd className="font-medium tabular-nums text-foreground">#{data.ledger.sequence}</dd>
                    </div>
                    <div>
                      <dt className="text-micro uppercase tracking-wider text-muted-foreground">Ledger version</dt>
                      <dd className="font-medium text-foreground">{data.ledger.ledger_version}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-micro uppercase tracking-wider text-muted-foreground">Issued</dt>
                      <dd className="font-medium text-foreground">{fmt(data.ledger.issued_at)}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No ledger record has been issued for this video yet — the digest below is computed live from the
                  current review.
                </p>
              )}

              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2 rounded-card border border-border bg-muted/30 p-3 font-mono text-micro">
                  <Hash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="mb-0.5 font-sans text-micro uppercase tracking-wider text-muted-foreground">
                      Record digest
                    </p>
                    <code className="break-all text-foreground">{data?.attestation?.digest}</code>
                  </div>
                </div>
                {data?.ledger ? (
                  <div className="flex items-start gap-2 rounded-card border border-border bg-muted/30 p-3 font-mono text-micro">
                    <Hash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="mb-0.5 font-sans text-micro uppercase tracking-wider text-muted-foreground">
                        Chain digest
                      </p>
                      <code className="break-all text-foreground">{data.ledger.chain_digest}</code>
                    </div>
                  </div>
                ) : null}
              </div>

              <p className="mt-2 text-micro text-muted-foreground">
                Algorithm: {data?.attestation?.algorithm} · {data?.attestation?.canonical_form ?? "heartify.attestation.v1"} ·{" "}
                {data?.attestation?.issuer}
              </p>
            </Card>


            {/* Report SLA */}
            <Card className="p-5">
              <h3 className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
                Something wrong with this decision?
              </h3>
              <p className="mt-2 text-sm text-foreground">
                Every report is reviewed by a human. Our public SLA is a{" "}
                <span className="font-semibold">median resolution under 24 hours</span>. If you're a creator, you can
                appeal a removal decision at any time.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to={`/watch/${data?.video_id}`}
                  className="inline-flex items-center gap-1 rounded-pill bg-primary px-3 py-1.5 text-micro font-semibold text-primary-foreground hover:opacity-90"
                >
                  Report this video
                  <ExternalLink className="h-3 w-3" />
                </Link>
                <Link
                  to="/appeals"
                  className="inline-flex items-center gap-1 rounded-pill border border-border px-3 py-1.5 text-micro font-medium hover:bg-accent"
                >
                  Appeal a decision
                </Link>
                <Link
                  to="/transparency"
                  className="inline-flex items-center gap-1 rounded-pill border border-border px-3 py-1.5 text-micro font-medium hover:bg-accent"
                >
                  Transparency report
                </Link>
                <Link
                  to="/trust"
                  className="inline-flex items-center gap-1 rounded-pill border border-border px-3 py-1.5 text-micro font-medium hover:bg-accent"
                >
                  How moderation works
                </Link>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
