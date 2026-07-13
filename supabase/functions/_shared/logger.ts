// Shared structured logger for Supabase Edge Functions.
//
// Emits single-line JSON to stdout so log-shipping tools (Vector, Grafana
// Loki, Datadog, etc.) can ingest without regex parsing. Every entry carries
// the function name, release tag, level, message, timestamp, and any extra
// fields. Never log secrets — pass user IDs and correlation IDs only.
//
// Usage:
//   import { createLogger } from "../_shared/logger.ts";
//   const log = createLogger("feed");
//   log.info("served", { userId, latencyMs });

type Level = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug: (msg: string, fields?: Record<string, unknown>) => void;
  info: (msg: string, fields?: Record<string, unknown>) => void;
  warn: (msg: string, fields?: Record<string, unknown>) => void;
  error: (msg: string, fields?: Record<string, unknown>) => void;
  child: (extra: Record<string, unknown>) => Logger;
  time: <T>(msg: string, fn: () => Promise<T>) => Promise<T>;
}

const RELEASE = Deno.env.get("APP_VERSION") ?? "unknown";

function emit(fn: string, level: Level, msg: string, base: Record<string, unknown>, fields?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    fn,
    release: RELEASE,
    msg,
    ...base,
    ...(fields ?? {}),
  };
  // Route errors to stderr so log shippers can classify by stream.
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else console.log(line);
}

export function createLogger(fnName: string, base: Record<string, unknown> = {}): Logger {
  const make = (level: Level) => (msg: string, fields?: Record<string, unknown>) =>
    emit(fnName, level, msg, base, fields);

  return {
    debug: make("debug"),
    info: make("info"),
    warn: make("warn"),
    error: make("error"),
    child: (extra) => createLogger(fnName, { ...base, ...extra }),
    time: async (msg, fn) => {
      const start = performance.now();
      try {
        const out = await fn();
        emit(fnName, "info", msg, base, { durationMs: Math.round(performance.now() - start), ok: true });
        return out;
      } catch (err) {
        emit(fnName, "error", msg, base, {
          durationMs: Math.round(performance.now() - start),
          ok: false,
          err: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
  };
}
