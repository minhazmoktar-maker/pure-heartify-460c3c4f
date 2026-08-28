import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { notificationTarget } from "@/lib/notificationRoutes";

/**
 * Native (Capacitor) push lifecycle for Android + iOS:
 *  - asks permission, registers with APNs/FCM and stores the device token
 *  - navigates to the actionable screen when a background push is TAPPED
 *    (e.g. a connection request opens Connections → Requests)
 *  - mirrors foreground pushes into the in-app notification cache
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    let cleanup: Array<() => void> = [];
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const perm = await PushNotifications.checkPermissions();
        let granted = perm.receive === "granted";
        if (!granted) {
          const req = await PushNotifications.requestPermissions();
          granted = req.receive === "granted";
        }
        if (!granted) return;

        await PushNotifications.register();

        const r1 = await PushNotifications.addListener("registration", async (t) => {
          await (supabase.from as any)("device_tokens").upsert(
            {
              user_id: user.id,
              token: t.value,
              platform: Capacitor.getPlatform(),
            },
            { onConflict: "user_id,token" }
          );
        });
        const r2 = await PushNotifications.addListener("registrationError", (e) =>
          console.warn("Push registration error", e)
        );

        // Background/quit-state tap → deep-link to the screen that can act on it.
        const r3 = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const data = (action.notification?.data ?? {}) as Record<string, unknown>;
            const kind = String(data.kind ?? "");
            const target = notificationTarget(kind, data);
            if (target) navigate(target);
          },
        );

        // Foreground delivery: refresh the bell so the badge is instantly right.
        const r4 = await PushNotifications.addListener("pushNotificationReceived", () => {
          window.dispatchEvent(new CustomEvent("heartify:notifications-refresh"));
        });

        cleanup = [() => r1.remove(), () => r2.remove(), () => r3.remove(), () => r4.remove()];
      } catch {
        /* not native */
      }
    })();
    return () => cleanup.forEach((fn) => fn());
  }, [user, navigate]);
}
