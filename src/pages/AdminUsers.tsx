import { lazy, Suspense } from "react";
import { Crown, Loader2, Shield, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/hooks/useRole";

const AdminRoles = lazy(() => import("./AdminRoles"));
const AdminEntitlements = lazy(() => import("./AdminEntitlements"));

/**
 * Unified admin console consolidating:
 *   • Owner overview
 *   • Roles & MFA (formerly /admin/roles + /owner)
 *   • Entitlements (formerly /admin/entitlements)
 *
 * Fragmented pages remain importable for direct-URL fallbacks, but the
 * primary experience lives here.
 */
export default function AdminUsers() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Admin · Users, Roles & Entitlements"
        description="Unified admin console for user roles, MFA, and premium entitlements."
        path="/admin/users"
      />
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 flex items-center gap-3">
          <Crown className="h-6 w-6 text-gold" />
          <div>
            <h1 className="text-2xl font-semibold">Users & Access</h1>
            <p className="text-sm text-muted-foreground">
              Consolidated hub for roles, MFA, and premium entitlements.
            </p>
          </div>
        </header>

        <Tabs defaultValue="roles">
          <TabsList>
            <TabsTrigger value="roles">
              <Shield className="mr-2 h-4 w-4" /> Roles & MFA
            </TabsTrigger>
            <TabsTrigger value="entitlements">
              <Users className="mr-2 h-4 w-4" /> Entitlements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="mt-4">
            <Suspense fallback={<Fallback />}>
              <AdminRoles embedded />
            </Suspense>
          </TabsContent>

          <TabsContent value="entitlements" className="mt-4">
            <Suspense fallback={<Fallback />}>
              <AdminEntitlements embedded />
            </Suspense>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Fallback() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
