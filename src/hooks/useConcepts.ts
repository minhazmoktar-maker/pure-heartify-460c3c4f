import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ConceptSummary {
  slug: string;
  title: string;
  arabic_term: string | null;
  domain: string;
  level: number;
  summary: string | null;
}

export interface ConceptSegment {
  video_id: string;
  title: string | null;
  channel_title: string | null;
  thumbnail_url: string | null;
  content_language: string | null;
  start_seconds: number | null;
  end_seconds: number | null;
  role: string | null;
  confidence: number | null;
}

export interface ConceptEdge {
  slug: string;
  title: string;
  domain: string;
  level: number;
  strength?: number | null;
  note?: string | null;
}

export interface ConceptDetail {
  concept: ConceptSummary & { id: string };
  prerequisites: ConceptEdge[];
  unlocks: ConceptEdge[];
  segments: ConceptSegment[];
}

/** All published concepts, grouped client-side by domain. */
export function useConceptCatalog() {
  return useQuery({
    queryKey: ["concept-catalog"],
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async (): Promise<ConceptSummary[]> => {
      const { data, error } = await supabase
        .from("concepts")
        .select("slug,title,arabic_term,domain,level,summary")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as ConceptSummary[];
    },
  });
}

/** Full graph node: concept + prerequisites + unlocks + video segments. */
export function useConcept(slug: string | undefined) {
  return useQuery({
    queryKey: ["concept", slug],
    enabled: Boolean(slug),
    staleTime: 15 * 60 * 1000,
    queryFn: async (): Promise<ConceptDetail | null> => {
      const { data, error } = await supabase.rpc("get_concept", { _slug: slug });
      if (error) throw error;
      return (data as unknown as ConceptDetail | null) ?? null;
    },
  });
}

export function groupByDomain(concepts: ConceptSummary[]) {
  const map = new Map<string, ConceptSummary[]>();
  concepts.forEach((c) => {
    const list = map.get(c.domain) ?? [];
    list.push(c);
    map.set(c.domain, list);
  });
  return Array.from(map.entries());
}
