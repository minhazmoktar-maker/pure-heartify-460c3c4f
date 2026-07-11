import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import Leaderboard from "@/components/Leaderboard";
import SectionHeader from "@/components/SectionHeader";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { Trophy } from "lucide-react";

export default function Leaderboards() {
  const enabled = useFeatureFlag("viral.leaderboards", true);
  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Leaderboards — Heartify"
        description="Global rankings for streaks and Quran juz completions on Heartify."
        path="/leaderboards"
      />
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <SectionHeader
          title="Leaderboards"
          description="Friendly competition to encourage consistency. Rankings refresh hourly."
          icon={Trophy}
          className="mb-6"
        />
        {enabled ? (
          <Leaderboard scope="global" />
        ) : (
          <p className="text-muted-foreground">Leaderboards are temporarily disabled.</p>
        )}
      </main>
    </div>
  );
}

