import { useState } from "react";
import { Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function ExportData() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url: string; tables: string[]; bytes: number } | null>(null);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const requestExport = async () => {
    setBusy(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("export-account-data", { body: {} });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Export failed");
      setResult({ url: data.download_url, tables: data.tables_included ?? [], bytes: data.bytes ?? 0 });
      toast.success("Your data export is ready.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg.includes("24 hours") ? "You can only export once per 24 hours." : "Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <SEO
        title="Download my data — Heartify"
        description="Download a full copy of the data Heartify holds about your account."
        path="/account/export-data"
      />
      <h1 className="font-heading text-3xl font-bold text-foreground">Download my data</h1>
      <p className="mt-2 text-muted-foreground">
        Under GDPR Article 15/20 and the CCPA, you can request a copy of everything we hold about your account.
        We'll generate a JSON file with every record tied to you.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
          <div className="text-sm text-muted-foreground">
            <p>The download link is private and expires after 24 hours.</p>
            <p className="mt-1">You can request one export every 24 hours.</p>
          </div>
        </div>

        <button
          onClick={requestExport}
          disabled={busy}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? "Preparing your data…" : "Request my data export"}
        </button>

        {result && (
          <div className="mt-6 rounded-lg border border-border bg-background p-4">
            <p className="text-sm font-medium text-foreground">Your export is ready</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {(result.bytes / 1024).toFixed(1)} KB · {result.tables.length} table
              {result.tables.length === 1 ? "" : "s"} included
            </p>
            <a
              href={result.url}
              download
              className="mt-3 inline-flex items-center gap-2 rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
            >
              <Download className="h-4 w-4" />
              Download JSON
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
