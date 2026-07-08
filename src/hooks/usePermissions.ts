import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import {
  ANONYMOUS,
  can as _can,
  canAll as _canAll,
  canAny as _canAny,
  hasMinRole as _hasMinRole,
  type Permission,
  type Principal,
  type Role,
} from "@/lib/permissions";

interface Api {
  loading: boolean;
  principal: Principal;
  can: (p: Permission) => boolean;
  canAll: (ps: readonly Permission[]) => boolean;
  canAny: (ps: readonly Permission[]) => boolean;
  hasMinRole: (min: Role) => boolean;
}

/**
 * React binding for the centralized permission matrix.
 *
 * ALL UI authorization checks should go through this hook. The permission
 * matrix (`src/lib/permissions.ts`) is the single source of truth; this hook
 * just wires the current authenticated principal into it.
 */
export function usePermissions(): Api {
  const { user } = useAuth();
  const { tier, loading } = useRole();

  const principal: Principal = useMemo(
    () => (user ? { id: user.id, role: tier } : ANONYMOUS),
    [user, tier],
  );

  return {
    loading,
    principal,
    can: (p) => _can(principal, p),
    canAll: (ps) => _canAll(principal, ps),
    canAny: (ps) => _canAny(principal, ps),
    hasMinRole: (min) => _hasMinRole(principal, min),
  };
}
