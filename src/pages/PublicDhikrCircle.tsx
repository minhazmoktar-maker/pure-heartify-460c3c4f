import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { Sparkles, Users } from "lucide-react";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { contributeToDhikrCircle } from "@/hooks/useDhikrCircles";
import { toast } from "sonner";

interface PublicCircle {
  id: string;
  title: string;
  phrase: string;
  target_count: number;
  current_count: number;
  is_active: boolean;
  ends_at: string | null;
  created_at: string;
  member_count: number;
  top_contributors: Array<{ name: string; handle: string | null; contribution: number }>;
}

export default function PublicDhikrCircle() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [circle, setCircle] = useState<PublicCircle | null>(null);
  const [loading, setLoading] = useState(true);
  const [contributing, setContributing] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data, error } = await supabase.rpc("get_public_dhikr_circle", { _circle_id: id });
    if (error) {
      toast.error(error.message);
    }
    const row = (Array.isArray(data) ? data[0] : data) as unknown;
    setCircle((row as PublicCircle) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const contribute = async (n: number) => {
    if (!id) return;
    setContributing(true);
    try {
      await contributeToDhikrCircle(id, n);
      toast.success(`+${n}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setContributing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-background">
        <PageSkeleton variant="detail" className="max-w-lg" />
      </div>
    );
  }

  if (!circle) {
    return (
      <main className="container mx-auto max-w-lg px-4 py-16">
        <EmptyState
          icon={Sparkles}
          title="Circle not found"
          description="This dhikr circle may have been removed or closed by its organiser. Explore public circles to join one that's active."
          actionLabel="Browse circles"
          actionHref="/dhikr/circles"
        />
      </main>
    );
  }

  const pct = Math.min(
    100,
    Math.round((Number(circle.current_count) / circle.target_count) * 100)
  );

  return (
    <>
      <SEO
        type="article"
        title={`${circle.title} — Dhikr Circle · Heartify`}
        description={`Join ${circle.member_count} others reciting ${circle.phrase}. ${circle.current_count.toLocaleString()} of ${circle.target_count.toLocaleString()} completed.`}
        path={`/c/${id}`}
      />
      <main className="container mx-auto max-w-2xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {circle.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{circle.phrase}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={pct} />
            <div className="flex items-center justify-between text-sm">
              <span className="tabular-nums">
                {Number(circle.current_count).toLocaleString()} /{" "}
                {circle.target_count.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {circle.member_count} members
              </span>
            </div>

            {!circle.is_active && (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                This circle has ended. Alhamdulillah.
              </p>
            )}

            {user ? (
              circle.is_active && (
                <div className="flex flex-wrap gap-2">
                  {[1, 10, 33, 100].map((n) => (
                    <Button
                      key={n}
                      size="sm"
                      variant="secondary"
                      disabled={contributing}
                      onClick={() => contribute(n)}
                    >
                      +{n}
                    </Button>
                  ))}
                </div>
              )
            ) : (
              <div className="rounded-md border p-4 text-center">
                <p className="mb-3 text-sm">
                  Sign in to contribute to this circle.
                </p>
                <div className="flex justify-center gap-2">
                  <Button asChild>
                    <Link to={`/signup?next=/c/${circle.id}`}>Join Heartify</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={`/login?next=/c/${circle.id}`}>Sign in</Link>
                  </Button>
                </div>
              </div>
            )}

            {circle.top_contributors.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-medium">Top contributors</h2>
                <ul className="space-y-1 text-sm">
                  {circle.top_contributors.map((c, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        {c.handle ? (
                          <Link to={`/u/${c.handle}`} className="hover:underline">
                            @{c.handle}
                          </Link>
                        ) : (
                          c.name
                        )}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {Number(c.contribution).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
