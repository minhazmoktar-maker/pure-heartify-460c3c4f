import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * First-session status for a signed-in viewer.
 *
 * Returns a fine-grained checklist so Home, Profile, and Search can each
 * surface the right nudge without duplicating queries. Results cache for
 * 5 minutes to keep Home render cheap after the first paint.
 */
export interface OnboardingStatus {
  loading: boolean;
  isNew: boolean;               // signed in AND has never completed onboarding
  completed: boolean;           // profiles.onboarding_completed_at is set
  hasInterests: boolean;
  hasDisplayName: boolean;
  hasAvatar: boolean;
  hasBio: boolean;
  hasReciter: boolean;
  hasReminderHour: boolean;
  /** 0..1 completeness score across the six activation fields. */
  completeness: number;
}

const EMPTY: OnboardingStatus = {
  loading: false,
  isNew: false,
  completed: false,
  hasInterests: false,
  hasDisplayName: false,
  hasAvatar: false,
  hasBio: false,
  hasReciter: false,
  hasReminderHour: false,
  completeness: 0,
};

export function useOnboardingStatus(): OnboardingStatus {
  const { user, loading: authLoading } = useAuth();

  const q = useQuery({
    queryKey: ["onboarding-status", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!user) return EMPTY;
      const [{ data: profile }, { data: interests }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, avatar_url, bio, preferred_reciter, daily_reminder_hour, onboarding_completed_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_interests")
          .select("primary_interest")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const hasInterests = !!interests?.primary_interest;
      const hasDisplayName = !!(profile?.display_name && profile.display_name.trim().length > 1);
      const hasAvatar = !!profile?.avatar_url;
      const hasBio = !!(profile?.bio && profile.bio.trim().length > 0);
      const hasReciter = !!profile?.preferred_reciter;
      const hasReminderHour = typeof profile?.daily_reminder_hour === "number";
      const completed = !!profile?.onboarding_completed_at;

      const checks = [hasInterests, hasDisplayName, hasAvatar, hasBio, hasReciter, hasReminderHour];
      const completeness = checks.filter(Boolean).length / checks.length;

      return {
        loading: false,
        isNew: !completed,
        completed,
        hasInterests,
        hasDisplayName,
        hasAvatar,
        hasBio,
        hasReciter,
        hasReminderHour,
        completeness,
      } satisfies OnboardingStatus;
    },
  });

  if (authLoading) return { ...EMPTY, loading: true };
  if (!user) return EMPTY;
  return q.data ?? { ...EMPTY, loading: q.isLoading };
}
