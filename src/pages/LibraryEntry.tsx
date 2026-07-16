import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";
import libraryData from "@/data/library.json";
import NotFound from "./NotFound";

type Entry = {
  slug: string;
  title: string;
  description: string;
  category: string;
  sections: string[];
  legacyPath: string;
};

const ENTRIES = libraryData as Entry[];

export default function LibraryEntry() {
  const { slug } = useParams<{ slug: string }>();
  const entry = ENTRIES.find((e) => e.slug === slug);
  if (!entry) return <NotFound />;

  return (
    <div className="min-h-dvh bg-background">
      <SEO title={entry.title} description={entry.description} path={`/library/${entry.slug}`} />
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/library">
            <Button variant="ghost" size="icon" aria-label="Back to library">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="text-title font-bold">{entry.title}</h1>
        </div>
      </div>
      <article className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <Badge variant="secondary">{entry.category}</Badge>
        {entry.description && (
          <p className="text-muted-foreground text-heading">{entry.description}</p>
        )}
        <div className="space-y-3">
          {entry.sections.map((s, i) => (
            <Card key={i} className="p-4">
              <p>{s}</p>
            </Card>
          ))}
        </div>
      </article>
    </div>
  );
}
