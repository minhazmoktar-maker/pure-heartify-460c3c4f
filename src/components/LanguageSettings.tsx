/**
 * Language & Region settings panel. Drop into the Profile page.
 * Every field is user-overridable; auto-personalization can be disabled.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/contexts/LocaleContext";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";

interface RegionalMix {
  country_code: string;
  country_name: string;
  language_mix: Record<string, number>;
  default_ui_language: string;
}

export function LanguageSettings() {
  const { t, preferences, updatePreferences } = useLocale();
  const [regions, setRegions] = useState<RegionalMix[]>([]);

  useEffect(() => {
    supabase
      .from("regional_language_mix")
      .select("country_code, country_name, language_mix, default_ui_language")
      .eq("is_active", true)
      .order("country_name")
      .then(({ data }) => setRegions((data as RegionalMix[]) ?? []));
  }, []);

  const activeMix = regions.find((r) => r.country_code === preferences.country_code);

  const toggleContentLanguage = (code: LanguageCode) => {
    const current = new Set(preferences.content_languages);
    if (current.has(code)) current.delete(code);
    else current.add(code);
    const next = Array.from(current) as LanguageCode[];
    if (next.length === 0) return;
    void updatePreferences({ content_languages: next });
  };

  const save = async (patch: Parameters<typeof updatePreferences>[0]) => {
    await updatePreferences(patch);
    toast.success(t("language.saved"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          {t("language.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* UI language */}
        <div className="space-y-2">
          <Label>{t("language.ui")}</Label>
          <Select
            value={preferences.ui_language}
            onValueChange={(v) => save({ ui_language: v as LanguageCode })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.native} <span className="text-muted-foreground">· {l.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {preferences.detected_language && (
            <p className="text-micro text-muted-foreground">
              {t("language.detected", { value: preferences.detected_language })}
            </p>
          )}
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label>{t("language.country")}</Label>
          <Select
            value={preferences.country_code ?? ""}
            onValueChange={(v) => save({ country_code: v || null })}
          >
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r.country_code} value={r.country_code}>
                  {r.country_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeMix && (
            <div className="flex flex-wrap gap-1 pt-1">
              {Object.entries(activeMix.language_mix).map(([lang, ratio]) => (
                <Badge key={lang} variant="secondary" className="text-micro">
                  {lang.toUpperCase()} · {Math.round(ratio * 100)}%
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Content languages */}
        <div className="space-y-2">
          <Label>{t("language.content")}</Label>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map((l) => {
              const active = preferences.content_languages.includes(l.code);
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => toggleContentLanguage(l.code)}
                  className={`rounded-pill border px-3 py-1 text-micro font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.native}
                </button>
              );
            })}
          </div>
        </div>

        {/* Auto-personalize */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label>{t("language.auto")}</Label>
            <p className="text-micro text-muted-foreground">{t("language.autoHint")}</p>
          </div>
          <Switch
            checked={preferences.auto_personalize}
            onCheckedChange={(v) => save({ auto_personalize: v })}
          />
        </div>

        {/* RTL override */}
        <div className="flex items-start justify-between gap-4">
          <Label>{t("language.rtl")}</Label>
          <Switch
            checked={preferences.rtl_override ?? false}
            onCheckedChange={(v) => save({ rtl_override: v })}
          />
        </div>

        {/* Diversity */}
        <div className="space-y-2">
          <Label>{t("language.diversity")} · {preferences.diversity_level}</Label>
          <Slider
            value={[preferences.diversity_level]}
            min={0}
            max={100}
            step={5}
            onValueCommit={(v) => save({ diversity_level: v[0] })}
          />
          <p className="text-micro text-muted-foreground">{t("language.diversityHint")}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default LanguageSettings;
