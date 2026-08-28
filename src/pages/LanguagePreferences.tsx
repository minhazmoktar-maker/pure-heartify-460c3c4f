/**
 * /settings/languages — dedicated language & region preference screen.
 *
 * Users pick their default content language(s) here. The 80/20 mix logic
 * stays active per country regardless of what is chosen: the first selected
 * language is the guaranteed-share "native" lane, the rest of the page is
 * round-robined across the remaining selections plus universal content.
 */
import { Link } from "react-router-dom";
import { Globe, Languages } from "lucide-react";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import LanguageSettings from "@/components/LanguageSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/contexts/LocaleContext";
import { SUPPORTED_LANGUAGES } from "@/i18n";

export default function LanguagePreferences() {
  const { preferences, t } = useLocale();
  const primary = preferences.content_languages?.[0];
  const primaryLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === primary)?.native ?? primary?.toUpperCase();
  const others = (preferences.content_languages ?? []).slice(1);

  return (
    <>
      <SEO
        path="/settings/languages"
        title="Language & region preferences — Heartify"
        description="Choose your default Heartify languages. Your feed stays 80% native to your region and 20% diversified across the languages you understand."
      />
      <PageHeader
        title={t("language.title", undefined, "Language & region")}
        subtitle="Choose the languages you want to learn in. Your feed keeps an 80% native / 20% diversified balance for your country."
        icon={Languages}
        actions={
          <Button asChild size="sm" variant="outline" className="h-9">
            <Link to="/profile">Profile</Link>
          </Button>
        }
      />
      <div className="container mx-auto max-w-2xl space-y-4 px-4 pb-24">
        <Card data-testid="language-mix-explainer">
          <CardContent className="space-y-2 pt-6">
            {/* Viewer-facing wording only — the serving ratio behind the mix is
                internal policy and is deliberately never quoted in the UI. */}
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Globe className="h-4 w-4 text-primary" /> Your language mix
            </p>
            <p className="text-xs text-muted-foreground">
              {primaryLabel
                ? `Your feed mostly stays in ${primaryLabel} and content made for your region, with some beneficial content in the other languages you understand${others.length ? "" : " and from around the world"}.`
                : "Your feed mostly stays in your main language and content made for your region, with some beneficial content in the other languages you understand."}
            </p>
          </CardContent>
        </Card>



        <LanguageSettings />
      </div>
    </>
  );
}
