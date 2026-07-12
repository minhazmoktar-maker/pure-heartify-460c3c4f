import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SESSION_FLAG = "heartify:onboarding-checked";

/**
 * First-run redirect: after auth, if the user has no `user_interests` row,
 * push them to /onboarding once per session. Skips admin, auth, and
 * onboarding routes to avoid loops.
 */
export function useFirstRunOnboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const checked = useRef(false);

  useEffect(() => {
    if (loading || !user || checked.current) return;
    if (sessionStorage.getItem(SESSION_FLAG) === user.id) return;
    if (
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/auth")
    ) {
      return;
    }
    checked.current = true;
    (async () => {
      const { data, error } = await supabase
        .from("user_interests")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      sessionStorage.setItem(SESSION_FLAG, user.id);
      if (!error && !data) navigate("/onboarding", { replace: true });
    })();
  }, [user, loading, pathname, navigate]);
}
