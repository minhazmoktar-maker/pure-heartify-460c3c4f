import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/contexts/LocaleContext";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n";

/**
 * Compact language switcher — surfaces globalization on every page.
 * Delegates persistence to LocaleContext, which mirrors to Cloud when signed in.
 */
const LanguageSwitcher = () => {
  const { locale, setLocale } = useLocale();
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="tap-target flex items-center gap-1 rounded-full px-2 hover:bg-secondary transition-colors"
        aria-label="Change language"
        title="Change language"
      >
        <Globe className="h-5 w-5 text-foreground" />
        <span className="hidden text-xs font-medium uppercase text-muted-foreground sm:inline">
          {current?.code ?? "en"}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLocale(l.code as LanguageCode)}
            className={l.code === locale ? "font-semibold text-primary" : ""}
          >
            <span className="mr-2 w-8 text-xs uppercase text-muted-foreground">
              {l.code}
            </span>
            {l.native}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
