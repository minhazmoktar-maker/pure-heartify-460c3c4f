import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Browser Web-Push subscription lifecycle.
 * - Fetches the VAPID public key from the `get-vapid-public-key` edge function.
 * - Subscribes the active service-worker registration (registered by vite-plugin-pwa).
 * - Persists the subscription to `public.web_push_subscriptions`.
 * - Gracefully falls back to `unavailable` when VAPID is not configured or
 *   the browser (iOS < 16.4, Safari without A2HS) does not support push.
 */
type Status = "idle" | "checking" | "unavailable" | "denied" | "granted";

const isSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function useWebPush() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );

  useEffect(() => {
    if (!isSupported()) setStatus("unavailable");
  }, []);

  const subscribe = useCallback(async (): Promise<Status> => {
    if (!isSupported()) {
      setStatus("unavailable");
      return "unavailable";
    }
    if (!user) return "unavailable";
    setStatus("checking");

    // 1. Ask permission (must be triggered from a user gesture upstream).
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== "granted") {
      setStatus(perm === "denied" ? "denied" : "unavailable");
      return perm === "denied" ? "denied" : "unavailable";
    }

    // 2. Fetch VAPID public key from edge function.
    let vapid: string | null = null;
    try {
      const { data, error } = await supabase.functions.invoke<{ publicKey: string }>(
        "get-vapid-public-key",
        { method: "GET" },
      );
      if (!error && data?.publicKey) vapid = data.publicKey;
    } catch {
      /* noop */
    }
    if (!vapid) {
      setStatus("unavailable");
      return "unavailable";
    }

    // 3. Subscribe via active service worker.
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        }));
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setStatus("unavailable");
        return "unavailable";
      }
      await supabase.functions.invoke("subscribe-web-push", {
        body: {
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent,
        },
      });
      setStatus("granted");
      return "granted";
    } catch {
      setStatus("unavailable");
      return "unavailable";
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported()) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        if (user) {
          await supabase.from("web_push_subscriptions").delete().eq("endpoint", endpoint);
        }
      }
    } catch {
      /* noop */
    }
    setStatus("idle");
  }, [user]);

  return { status, permission, subscribe, unsubscribe, supported: isSupported() };
}
