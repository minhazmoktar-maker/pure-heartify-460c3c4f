import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DhikrCircle {
  id: string;
  host_user_id: string;
  title: string;
  phrase: string;
  target_count: number;
  current_count: number;
  is_active: boolean;
  ends_at: string | null;
  created_at: string;
}

export function useDhikrCircles() {
  const [circles, setCircles] = useState<DhikrCircle[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dhikr_circles")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    setCircles((data ?? []) as DhikrCircle[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("dhikr_circles_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dhikr_circles" },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { circles, loading, refresh };
}

export async function createDhikrCircle(input: {
  title: string;
  phrase: string;
  target_count: number;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in required");
  const { data, error } = await supabase
    .from("dhikr_circles")
    .insert({
      host_user_id: auth.user.id,
      title: input.title,
      phrase: input.phrase,
      target_count: input.target_count,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as DhikrCircle;
}

export async function contributeToDhikrCircle(circleId: string, count: number) {
  const { data, error } = await supabase.rpc("contribute_to_dhikr_circle", {
    _circle_id: circleId,
    _count: count,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function endDhikrCircle(circleId: string) {
  const { error } = await supabase.rpc("end_dhikr_circle", { _circle_id: circleId });
  if (error) throw error;
}
