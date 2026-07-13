import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import getStreak from "./tools/get-streak";
import listFavorites from "./tools/list-favorites";
import logDhikr from "./tools/log-dhikr";
import logSalah from "./tools/log-salah";
import getPrayerTimes from "./tools/prayer-times";
import listDhikrSessions from "./tools/list-dhikr-sessions";
import listSalahLogs from "./tools/list-salah-logs";

// Direct Supabase issuer — never the .lovable.cloud proxy. See knowledge: cloud-auth-oauth-server.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "heartify-mcp",
  title: "Heartify",
  version: "0.1.0",
  instructions:
    "Tools for Heartify — a scholar-moderated Islamic content and worship-tracking app. " +
    "Read tools: `get_profile`, `get_streak`, `list_favorites`, `list_dhikr_sessions`, " +
    "`list_salah_logs`, `get_prayer_times`. Write tools: `log_dhikr_session`, `log_salah`. " +
    "All reads/writes are scoped to the signed-in user via RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getProfile,
    getStreak,
    listFavorites,
    listDhikrSessions,
    listSalahLogs,
    logDhikr,
    logSalah,
    getPrayerTimes,
  ],
});
