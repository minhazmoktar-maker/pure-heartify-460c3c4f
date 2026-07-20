import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VerifiedScholar {
  id: string;
  display_name: string;
  aliases: string[] | null;
  language: string | null;
  country: string | null;
  affiliation: string | null;
  weight: number | null;
  notes: string | null;
  handles: string[] | null;
  youtube_channel_ids: string[] | null;
}

async function fetchScholars(): Promise<VerifiedScholar[]> {
  const { data, error } = await supabase
    .from("verified_scholars")
    .select("id,display_name,aliases,language,country,affiliation,weight,notes,handles,youtube_channel_ids")
    .order("weight", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as VerifiedScholar[];
}

export function useVerifiedScholars() {
  return useQuery({
    queryKey: ["verified_scholars"],
    queryFn: fetchScholars,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
