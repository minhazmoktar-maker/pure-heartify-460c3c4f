import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { linkAttributionToUser } from "@/lib/attribution";

const STORAGE_KEY = "heartify-pending-ref";
const DONE_KEY = "heartify-ref-redeemed";

/**
 * Captures ?ref=CODE from the URL into localStorage and, once the user signs in,
 * (a) calls the redeem-referral edge function exactly once, and
 * (b) links the session's first-touch attribution row to the user id.
 *
 * UTM capture happens at boot via `captureAttributionOnce` in main.tsx —
 * this component only handles the referral-redemption side effect.
 */
const ReferralBridge = () => {
  const { user } = useAuth();

  // Capture ref from URL on every mount/route change
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get("ref");
      if (ref && ref.length <= 32) {
        localStorage.setItem(STORAGE_KEY, ref.toUpperCase());
      }
    } catch {
      /* noop */
    }
  }, []);

  // Redeem + link attribution when authenticated
  useEffect(() => {
    if (!user) return;
    void linkAttributionToUser(user.id);

    if (localStorage.getItem(DONE_KEY)) return;
    const code = localStorage.getItem(STORAGE_KEY);
    if (!code) return;

    (async () => {
      try {
        await supabase.functions.invoke("redeem-referral", { body: { code } });
      } catch {
        /* swallow */
      } finally {
        localStorage.setItem(DONE_KEY, "1");
        localStorage.removeItem(STORAGE_KEY);
      }
    })();
  }, [user]);

  return null;
};

export default ReferralBridge;
