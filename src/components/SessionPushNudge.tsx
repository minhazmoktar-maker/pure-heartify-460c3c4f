// SessionPushNudge — soft ask for push permission after a few sessions.
//
// Policy (see docs/NOTIFICATION_POLICY.md):
//   - Never on first open. Never in onboarding. Never on cold load.
//   - Counts a "session" once per calendar day per device.
//   - On the 3rd session (signed-in user, no prior grant/denial, not
//     dismissed within backoff), waits ~8s of idle time on Home, then
//     dispatches the same contextual event the manual flow uses.
//   - PushPermissionPrompt owns the 14-day dismissal backoff, so we
//     don't double-book state here.
//
// This component renders nothing; it just watches session count.
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { requestContextualPush } from "./PushPermissionPrompt";

const DAY_KEY = "heartify.session.last-day";
const COUNT_KEY = "heartify.session.count";
const FIRED_KEY = "heartify.session.push-nudge-fired";
const MIN_SESSIONS = 3;
const IDLE_DELAY_MS = 8000;

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function readCount(): number {
  try {
    const raw = localStorage.getItem(COUNT_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function bumpSessionCount(): number {
  try {
    const today = todayStamp();
    const last = localStorage.getItem(DAY_KEY);
    let count = readCount();
    if (last !== today) {
      count += 1;
      localStorage.setItem(DAY_KEY, today);
      localStorage.setItem(COUNT_KEY, String(count));
    }
    return count;
  } catch {
    return 0;
  }
}

export default function SessionPushNudge() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;

    let fired = false;
    try {
      fired = localStorage.getItem(FIRED_KEY) === "1";
    } catch { /* noop */ }
    if (fired) return;

    const count = bumpSessionCount();
    if (count < MIN_SESSIONS) return;

    // Only nudge on Home to avoid interrupting mid-task flows.
    if (window.location.pathname !== "/") return;

    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(FIRED_KEY, "1");
      } catch { /* noop */ }
      requestContextualPush("generic");
    }, IDLE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [user]);

  return null;
}
