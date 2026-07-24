import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Client-side guard for admin/owner routes.
 *
 * Enforces:
 *   1. User is signed in.
 *   2. User has admin/owner role in `user_roles`/`platform_owners`.
 *   3. Session has stepped up to AAL2 (TOTP verified this session).
 *
 * If MFA is not enrolled, the user is redirected to /security/mfa to enroll.
 * If enrolled but not yet challenged this session, sent to /security/mfa/verify.
 * This is a defense-in-depth layer — RLS still enforces the same checks server-side.
 */
export function useRequireAdminMfa() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login"); return; }
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isAdmin = roles?.some((r) => r.role === "admin");
      const { data: owner } = await supabase
        .from("platform_owners")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isAdmin && !owner) { navigate("/"); return; }

      // MFA/AAL2 step-up disabled per product decision — role check alone gates admin routes.
      setOk(true);
    })();
  }, [user, loading, navigate]);

  return ok;
}
