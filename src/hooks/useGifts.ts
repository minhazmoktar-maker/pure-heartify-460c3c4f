import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { track } from "@/lib/analytics";

export interface GiftRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  kind: "streak_freeze" | "premium_month";
  months: number | null;
  note: string | null;
  status: string;
  created_at: string;
}

export function useGifts() {
  const { user } = useAuth();
  const [sent, setSent] = useState<GiftRow[]>([]);
  const [received, setReceived] = useState<GiftRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from("gifts").select("*").eq("sender_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("gifts").select("*").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setSent((s ?? []) as GiftRow[]);
    setReceived((r ?? []) as GiftRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const giftFreeze = useCallback(async (recipientId: string, note?: string) => {
    const { data, error } = await supabase.rpc("gift_streak_freeze", {
      _recipient: recipientId,
      _note: note ?? null,
    });
    if (error) throw error;
    await track("gift.streak_freeze.sent", { recipient_id: recipientId });
    await load();
    return data;
  }, [load]);

  const giftPremium = useCallback(async (recipientId: string, months: number, note?: string) => {
    const { data, error } = await supabase.rpc("gift_premium_month", {
      _recipient: recipientId,
      _months: months,
      _note: note ?? null,
    });
    if (error) throw error;
    await track("gift.premium_month.sent", { recipient_id: recipientId, months });
    await load();
    return data;
  }, [load]);

  return { sent, received, loading, refresh: load, giftFreeze, giftPremium };
}
