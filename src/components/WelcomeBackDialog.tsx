import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { track } from "@/lib/analytics";

const LAST_SEEN_KEY = "heartify:last-seen-at";
const SHOWN_KEY = "heartify:welcome-back-shown-at";
const ABSENCE_DAYS = 7;

/**
 * Welcome-back modal: fires once when a signed-in user returns after
 * being away for more than 7 days. Non-punitive framing — offers a
 * one-tap resume path back to Today, and reassures that their streak
 * can be restarted right now.
 *
 * Storage: localStorage stores the last-seen timestamp per browser.
 * Shown timestamp guards against re-firing within 30 days.
 */
export function WelcomeBackDialog() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [daysAway, setDaysAway] = useState(0);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const now = Date.now();
    try {
      const lastSeen = Number(window.localStorage.getItem(LAST_SEEN_KEY) || 0);
      const lastShown = Number(window.localStorage.getItem(SHOWN_KEY) || 0);
      window.localStorage.setItem(LAST_SEEN_KEY, String(now));
      if (!lastSeen) return; // first visit
      const daysSince = Math.floor((now - lastSeen) / (1000 * 60 * 60 * 24));
      const daysSinceShown = Math.floor((now - lastShown) / (1000 * 60 * 60 * 24));
      if (daysSince >= ABSENCE_DAYS && daysSinceShown >= 30) {
        setDaysAway(daysSince);
        setOpen(true);
        window.localStorage.setItem(SHOWN_KEY, String(now));
        void track("welcome_back_shown", { days_away: daysSince });
      }
    } catch {
      /* ignore storage errors */
    }
  }, [user]);

  const resume = () => {
    void track("welcome_back_resume_click", { days_away: daysAway });
    setOpen(false);
    nav("/?today=1");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <DialogTitle className="text-xl font-semibold">Welcome back</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            It's been {daysAway} days. Pick up right where you left off — one small step
            today is enough to begin again.
          </DialogDescription>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Button size="lg" onClick={resume} className="w-full gap-2">
            <Sparkles className="h-4 w-4" aria-hidden /> Continue today's practice
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WelcomeBackDialog;
