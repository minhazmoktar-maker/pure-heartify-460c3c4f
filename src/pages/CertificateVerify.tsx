import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, ShieldCheck, ShieldX } from "lucide-react";
import { useVerifyCertificate } from "@/hooks/useBenefitDigest";

export default function CertificateVerify() {
  const { code } = useParams<{ code: string }>();
  const { data, isLoading } = useVerifyCertificate(code);

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`Verify certificate ${code ?? ""} — Heartify`}
        description="Public verification for a Heartify learning-path certificate."
        path={`/certificate/${code ?? ""}`}
        noindex
      />
      <Navbar />
      <main className="mx-auto max-w-[640px] px-4 pb-28 pt-6 md:px-6 md:pt-10">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Certificate verification
        </h1>

        {isLoading ? (
          <Skeleton className="mt-6 h-48 w-full rounded-2xl" />
        ) : !data ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
            <ShieldX className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm text-muted-foreground">
              No certificate matches the code <code className="font-mono">{code}</code>.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-card p-6 text-center">
            <Award className="mx-auto h-8 w-8 text-primary" aria-hidden />
            <p className="mt-4 text-sm text-muted-foreground">This certifies that</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {data.recipient_name ?? "A Heartify learner"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">completed the learning path</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{data.path_title}</p>
            <p className="mt-3 text-micro text-muted-foreground">
              {data.concepts_completed} concepts · issued{" "}
              {new Date(data.issued_at).toLocaleDateString()}
            </p>
            <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-micro font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Verified · {data.code}
            </p>
          </div>
        )}

        <Link
          to="/learn"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground"
        >
          Explore Heartify learning paths
        </Link>
      </main>
    </div>
  );
}
