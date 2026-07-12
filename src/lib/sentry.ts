/**
 * Sentry integration.
 *
 * Wires into the existing pluggable `window.__errorReporter` hook consumed by
 * `<ErrorBoundary />` and also captures uncaught global errors + unhandled
 * promise rejections. No-ops when VITE_SENTRY_DSN is not configured, so
 * development builds don't spam the project.
 */
import * as Sentry from "@sentry/react";
import type { ErrorInfo } from "react";

type Reporter = (err: Error, info?: ErrorInfo) => void;

declare global {
  interface Window {
    __errorReporter?: Reporter;
    __sentryInitialized?: boolean;
  }
}

export function initSentry() {
  if (typeof window === "undefined" || window.__sentryInitialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  const env = (import.meta.env.MODE as string) || "production";

  if (!dsn) {
    // Still install a lightweight console reporter so ErrorBoundary calls
    // don't disappear silently in production without a DSN.
    window.__errorReporter = (err, info) => {
      // eslint-disable-next-line no-console
      console.error("[error-reporter:noop]", err, info?.componentStack);
    };
    window.__sentryInitialized = true;
    return;
  }

  const release =
    (import.meta.env.VITE_APP_VERSION as string | undefined) ??
    (import.meta.env.VITE_GIT_SHA as string | undefined) ??
    undefined;

  Sentry.init({
    dsn,
    environment: env,
    release,
    tracesSampleRate: env === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: env === "production" ? 0.1 : 0,
    // Do NOT send PII by default.
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip common PII from breadcrumbs/messages.
      if (event.request?.cookies) delete event.request.cookies;
      if (event.user) {
        // Only keep the opaque user id (Supabase UUID). Drop email/username.
        event.user = event.user.id ? { id: event.user.id } : undefined;
      }
      return event;
    },
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
  });

  window.__errorReporter = (err, info) => {
    Sentry.captureException(err, {
      contexts: info?.componentStack
        ? { react: { componentStack: info.componentStack } }
        : undefined,
    });
  };

  window.__sentryInitialized = true;
}

export function setSentryUser(userId: string | null) {
  if (!window.__sentryInitialized) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

export function captureCritical(message: string, extra?: Record<string, unknown>) {
  const reporter = window.__errorReporter;
  const err = new Error(message);
  if (reporter) reporter(err);
  else console.error("[critical]", message, extra);
}
