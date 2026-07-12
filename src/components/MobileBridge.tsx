import { useDeepLinks } from "@/hooks/useDeepLinks";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useFirstRunOnboarding } from "@/hooks/useFirstRunOnboarding";

/** Mounted inside <BrowserRouter> so navigate() and auth context are available. */
export function MobileBridge() {
  useDeepLinks();
  usePushNotifications();
  useFirstRunOnboarding();
  return null;
}
