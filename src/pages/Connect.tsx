import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

/**
 * Agent connection instructions.
 *
 * Audience: someone connecting an AI assistant (ChatGPT / Claude) to
 * Heartify's MCP server. Not a developer reference — no JSON-RPC, no
 * tool schemas, no curl. See the app-mcp-connection-instructions-page
 * knowledge for the contract this page follows.
 */
export default function Connect() {
  const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "";
  const mcpUrl = `https://${projectRef}.supabase.co/functions/v1/mcp`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — user can still select the text */
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SEO
        title="Connect Heartify to ChatGPT or Claude"
        description="Paste the Heartify MCP server URL into ChatGPT or Claude to let your AI assistant use Heartify's tools."
        path="/connect"
        noBreadcrumbs
      />
      <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Heartify
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Connect Heartify to your AI assistant
        </h1>
        <p className="mt-3 text-muted-foreground">
          Paste this URL into ChatGPT or Claude to let your assistant use
          Heartify on your behalf.
        </p>

        <Card className="mt-6 p-4 md:p-5">
          <label className="text-micro font-medium uppercase tracking-wide text-muted-foreground">
            MCP server URL
          </label>
          <div className="mt-2 flex items-stretch gap-2">
            <input
              readOnly
              value={mcpUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-sm"
              aria-label="Heartify MCP server URL"
            />
            <Button onClick={copy} variant="secondary" className="shrink-0">
              {copied ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" /> Copy
                </>
              )}
            </Button>
          </div>
        </Card>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Connect ChatGPT</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            <li>
              Open{" "}
              <a
                className="underline hover:text-foreground"
                href="https://chatgpt.com/#settings/Connectors/Advanced"
                target="_blank"
                rel="noreferrer"
              >
                ChatGPT → Settings → Connectors → Advanced
              </a>{" "}
              and turn on Developer mode (read the risk notice shown there).
            </li>
            <li>In the chat composer's <span className="font-medium">+</span> menu, turn on Developer mode.</li>
            <li>Click <span className="font-medium">Add sources</span>, then <span className="font-medium">Connect more</span>.</li>
            <li>Name the connector "Heartify" and paste the URL above.</li>
            <li>Start a new chat and ask ChatGPT to use Heartify.</li>
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Connect Claude</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            <li>
              Open{" "}
              <a
                className="underline hover:text-foreground"
                href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                target="_blank"
                rel="noreferrer"
              >
                Claude → Connectors → Add custom connector
              </a>
              .
            </li>
            <li>Name the connector "Heartify" and paste the URL above.</li>
            <li>Enable the connector from the chat composer, then ask Claude to use Heartify.</li>
          </ol>
        </section>

        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-xl font-semibold">Refresh after Heartify updates</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A connected assistant caches Heartify's tool list. After we ship
            changes, refresh the connector so your assistant sees the latest
            tools.
          </p>

          <h3 className="mt-6 text-base font-semibold">ChatGPT</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
            <li>Open ChatGPT's app preferences and pick Heartify under <span className="font-medium">Enabled apps</span>.</li>
            <li>Next to <span className="font-medium">Information</span>, click <span className="font-medium">Refresh</span>.</li>
            <li>If the URL changed, paste the latest URL from above.</li>
            <li>Start a new chat and ask ChatGPT to use Heartify.</li>
          </ol>

          <h3 className="mt-6 text-base font-semibold">Claude</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
            <li>Open the Connectors page and select Heartify.</li>
            <li>Refresh or update the connector's tools.</li>
            <li>If the URL changed, paste the latest URL from above.</li>
            <li>Ask Claude to use Heartify.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
