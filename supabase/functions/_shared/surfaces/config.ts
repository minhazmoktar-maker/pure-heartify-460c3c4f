// Runtime feed configuration — read from the `feed.slider_personalization`
// feature flag on every request so operators can roll back the
// slider-personalized feed or retune bucketing weights instantly, with no
// redeploy. `kill_switch = true` (or `enabled = false`) reverts to the
// legacy, non-slider assembly.

export interface FeedRuntimeConfig {
  version: string;
  /** Slider personalization active? false => legacy assembly. */
  sliderEnabled: boolean;
  /** Reason the slider is off, for the trace. */
  disabledReason: string | null;
  weights: {
    diversity_slider: number;
    novelty: number;
    affinity: number;
    freshness: number;
    cold_start_topic: number;
    cold_start_device_jitter: number;
  };
  perChannelCap: { low: number; mid: number; high: number };
  coldStart: { enabled: boolean; min_signals: number; topic_share: number };
}

export const DEFAULT_FEED_CONFIG: FeedRuntimeConfig = {
  version: "default",
  sliderEnabled: true,
  disabledReason: null,
  weights: {
    diversity_slider: 1,
    novelty: 0.35,
    affinity: 0.45,
    freshness: 0.2,
    cold_start_topic: 0.6,
    cold_start_device_jitter: 0.25,
  },
  perChannelCap: { low: 3, mid: 2, high: 1 },
  coldStart: { enabled: true, min_signals: 3, topic_share: 0.5 },
};

const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

let cached: { at: number; cfg: FeedRuntimeConfig } | null = null;
const TTL_MS = 20_000; // short so a kill-switch flip propagates within seconds

export async function loadFeedConfig(service: any): Promise<FeedRuntimeConfig> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.cfg;
  try {
    const { data, error } = await service
      .from("feature_flags")
      .select("enabled, kill_switch, targeting_rules")
      .eq("key", "feed.slider_personalization")
      .maybeSingle();
    if (error || !data) return DEFAULT_FEED_CONFIG;

    const rules = (data.targeting_rules ?? {}) as Record<string, any>;
    const w = (rules.weights ?? {}) as Record<string, unknown>;
    const cap = (rules.per_channel_cap ?? {}) as Record<string, unknown>;
    const cs = (rules.cold_start ?? {}) as Record<string, unknown>;

    const killed = data.kill_switch === true;
    const off = data.enabled === false;

    const cfg: FeedRuntimeConfig = {
      version: typeof rules.version === "string" ? rules.version : "v4",
      sliderEnabled: !killed && !off,
      disabledReason: killed ? "kill_switch" : off ? "flag_disabled" : null,
      weights: {
        diversity_slider: num(w.diversity_slider, 1),
        novelty: num(w.novelty, 0.35),
        affinity: num(w.affinity, 0.45),
        freshness: num(w.freshness, 0.2),
        cold_start_topic: num(w.cold_start_topic, 0.6),
        cold_start_device_jitter: num(w.cold_start_device_jitter, 0.25),
      },
      perChannelCap: {
        low: Math.max(1, Math.round(num(cap.low, 3))),
        mid: Math.max(1, Math.round(num(cap.mid, 2))),
        high: Math.max(1, Math.round(num(cap.high, 1))),
      },
      coldStart: {
        enabled: cs.enabled !== false,
        min_signals: Math.max(0, Math.round(num(cs.min_signals, 3))),
        topic_share: Math.min(1, Math.max(0, num(cs.topic_share, 0.5))),
      },
    };
    cached = { at: Date.now(), cfg };
    return cfg;
  } catch {
    return DEFAULT_FEED_CONFIG;
  }
}
