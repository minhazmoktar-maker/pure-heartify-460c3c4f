import { AlertCircle, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";

const ERROR_HELP: Array<{ match: RegExp; title: string; steps: string[] }> = [
  {
    match: /already exists|duplicate|unique/i,
    title: "A factor with this name already exists",
    steps: [
      "You already enrolled a TOTP factor previously.",
      "Open the Profile page and remove the old factor first, then retry enrollment.",
      "If it shows as 'unverified', this page auto-cleans stale factors on load — just refresh.",
    ],
  },
  {
    match: /aal2|assurance level|elevated/i,
    title: "Your session isn't at MFA level (AAL2)",
    steps: [
      "Sign out and sign back in.",
      "After entering your password, enter the 6-digit code from your authenticator when prompted.",
      "Then retry the admin action.",
    ],
  },
  {
    match: /rate limit|too many/i,
    title: "Too many attempts",
    steps: [
      "Wait 60 seconds before trying again.",
      "Make sure your device time is synced (auto time on iOS/Android).",
    ],
  },
  {
    match: /invalid.*code|token.*invalid|otp/i,
    title: "The 6-digit code was rejected",
    steps: [
      "Codes rotate every 30 seconds — enter the current code, not the one that just expired.",
      "Verify device clock is set to automatic. TOTP is time-sensitive.",
      "If you rescanned the QR, throw away the old entry in your authenticator and use only the newest one.",
    ],
  },
  {
    match: /forbidden|not allowed|permission/i,
    title: "MFA is disabled for this project",
    steps: [
      "An owner must enable TOTP in Backend → Users → Auth Settings → Multi-Factor Authentication.",
      "After enabling, sign out and back in before retrying.",
    ],
  },
  {
    match: /network|fetch|timeout/i,
    title: "Network error reaching the auth service",
    steps: [
      "Check your internet connection.",
      "Disable VPN/ad-blockers that might block auth endpoints.",
      "Retry after 30 seconds.",
    ],
  },
];

export default function MfaEnrollmentHelp({ error }: { error?: string | null }) {
  const match = error ? ERROR_HELP.find(h => h.match.test(error)) : null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold">Enrollment troubleshooting</h3>
          <p className="text-micro text-muted-foreground">
            If enrollment fails, match the exact error text below.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-micro">
          <div className="font-mono break-all text-destructive">{error}</div>
          {match && (
            <div className="mt-2">
              <div className="font-semibold text-foreground">{match.title}</div>
              <ol className="mt-1 ml-4 list-decimal space-y-0.5 text-muted-foreground">
                {match.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}

      <details className="text-micro">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Common Supabase Auth MFA errors →
        </summary>
        <div className="mt-2 space-y-3">
          {ERROR_HELP.map((h, i) => (
            <div key={i} className="rounded border p-2">
              <div className="font-semibold">{h.title}</div>
              <ol className="mt-1 ml-4 list-decimal space-y-0.5 text-muted-foreground">
                {h.steps.map((s, j) => <li key={j}>{s}</li>)}
              </ol>
            </div>
          ))}
        </div>
      </details>

      <a
        href="https://supabase.com/docs/guides/auth/auth-mfa/totp"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-micro text-primary hover:underline"
      >
        Supabase MFA docs <ExternalLink className="h-3 w-3" />
      </a>
    </Card>
  );
}
