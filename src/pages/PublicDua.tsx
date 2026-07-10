import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Heart, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PublicDua {
  id: string;
  body: string;
  is_anonymous: boolean;
  ameen_count: number;
  created_at: string;
  author_handle: string | null;
}

export default function PublicDuaPage() {
  const { id } = useParams<{ id: string }>();
  const [dua, setDua] = useState<PublicDua | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data, error } = await supabase.rpc("get_public_dua", { _id: id });
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setNotFound(true);
      } else {
        setDua(Array.isArray(data) ? (data[0] as PublicDua) : (data as PublicDua));
      }
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={dua ? `A du'a on Heartify — say Āmīn` : "Du'a — Heartify"}
        description={dua ? dua.body.slice(0, 150) : "Community du'a on Heartify."}
        path={`/d/${id ?? ""}`}
      />
      <main className="container mx-auto max-w-xl px-4 py-16">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notFound || !dua ? (
          <Card className="p-8 text-center space-y-4">
            <h1 className="text-lg font-semibold">Du'a not found</h1>
            <p className="text-sm text-muted-foreground">
              It may have been removed. Explore the community wall instead.
            </p>
            <Button asChild>
              <Link to="/dua-wall">Open Du'a Wall</Link>
            </Button>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-6 py-8">
              <p className="whitespace-pre-wrap text-lg leading-relaxed text-foreground">
                {dua.body}
              </p>
              <div className="flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
                <span>
                  {dua.is_anonymous
                    ? "Anonymous"
                    : dua.author_handle
                    ? `@${dua.author_handle}`
                    : "Community member"}{" "}
                  · {formatDistanceToNow(new Date(dua.created_at), { addSuffix: true })}
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Heart className="h-4 w-4 fill-primary text-primary" aria-hidden />
                  {dua.ameen_count}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild className="flex-1">
                  <Link to="/dua-wall">Say Āmīn on Heartify</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/signup">Join Heartify</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
