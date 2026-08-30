import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCertificates } from "@/hooks/useBenefitDigest";

export default function Certificates() {
  const { user } = useAuth();
  const { data, isLoading } = useMyCertificates(Boolean(user));
  const certs = data ?? [];

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="My learning certificates — Heartify"
        description="Certificates earned for completing Heartify learning paths, each with a public verification code."
        path="/certificates"
      />
      <Navbar />
      <main className="mx-auto max-w-[720px] px-4 pb-28 pt-6 md:px-6 md:pt-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Certificates
        </h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Complete every step of a learning path to earn a verifiable certificate.
        </p>

        {!user ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              <Link to="/auth" className="underline">
                Sign in
              </Link>{" "}
              to see your certificates.
            </p>
          </div>
        ) : isLoading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : certs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
            <Award className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm text-muted-foreground">
              No certificates yet.{" "}
              <Link to="/learn" className="underline">
                Pick a learning path
              </Link>{" "}
              and finish it.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {certs.map((c) => (
              <li key={c.code}>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <Award className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold text-foreground">{c.path_title}</h2>
                      <p className="mt-1 text-micro text-muted-foreground">
                        {c.concepts_completed} concepts · issued{" "}
                        {new Date(c.issued_at).toLocaleDateString()}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <code className="rounded-full bg-muted px-3 py-1 text-sm text-foreground">
                          {c.code}
                        </code>
                        <button
                          type="button"
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground"
                          onClick={() => {
                            navigator.clipboard
                              ?.writeText(`${window.location.origin}/certificate/${c.code}`)
                              .then(() => toast.success("Verification link copied"))
                              .catch(() => toast.error("Could not copy"));
                          }}
                        >
                          <Copy className="h-4 w-4" aria-hidden />
                          Copy link
                        </button>
                        <Link
                          to={`/certificate/${c.code}`}
                          className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
