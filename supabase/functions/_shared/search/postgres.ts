/**
 * Default provider: Postgres full-text + pg_trgm (public.search_videos RPC).
 * Keep provider logic thin — ranking lives in SQL so we can port it 1:1 to
 * Meilisearch/Typesense/OpenSearch by translating the ranking expression.
 */
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { AutocompleteHit, SearchHit, SearchProvider, SearchQuery } from "./types.ts";

export class PostgresSearchProvider implements SearchProvider {
  readonly name = "postgres";
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client =
      client ??
      createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
  }

  async search(q: SearchQuery): Promise<SearchHit[]> {
    const effectiveQuery = q.intent?.rewrittenQuery?.trim() || q.q;
    const { data, error } = await this.client.rpc("search_videos", {
      _query: effectiveQuery,
      _category: q.intent?.category ?? q.category ?? null,
      _channel: q.intent?.channel ?? q.channel ?? null,
      _limit: q.limit ?? 40,
      _offset: q.offset ?? 0,
    });
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.video_id),
      title: String(r.title ?? ""),
      channelTitle: String(r.channel_title ?? ""),
      category: String(r.category ?? "All"),
      thumbnailUrl: String(r.thumbnail_url ?? ""),
      halalScore: Number(r.halal_score ?? 0),
      publishedAt: String(r.published_at ?? new Date().toISOString()),
      isTrustedChannel: Boolean(r.is_trusted_channel),
      rank: Number(r.rank ?? 0),
      matchType: (r.match_type as SearchHit["matchType"]) ?? "related",
    }));
  }

  async autocomplete(prefix: string, limit = 8): Promise<AutocompleteHit[]> {
    const { data, error } = await this.client.rpc("search_autocomplete", {
      _prefix: prefix,
      _limit: limit,
    });
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => ({
      suggestion: String(r.suggestion),
      kind: (r.kind as AutocompleteHit["kind"]) ?? "title",
    }));
  }
}
