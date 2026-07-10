import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Household {
  id: string;
  owner_id: string;
  name: string;
  plan: string;
  seat_limit: number;
}
export interface HouseholdMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
}
export interface SeatInvite {
  id: string;
  invited_email: string;
  status: string;
  expires_at: string;
  token: string;
}

/**
 * Family-seat view for the current user. Returns the household the caller
 * owns OR belongs to, plus members and pending invites (owner-only).
 * All mutations still go through RLS — this hook is a thin read helper.
 */
export function useHousehold() {
  const { user, loading: authLoading } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [invites, setInvites] = useState<SeatInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setHousehold(null); setMembers([]); setInvites([]); setLoading(false); return; }
    setLoading(true);
    // Owned first, then member-of.
    const { data: owned } = await supabase
      .from("plus_households")
      .select("id, owner_id, name, plan, seat_limit")
      .eq("owner_id", user.id)
      .maybeSingle();
    let hh: Household | null = owned ?? null;
    if (!hh) {
      const { data: mem } = await supabase
        .from("plus_household_members")
        .select("household_id, plus_households!inner(id, owner_id, name, plan, seat_limit)")
        .eq("user_id", user.id)
        .maybeSingle();
      hh = (mem as unknown as { plus_households: Household } | null)?.plus_households ?? null;
    }
    setHousehold(hh);
    if (hh) {
      const { data: mem } = await supabase
        .from("plus_household_members")
        .select("id, user_id, role, joined_at")
        .eq("household_id", hh.id);
      setMembers(mem ?? []);
      if (hh.owner_id === user.id) {
        const { data: inv } = await supabase
          .from("plus_seat_invites")
          .select("id, invited_email, status, expires_at, token")
          .eq("household_id", hh.id)
          .eq("status", "pending");
        setInvites(inv ?? []);
      } else {
        setInvites([]);
      }
    } else {
      setMembers([]); setInvites([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (!authLoading) void refresh(); }, [authLoading, refresh]);

  return { household, members, invites, loading, refresh };
}
