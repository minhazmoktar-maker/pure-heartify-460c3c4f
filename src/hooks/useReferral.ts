import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ReferralReward {
  id: string;
  role: "inviter" | "invitee";
  reward_type: string;
  reward_value: Record<string, unknown>;
  granted_at: string;
}

/**
 * Uses server RPC `get_or_create_referral_code` so the same authenticated
 * user always gets a stable code. Never mints codes client-side.
 */
export function useReferral() {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [redeemedCount, setRedeemedCount] = useState(0);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: codeData }, { data: refs }, { data: rew }] = await Promise.all([
      supabase.rpc("get_or_create_referral_code"),
      supabase.from("referrals").select("status").eq("inviter_id", user.id),
      supabase
        .from("referral_rewards")
        .select("id,role,reward_type,reward_value,granted_at")
        .eq("user_id", user.id)
        .order("granted_at", { ascending: false })
        .limit(20),
    ]);
    setCode((codeData as string | null) ?? null);
    setRedeemedCount((refs ?? []).filter((r) => r.status === "redeemed").length);
    setRewards((rew ?? []) as ReferralReward[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const shareUrl = code ? `${window.location.origin}/signup?ref=${code}` : null;

  const copy = useCallback(async () => {
    if (!shareUrl) return false;
    try {
      await navigator.clipboard.writeText(shareUrl);
      return true;
    } catch {
      return false;
    }
  }, [shareUrl]);

  return { code, shareUrl, redeemedCount, rewards, loading, copy, refresh: load };
}
