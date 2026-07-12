/**
 * useRecommendations — thin client for the /recommendations edge function.
 * Recommendation logic (signals, scoring, diversification, explanations)
 * lives entirely server-side so we can swap in embeddings/ML providers
 * without redeploying the frontend.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { growth } from "@/lib/growthEvents";

export interface RecommendationReason {
  code: string;
  weight: number;
  detail?: string;
}


export interface RecommendedVideo {
  video: {
    video_id: string;
    title: string;
    channel_title: string | null;
    category: string | null;
    thumbnail_url: string | null;
    halal_score: number | null;
    published_at: string | null;
    is_trusted_channel: boolean | null;
  };
  score: number;
  reasons: RecommendationReason[];
  signals: Record<string, number>;
}

export interface RecommendationsPayload {
  recommendations: RecommendedVideo[];
  provider: string;
  generatedAt: string;
  signalsSummary?: Record<string, unknown>;
}

interface Options {
  surface?: string;
  categoryFilter?: string | null;
  limit?: number;
  enabled?: boolean;
}

const SESSION_KEY = "heartify-rec-session";
function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function useRecommendations(opts: Options = {}) {
  const surface = opts.surface ?? "home";
  const limit = opts.limit ?? 24;
  return useQuery({
    queryKey: ["recommendations", surface, opts.categoryFilter ?? null, limit],
    enabled: opts.enabled !== false,
    staleTime: 60_000,
    queryFn: async (): Promise<RecommendationsPayload> => {
      const { data, error } = await supabase.functions.invoke("recommendations", {
        body: {
          surface,
          categoryFilter: opts.categoryFilter ?? null,
          limit,
          sessionId: sessionId(),
        },
      });
      if (error) throw error;
      return data as RecommendationsPayload;
    },
  });
}

/** Fire-and-forget client-side event logger (click/dismiss/convert). */
export async function logRecommendationEvent(input: {
  videoId: string;
  eventType: "click" | "dismiss" | "convert";
  surface?: string;
  score?: number;
  reasons?: RecommendationReason[];
  provider?: string;
}) {
  const surface = input.surface ?? "home";
  if (input.eventType === "click") growth.recommendationClicked(input.videoId, surface, 0);
  else if (input.eventType === "dismiss") growth.recommendationDismissed(input.videoId, surface);
  try {
    await supabase.functions.invoke("recommendations/event", {
      body: {
        videoId: input.videoId,
        eventType: input.eventType,
        surface: input.surface ?? "home",
        score: input.score,
        reasons: input.reasons,
        provider: input.provider,
        sessionId: sessionId(),
      },
    });
  } catch {
    /* best-effort */
  }
}
