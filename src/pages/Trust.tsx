import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Shield, Lock, Eye, FileCheck, Users, AlertCircle, Database, Clock, Server } from "lucide-react";

/**
 * Public Trust page. App-owned editable content maintained by the Heartify team.
 * This page describes app-visible controls and current practices; it is not an
 * independent certification.
 */
export default function Trust() {
  return (
    <>
      <SEO
        title="Trust & Security — Heartify"
        description="How Heartify protects your data, moderates content, and safeguards your ibādah journey."
        path="/trust"
      />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <PageHeader
          title="Trust & Security"
          subtitle="This page is maintained by the Heartify team to answer common security, privacy, and content questions. It reflects controls currently enabled in the app, not an independent certification."
        />

        <div className="grid gap-4 mt-8">
          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <Shield className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Content trust</h2>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Every video and audio track is reviewed through a multi-stage moderation pipeline before appearing on the feed.</li>
                  <li>Approved creators are tracked in a public channel-trust ledger with per-channel scores and revocation history.</li>
                  <li>Users can report any item as non-halal; reports route directly into the moderation review queue.</li>
                  <li>Content featuring music-forward material or non-Islamic dress code is filtered by policy.</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <Lock className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Access & authentication</h2>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Email/password with leaked-password (HIBP) protection enabled.</li>
                  <li>Google Sign-In and optional multi-factor authentication (TOTP).</li>
                  <li>Admin and moderator actions require MFA and are logged to an immutable audit trail.</li>
                  <li>Session tokens are short-lived and rotated automatically.</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <Eye className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Data collection & use</h2>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Row-level security is enforced on every user-owned table so users can only read and write their own data.</li>
                  <li>Playback progress, streaks, and preferences are stored to power your experience — never sold.</li>
                  <li>No third-party ad networks. No behavioural ad tracking.</li>
                  <li>Analytics events are sanitized to strip PII before storage.</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <Users className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Your rights</h2>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Export or delete your account and all associated data from Profile → Settings.</li>
                  <li>Household seats on Heartify+ can be revoked at any time by the primary account.</li>
                  <li>See our <a className="underline" href="/privacy">Privacy Policy</a> and <a className="underline" href="/terms">Terms</a> for the full legal basis.</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <FileCheck className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Platform & hosting</h2>
                <p className="text-sm text-muted-foreground">
                  Heartify runs on a managed cloud backend with encryption in transit (TLS 1.2+) and at rest. Database access is scoped by role and enforced by row-level security policies. The hosting platform provides infrastructure controls; Heartify is responsible for application-level access rules and content moderation.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <Database className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Subprocessors & integrations</h2>
                <p className="text-sm text-muted-foreground mb-2">
                  Heartify uses a small set of processors to run the service. This list is maintained by the Heartify team.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li><strong className="text-foreground">Managed backend & database</strong> — authentication, storage, and Postgres hosting.</li>
                  <li><strong className="text-foreground">YouTube Data API</strong> — video metadata and playback (public content only).</li>
                  <li><strong className="text-foreground">Push delivery</strong> — Web Push (VAPID) and platform APNs / FCM for mobile.</li>
                  <li><strong className="text-foreground">Error monitoring</strong> — Sentry, receiving stack traces with PII stripped.</li>
                </ul>
                <p className="mt-2 text-micro text-muted-foreground">
                  We do not sell personal data and do not share it with advertising networks. A data-processing addendum is available on request via <a className="underline" href="mailto:privacy@heartify.app">privacy@heartify.app</a>.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <Clock className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Retention & deletion</h2>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Account profile and playback history are kept while your account is active.</li>
                  <li>Analytics events are retained for up to 24 months in aggregated form, then purged by the nightly retention job.</li>
                  <li>Deleted accounts are erased from user-owned tables immediately; residual references in audit and moderation logs are anonymised within 30 days.</li>
                  <li>Backups are encrypted and rotated on a rolling 30-day window.</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3 items-start">
              <Server className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Incident response</h2>
                <p className="text-sm text-muted-foreground">
                  We monitor error rates, moderation SLAs, and edge-function health continuously. If a security incident affects your data, we will notify affected users by email without undue delay and post an update on our public status page. Post-incident summaries are shared once remediation is complete.
                </p>
              </div>
            </div>
          </Card>


          <Card className="p-6 border-primary/20">
            <div className="flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-heading font-semibold mb-2">Report a security issue</h2>
                <p className="text-sm text-muted-foreground">
                  If you believe you've found a vulnerability, please email{" "}
                  <a className="underline" href="mailto:security@heartify.app">security@heartify.app</a>.
                  We investigate every report and aim to respond within 72 hours.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <p className="text-micro text-muted-foreground mt-8 text-center">
          Last reviewed: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}
        </p>
      </div>
    </>
  );
}
