import { Link } from "react-router-dom";
import { Sparkles, Download, Users, Mic2, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface UpgradeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which locked feature triggered the sheet — shown as the headline. */
  feature?: string;
}

const BENEFITS = [
  { icon: Mic2, text: "Exclusive world-class reciters and Riwāyah variants" },
  { icon: Download, text: "Unlimited offline downloads that don't expire" },
  { icon: Users, text: "Up to 5 family seats on one plan" },
  { icon: ShieldCheck, text: "Ad-free listening across every device" },
];

/**
 * Bottom sheet CTA shown when a non-premium user tries to open gated content.
 * Reads no state itself — parent controls visibility.
 */
export default function UpgradeSheet({ open, onOpenChange, feature }: UpgradeSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
        <SheetHeader className="text-left">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <SheetTitle className="font-heading text-xl">
            {feature ? `${feature} is a Heartify+ feature` : "Unlock Heartify+"}
          </SheetTitle>
          <SheetDescription>
            Join thousands of listeners deepening their relationship with the Qur'an.
          </SheetDescription>
        </SheetHeader>
        <ul className="mt-6 space-y-3">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm text-foreground">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--gold))]" aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2">
          <Button
            asChild
            size="lg"
            className="w-full bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground,var(--background)))] hover:bg-[hsl(var(--gold))]/90 focus-visible:ring-[hsl(var(--gold))] focus-visible:ring-offset-2 shadow-sm active:scale-[0.98] transition-transform"
          >
            <Link to="/plus" onClick={() => onOpenChange(false)}>See Heartify+ plans</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
