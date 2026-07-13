import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import getStreak from "./tools/get-streak";
import listFavorites from "./tools/list-favorites";
import logDhikr from "./tools/log-dhikr";
import logSalah from "./tools/log-salah";
import getPrayerTimes from "./tools/prayer-times";

// Direct Supabase issuer — never the .lovable.cloud proxy. See knowledge: cloud-auth-oauth-server.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "heartify-mcp",
  title: "Heartify",
  version: "0.1.0",
  instructions:
    "Tools for Heartify — a scholar-moderated Islamic content and worship-tracking app. " +
    "Use `get_profile` and `get_streak` to read the signed-in user's account, " +
    "`list_favorites` for their saved videos, `log_dhikr_session` and `log_salah` to " +
    "record acts of worship, and `get_prayer_times` for salah timings by location.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, getStreak, listFavorites, logDhikr, logSalah, getPrayerTimes],
});
