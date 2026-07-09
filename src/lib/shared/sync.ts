// Thin, transport-agnostic client for the /user-sync-* edge functions.
// Web uses supabase.functions.invoke; native clients can call the raw HTTP endpoints.
import { supabase } from "@/integrations/supabase/client";
import type { SyncPullResponse, SyncPushBody } from "./types";

const CURSOR_KEY = "heartify.sync.cursor.v1";

export function readCursor(): string {
  try { return localStorage.getItem(CURSOR_KEY) ?? "1970-01-01T00:00:00Z"; }
  catch { return "1970-01-01T00:00:00Z"; }
}
export function writeCursor(iso: string) {
  try { localStorage.setItem(CURSOR_KEY, iso); } catch { /* ignore */ }
}

export async function pullSince(since = readCursor()): Promise<SyncPullResponse | null> {
  const { data, error } = await supabase.functions.invoke<SyncPullResponse>("user-sync-pull", {
    body: null,
    method: "GET" as any,
    // supabase-js has no query API; append via headers.
    headers: { "x-sync-since": since } as Record<string, string>,
  } as any);
  if (error || !data) return null;
  writeCursor(data.server_time);
  return data;
}

export async function push(body: SyncPushBody): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean }>("user-sync-push", { body });
  return !error && !!data?.ok;
}
