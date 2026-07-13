import PageSkeleton from "@/components/PageSkeleton";
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { FileWarning, Loader2, ShieldAlert, ShieldCheck, GaugeCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminReports = lazy(() => import("./AdminReports"));
const AdminReview = lazy(() => import("./AdminReview"));
const ModerationLog = lazy(() => import("./ModerationLog"));
const AdminSLA = lazy(() => import("./AdminSLA"));

/**
 * Unified moderation console consolidating:
 *   • Community reports queue (formerly /admin/reports)
 *   • Channel & video candidate review (formerly /admin/review)
 *   • Automatic rejection audit log (formerly /admin/moderation-log)
 *
 * Trust is a first-class Heartify capability, so every underlying workflow is
 * preserved — only the fragmented navigation is removed.
 */
export default function AdminModeration() {
  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Admin · Moderation"
        description="Unified moderation console for reports, candidate review, and audit history."
        path="/admin/moderation"
      />
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Moderation</h1>
              <p className="text-sm text-muted-foreground">
                Reports, candidate review, and the automatic rejection audit — all in one place.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/users">Users & access</Link>
          </Button>
        </header>

        <Tabs defaultValue="sla">
          <TabsList>
            <TabsTrigger value="sla">
              <GaugeCircle className="mr-2 h-4 w-4" /> SLA
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileWarning className="mr-2 h-4 w-4" /> Reports
            </TabsTrigger>
            <TabsTrigger value="review">
              <ShieldCheck className="mr-2 h-4 w-4" /> Review
            </TabsTrigger>
            <TabsTrigger value="log">
              <ShieldAlert className="mr-2 h-4 w-4" /> Audit log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sla" className="mt-4">
            <Suspense fallback={<Fallback />}>
              <AdminSLA embedded />
            </Suspense>
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <Suspense fallback={<Fallback />}>
              <AdminReports embedded />
            </Suspense>
          </TabsContent>

          <TabsContent value="review" className="mt-4">
            <Suspense fallback={<Fallback />}>
              <AdminReview embedded />
            </Suspense>
          </TabsContent>

          <TabsContent value="log" className="mt-4">
            <Suspense fallback={<Fallback />}>
              <ModerationLog embedded />
            </Suspense>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Fallback() {
  return <PageSkeleton variant="list" />;
}
