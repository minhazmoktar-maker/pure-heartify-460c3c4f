import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useRequireAdminMfa } from "@/hooks/useRequireAdminMfa";

/**
 * Centralised guard for every privileged (admin / owner) route.
 *
 * Enforces:
 *   1. Signed-in user (redirects to /login otherwise).
 *   2. Role check — admin or platform owner.
 *   3. AAL2 session — TOTP verified this session.
 *
 * The underlying `useRequireAdminMfa` hook handles redirects to
 * /login, /security/mfa, or /security/mfa/verify as appropriate.
 *
 * Wrapping routes here means new admin pages inherit MFA enforcement
 * automatically without per-page glue code.
 */
export default function AdminRoute({ children }: { children: ReactNode }) {
  const ok = useRequireAdminMfa();
  if (!ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Verifying access" />
      </div>
    );
  }
  return <>{children}</>;
}
