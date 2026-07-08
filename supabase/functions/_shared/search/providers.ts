/**
 * Provider registry. Add Meilisearch/Typesense/OpenSearch adapters here.
 * Config is env-driven (SEARCH_PROVIDER) so we can flip backends without redeploying clients.
 *
 * Example future adapters (stubs):
 *   - MeilisearchSearchProvider  (index name `curated_videos`)
 *   - TypesenseSearchProvider    (collection `curated_videos`)
 *   - OpenSearchSearchProvider   (index `curated_videos`)
 *
 * Each must implement SearchProvider so ranking/pagination stays consistent.
 */
import type { SearchProvider } from "./types.ts";
import { PostgresSearchProvider } from "./postgres.ts";

export function getSearchProvider(): SearchProvider {
  const name = (Deno.env.get("SEARCH_PROVIDER") ?? "postgres").toLowerCase();
  switch (name) {
    // case "meilisearch": return new MeilisearchSearchProvider();
    // case "typesense":   return new TypesenseSearchProvider();
    // case "opensearch":  return new OpenSearchSearchProvider();
    case "postgres":
    default:
      return new PostgresSearchProvider();
  }
}
