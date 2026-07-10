import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import Leaderboard from "@/components/Leaderboard";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { Trophy } from "lucide-react";

export default function Leaderboards() {
  const enabled = useFeatureFlag("viral.leaderboards", true);
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Leaderboards — Heartify"
        description="Global rankings for streaks and Quran juz completions on Heartify."
        path="/leaderboards"
      />
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Trophy className="h-7 w-7 text-amber-500" /> Leaderboards
          </h1>
          <p className="mt-1 text-muted-foreground">
            Friendly competition to encourage consistency. Rankings refresh hourly.
          </p>
        </header>
        {enabled ? (
          <Leaderboard scope="global" />
        ) : (
          <p className="text-muted-foreground">Leaderboards are temporarily disabled.</p>
        )}
      </main>
    </div>
  );
}
