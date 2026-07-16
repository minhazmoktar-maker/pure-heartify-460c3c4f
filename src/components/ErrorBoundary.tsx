import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Top-level error boundary. Prevents a single component crash from taking down
 * the whole app (blank white screen on native) and provides a recoverable path.
 *
 * Errors are logged to console and — if window.__errorReporter is set — to a
 * user-provided reporter (Sentry, Bugsnag, custom). Keeps the transport
 * pluggable without hard-coding a vendor.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
    const reporter = (window as unknown as { __errorReporter?: (e: Error, i: ErrorInfo) => void }).__errorReporter;
    if (typeof reporter === "function") {
      try { reporter(error, info); } catch { /* swallow */ }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-pill bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="font-heading text-heading font-bold text-foreground">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The app hit an unexpected error. You can retry, or reload the page. Our team has
          been notified.
        </p>
        <div className="flex gap-2">
          <button
            onClick={this.handleReset}
            className="rounded-card border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/10"
          >
            Try again
          </button>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" /> Reload
          </button>
        </div>
        {import.meta.env.DEV && this.state.error && (
          <pre className="mt-4 max-w-2xl overflow-auto rounded-card border border-border bg-muted p-3 text-left text-micro text-muted-foreground">
            {this.state.error.message}
          </pre>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
