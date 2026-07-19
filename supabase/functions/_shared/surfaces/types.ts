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
  kidsMode: boolean;
  blockedChannels: Set<string>;
  hiddenVideos: Set<string>;
  supabase: any;
  service: any;
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
  };
}
