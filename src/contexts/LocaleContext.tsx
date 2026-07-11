/**
 * LocaleContext — the single source of truth for UI language, content
 * languages, region, and RTL. Detects on first load, hydrates from Cloud
 * when the user signs in, and mirrors overrides back to Cloud.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  RTL_LANGUAGES,
  loadDictionary,
  translate,
  type LanguageCode,
} from "@/i18n";
import { detectCountry, detectLanguage } from "@/i18n/detect";
import { detectTimezone } from "@/lib/intl";

export interface LocalePreferences {
  ui_language: LanguageCode;
  content_languages: LanguageCode[];
  country_code: string | null;
  rtl_override: boolean | null;
  auto_personalize: boolean;
  diversity_level: number;
  detected_language: LanguageCode | null;
  detected_country: string | null;
}

interface LocaleContextValue {
  locale: LanguageCode;
  isRtl: boolean;
  preferences: LocalePreferences;
  t: (key: string, vars?: Record<string, string | number>, fallback?: string) => string;
  setLocale: (lang: LanguageCode) => void;
  updatePreferences: (patch: Partial<LocalePreferences>) => Promise<void>;
}

const STORAGE_KEY = "heartify-locale-prefs";

function loadLocal(): Partial<LocalePreferences> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocal(prefs: LocalePreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

function defaults(): LocalePreferences {
  const detectedLang = detectLanguage();
  const detectedCountry = detectCountry();
  return {
    ui_language: detectedLang,
    content_languages: Array.from(new Set([detectedLang, "en", "ar"])) as LanguageCode[],
    country_code: detectedCountry,
    rtl_override: null,
    auto_personalize: true,
    diversity_level: 50,
    detected_language: detectedLang,
    detected_country: detectedCountry,
  };
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<LocalePreferences>(() => ({
    ...defaults(),
    ...(loadLocal() ?? {}),
  }));
  const [dict, setDict] = useState<Record<string, string> | undefined>();

  // Load dictionary whenever UI language changes.
  useEffect(() => {
    let cancelled = false;
    loadDictionary(preferences.ui_language).then((d) => {
      if (!cancelled) setDict(d);
    });
    return () => {
      cancelled = true;
    };
  }, [preferences.ui_language]);

  // Reflect language + direction on <html>.
  useEffect(() => {
    const isRtl = preferences.rtl_override ?? RTL_LANGUAGES.has(preferences.ui_language);
    document.documentElement.lang = preferences.ui_language;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
  }, [preferences.ui_language, preferences.rtl_override]);

  // Persist locally.
  useEffect(() => {
    saveLocal(preferences);
  }, [preferences]);

  // Hydrate from Cloud when signed in (Cloud wins over local).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_locale_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setPreferences((prev) => ({
          ...prev,
          ui_language: (data.ui_language as LanguageCode) ?? prev.ui_language,
          content_languages: (data.content_languages as LanguageCode[]) ?? prev.content_languages,
          country_code: data.country_code ?? prev.country_code,
          rtl_override: data.rtl_override,
          auto_personalize: data.auto_personalize,
          diversity_level: data.diversity_level ?? prev.diversity_level,
          detected_language: (data.detected_language as LanguageCode) ?? prev.detected_language,
          detected_country: data.detected_country ?? prev.detected_country,
        }));
      } else {
        // First sign-in: seed Cloud with local prefs.
        await supabase.from("user_locale_preferences").insert({
          user_id: user.id,
          ui_language: preferences.ui_language,
          content_languages: preferences.content_languages,
          country_code: preferences.country_code,
          rtl_override: preferences.rtl_override,
          auto_personalize: preferences.auto_personalize,
          diversity_level: preferences.diversity_level,
          detected_language: preferences.detected_language,
          detected_country: preferences.detected_country,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only run when user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const updatePreferences = useCallback(
    async (patch: Partial<LocalePreferences>) => {
      setPreferences((prev) => ({ ...prev, ...patch }));
      if (user) {
        await supabase
          .from("user_locale_preferences")
          .upsert(
            {
              user_id: user.id,
              ...patch,
            },
            { onConflict: "user_id" },
          );
      }
    },
    [user],
  );

  const setLocale = useCallback(
    (lang: LanguageCode) => {
      void updatePreferences({ ui_language: lang });
    },
    [updatePreferences],
  );

  const value = useMemo<LocaleContextValue>(() => {
    const isRtl = preferences.rtl_override ?? RTL_LANGUAGES.has(preferences.ui_language);
    return {
      locale: preferences.ui_language,
      isRtl,
      preferences,
      t: (key, vars, fallback) => translate(dict, key, vars, fallback),
      setLocale,
      updatePreferences,
    };
  }, [dict, preferences, setLocale, updatePreferences]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
