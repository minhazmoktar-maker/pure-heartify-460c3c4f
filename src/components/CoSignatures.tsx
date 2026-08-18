import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export type CoSignature = {
  institution: string;
  slug: string;
  org_type: string | null;
  country: string | null;
  website: string | null;
  logo_url: string | null;
  statement: string | null;
  algorithm: string;
  signature: string;
  chain_digest: string;
  signed_at: string;
  binds_current_ledger: boolean;
};

export function useCoSignatures(videoId: string | undefined) {
  return useQuery({
    queryKey: ["cosignatures", videoId],
    enabled: Boolean(videoId),
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<CoSignature[]> => {
      const { data, error } = await supabase.rpc("get_video_cosignatures" as never, {
        _video_id: videoId,
      } as never);
      if (error) throw error;
      return (data as unknown as CoSignature[]) ?? [];
    },
  });
}

/** Compact inline badge for cards / headers. */
export function CoSignedBadge({ count }: { count: number }) {
  if (count < 1) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-500/15 px-2 py-0.5 text-micro font-semibold text-emerald-600">
      <BadgeCheck className="h-3 w-3" aria-hidden />
      Co-signed by {count} institution{count === 1 ? "" : "s"}
    </span>
  );
}

/**
 * Institutional co-signatures for a video's attestation. Each partner signs the
 * ledger chain digest with its own key, so the badge is independent evidence —
 * not Heartify vouching for itself.
 */
export default function CoSignatures({ videoId }: { videoId: string | undefined }) {
  const { data, isLoading } = useCoSignatures(videoId);
  const rows = data ?? [];
  if (isLoading || rows.length === 0) return null;

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
        Independently co-signed
      </h2>
      <p className="mt-1 text-caption text-muted-foreground">
        These institutions reviewed this record and signed Heartify's ledger digest with their own
        keys. Anyone can re-check a signature against the digest below.
      </p>

      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={`${r.slug}-${r.signed_at}`} className="rounded-card border border-border p-3">
            <div className="flex items-start gap-3">
              {r.logo_url ? (
                <img
                  src={r.logo_url}
                  alt=""
                  width={32}
                  height={32}
                  loading="lazy"
                  className="h-8 w-8 shrink-0 rounded-md object-contain"
                />
              ) : (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-micro font-semibold text-muted-foreground">
                  {r.institution.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                  {r.website ? (
                    <a
                      href={r.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline underline-offset-2"
                    >
                      {r.institution}
                    </a>
                  ) : (
                    r.institution
                  )}
                  {r.binds_current_ledger ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-500/15 px-2 py-0.5 text-micro font-semibold text-emerald-600">
                      <BadgeCheck className="h-3 w-3" aria-hidden />
                      Signature valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-amber-500/15 px-2 py-0.5 text-micro font-semibold text-amber-600">
                      <AlertTriangle className="h-3 w-3" aria-hidden />
                      Signed an earlier record
                    </span>
                  )}
                </p>
                <p className="text-micro text-muted-foreground">
                  {[r.org_type, r.country].filter(Boolean).join(" · ")}
                  {r.org_type || r.country ? " · " : ""}
                  signed {new Date(r.signed_at).toLocaleDateString()}
                </p>
                {r.statement && (
                  <p className="mt-1 text-caption text-muted-foreground">“{r.statement}”</p>
                )}
                <p className="mt-2 break-all font-mono text-micro text-muted-foreground">
                  {r.algorithm}: {r.signature.slice(0, 32)}…
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
