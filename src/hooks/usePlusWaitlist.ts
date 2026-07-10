import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PreferredTier = "plus" | "family" | "lifetime";

export interface WaitlistPayload {
  email: string;
  preferredTier: PreferredTier;
  countryCode?: string | null;
  interestedFeatures?: string[];
  source?: string;
}

/**
 * Client hook for the Heartify+ waitlist. Wraps the RLS-guarded
 * `plus_waitlist` table. Anyone (signed-in or anon) can join once per email.
 */
export function usePlusWaitlist() {
  const { user } = useAuth();
  const [alreadyOnList, setAlreadyOnList] = useState(false);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    if (!user) {
      setAlreadyOnList(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    const { data, error } = await supabase
      .from("plus_waitlist")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    setAlreadyOnList(!error && !!data && data.length > 0);
    setChecking(false);
  }, [user]);

  useEffect(() => {
    void check();
  }, [check]);

  const join = useCallback(
    async (payload: WaitlistPayload): Promise<{ ok: boolean; error?: string }> => {
      const email = payload.email.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return { ok: false, error: "Please enter a valid email address." };
      }
      const { error } = await supabase.from("plus_waitlist").insert({
        user_id: user?.id ?? null,
        email,
        preferred_tier: payload.preferredTier,
        country_code: payload.countryCode ?? null,
        interested_features: payload.interestedFeatures ?? [],
        source: payload.source ?? "plus_page",
      });
      if (error) {
        // Unique-index violation on lower(email) → already joined
        if (
          error.code === "23505" ||
          /duplicate key|already/i.test(error.message)
        ) {
          setAlreadyOnList(true);
          return { ok: true };
        }
        return { ok: false, error: error.message };
      }
      setAlreadyOnList(true);
      return { ok: true };
    },
    [user],
  );

  return { alreadyOnList, checking, join, refresh: check };
}
