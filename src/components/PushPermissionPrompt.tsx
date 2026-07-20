// Contextual push permission prompt.
//
// Policy (see docs/NOTIFICATION_POLICY.md):
//   - We NEVER auto-prompt on first load or during onboarding.
//   - We show a soft in-app ask AFTER a meaningful user gesture (favoriting,
//     enabling a prayer reminder, etc.) — never in response to page load.
//   - If the user dismisses, we back off for 14 days.
//   - If the user denies at the OS level, we never re-prompt in-app.
//   - The actual OS `Notification.requestPermission()` call runs only inside
//     the user's confirming click on our sheet, satisfying browser
//     "user gesture required" rules and preventing surprise system prompts.
//
// Fire the prompt with `requestContextualPush("favorite")` (or another
// reason). Component is mounted globally in <App/> and listens for events.

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWebPush } from "@/hooks/useWebPush";
import { toast } from "@/hooks/use-toast";

const EVENT = "heartify:push-prompt";
const DISMISSED_KEY = "heartify.push-prompt.dismissed-at";
const BACKOFF_MS = 14 * 24 * 60 * 60 * 1000;

const REASONS: Record<string, { title: string; body: string }> = {
  favorite: {
    title: "Get notified when new videos land",
    body: "You just bookmarked something. Turn on notifications and we'll ping you (at most 3 times a week) when there's new content in categories you care about.",
  },
  prayer: {
    title: "Never miss a prayer time",
    body: "Enable notifications to get gentle adhān reminders. We cap all alerts at 3 per week — no spam.",
  },
  streak: {
    title: "Protect your streak",
    body: "Turn on notifications so we can nudge you before your streak breaks. Maximum 3 alerts per week.",
  },
  generic: {
    title: "Turn on notifications?",
    body: "Get gentle, curated alerts — capped at 3 per week. You can change this anytime in Settings.",
  },
};

export function requestContextualPush(reason: keyof typeof REASONS = "generic") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { reason } }));
}

function isEligible(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof Notification === "undefined") return false;
  if (Notification.permission !== "default") return false; // never re-prompt if denied/granted
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (raw && Date.now() - Number(raw) < BACKOFF_MS) return false;
  } catch { /* noop */ }
  return true;
}

export default function PushPermissionPrompt() {
  const { user } = useAuth();
  const push = useWebPush();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<keyof typeof REASONS>("generic");

  useEffect(() => {
    const handler = (e: Event) => {
      if (!user) return;
      if (!isEligible()) return;
      const detail = (e as CustomEvent<{ reason?: keyof typeof REASONS }>).detail;
      setReason(detail?.reason ?? "generic");
      setOpen(true);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, [user]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch { /* noop */ }
    setOpen(false);
  }, []);

  const enable = useCallback(async () => {
    const status = await push.subscribe();
    setOpen(false);
    if (status === "granted") {
      toast({
        title: "Notifications on 🔔",
        description: "We'll only send up to 3 alerts per week.",
      });
    } else if (status === "denied") {
      toast({ title: "You can enable notifications later in Settings" });
    }
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch { /* noop */ }
  }, [push]);

  const copy = REASONS[reason] ?? REASONS.generic;

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </div>
          <SheetTitle>{copy.title}</SheetTitle>
          <SheetDescription>{copy.body}</SheetDescription>
        </SheetHeader>
        <SheetFooter className="mt-6 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={dismiss}>Not now</Button>
          <Button onClick={enable} disabled={push.status === "checking"}>
            Turn on notifications
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
