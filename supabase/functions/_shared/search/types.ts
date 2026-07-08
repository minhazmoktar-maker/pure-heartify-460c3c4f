/**
 * Search provider interface — swap Postgres for Meilisearch/Typesense/OpenSearch
 * without touching the edge function or client. All providers must implement
 * this shape so ranking, filtering, and pagination behavior stay consistent.
 */
export type MatchType = "fulltext" | "fuzzy" | "related" | "semantic" | "browse";

export interface SearchHit {
  id: string;
  title: string;
  channelTitle: string;
  category: string;
  thumbnailUrl: string;
  halalScore: number;
  publishedAt: string;
  isTrustedChannel: boolean;
  rank: number;
  matchType: MatchType;
}

export interface SearchQuery {
  q: string;
  category?: string | null;
  channel?: string | null;
  limit?: number;
  offset?: number;
  userId?: string | null;
  /** Optional AI-detected intent (topic, entities, category, channel hint). */
  intent?: SearchIntent | null;
}

export interface SearchIntent {
  topic?: string;
  category?: string;
  channel?: string;
  entities?: string[];
  rewrittenQuery?: string;
  language?: string;
}

export interface AutocompleteHit {
  suggestion: string;
  kind: "title" | "channel" | "history" | "trending";
}

export interface SearchProvider {
  readonly name: string;
  search(q: SearchQuery): Promise<SearchHit[]>;
  autocomplete(prefix: string, limit?: number): Promise<AutocompleteHit[]>;
}
