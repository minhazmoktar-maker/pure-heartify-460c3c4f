import { useQuery } from "@tanstack/react-query";
import { Sprout } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  video_id: string;
  responses: number;
  worth_it_rate: number;
  acted_on_rate: number;
}

/**
 * Public benefit signal for a single video — the T+90 answer of people who
 * watched it and were asked, weeks later, whether it was worth their time.
 *
 * This is Heartify's north-star metric made visible: benefit per minute, not
 * views. It renders nothing until at least 5 people have answered (the RPC
 * enforces that k-anonymity floor server-side), so an early or thinly-labelled
 * video simply shows no claim rather than a misleading one.
 */
export default function BenefitSignal({ videoId }: { videoId?: string | null }) {
  const { data } = useQuery({
    queryKey: ["benefit-signal", videoId],
    enabled: Boolean(videoId),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Row | null> => {
      const { data, error } = await supabase.rpc("video_benefit_signal", {
        _video_ids: [videoId as string],
      });
      if (error) throw error;
      const rows = (data as unknown as Row[]) ?? [];
      return rows[0] ?? null;
    },
  });

  if (!data || !data.responses) return null;

  const pct = Math.round((Number(data.worth_it_rate) || 0) * 100);
  const acted = Math.round((Number(data.acted_on_rate) || 0) * 100);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-pill border border-primary/30 bg-primary/5 px-2.5 py-1 text-micro font-medium text-foreground"
      title={`Asked weeks after watching: ${pct}% said it was worth their time${
        acted > 0 ? `, ${acted}% acted on it` : ""
      }. Based on ${data.responses} answers.`}
    >
      <Sprout className="h-3 w-3 text-primary" aria-hidden />
      {pct}% found this beneficial
      <span className="text-muted-foreground">· {data.responses} looked back</span>
    </span>
  );
}
