// Shared types for the per-surface assembly pipeline.
// Every retriever must return SurfaceVideo[] shaped identically so the
// client can render any surface with the same card component.

export interface SurfaceVideo {
  video_id: string;
  title: string;
  channel_id: string | null;
  channel_title: string | null;
  thumbnail_url: string | null;
  category: string | null;
  section_id: string | null;
  published_at: string | null;
  ingested_at: string | null;
  halal_score: number | null;
  view_count: number | null;
  is_trusted_channel: boolean | null;
  is_premium_only: boolean | null;
  content_language: string | null;
  visual_state?: string | null;
  // Wave M2 — Beneficial Intelligence Engine.
  // Present on rows returned by pool_beneficial_v1 so the UI can explain
  // WHY a video was recommended ("Because you learn Fiqh", "Trusted source"…).
  // Optional so legacy retrievers stay wire-compatible.
  reason?: string | null;
  benefit_score?: number | null;
}

// Every surface declares its guarantees up front. The runtime enforces
// them via `enforceContract` and reports actuals in the response meta.
export interface SurfaceContract {
  name: string;
  minItems: number;
  maxItems: number;
  maxPerChannel: number;
  minDistinctChannels: number;
  minDistinctCategories?: number;
  minDistinctLanguages?: number;
  maxTopLanguageShare?: number; // 0..1
  minFreshShare?: number; // fraction of items with published_at < N days
  freshWindowDays?: number;
  requiresAuth?: boolean;
  anonAllowed?: boolean;
}

export interface SurfaceContext {
  userId: string | null;
  sessionId: string;
  isPremium: boolean;
  contentLanguages: string[];
  /** Strict Halal mode (default true) — enables tier-2 text blocking. */
  strictHalal?: boolean;
  kidsMode: boolean;

  blockedChannels: Set<string>;
  hiddenVideos: Set<string>;
  supabase: any;
  service: any;
  /** 0..100 content-diversity slider (Profile > Preferences). */
  diversityLevel?: number;
  /** Coarse device class: phone | tablet | desktop. */
  deviceClass?: string;
  /** Coarse browser family: chrome | safari | firefox | other. */
  browser?: string;
  /** Recently played topics/categories reported by the client. */
  recentTopics?: string[];
  /** Runtime config resolved from the feature flag. */
  config?: any;
  /** Retrieval decision log — surfaced in the admin per-user trace view. */
  trace?: { step: string; detail?: Record<string, unknown> }[];
}

/** Append a retrieval decision to the request trace (no-op if absent). */
export function traceStep(
  ctx: SurfaceContext,
  step: string,
  detail?: Record<string, unknown>,
): void {
  if (ctx.trace && ctx.trace.length < 40) ctx.trace.push({ step, detail });
}

export interface SurfaceResponse {
  surface: string;
  items: SurfaceVideo[];
  meta: {
    took_ms: number;
    pool_size: number;
    guarantees: {
      minItems: boolean;
      maxPerChannel: boolean;
      distinctChannels: boolean;
      distinctCategories?: boolean;
      distinctLanguages?: boolean;
      topLanguageShare?: boolean;
      freshShare?: boolean;
    };
    stats: {
      distinctChannels: number;
      distinctCategories: number;
      distinctLanguages: number;
      topLanguageShare: number;
      freshShare: number;
    };
    source: string;
    /** Per-request diversity parameters + retrieval decisions (admin trace). */
    trace?: Record<string, unknown>;
  };
}
