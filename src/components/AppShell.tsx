import { lazy, Suspense, type ReactNode } from "react";
import PageSkeleton from "./PageSkeleton";
import { MobileBridge } from "./MobileBridge";
import ReferralBridge from "./ReferralBridge";
import AdhanNotifier from "./AdhanNotifier";
import OfflineSweeper from "./OfflineSweeper";
import GatedPreviewGuard from "./premium/GatedPreviewGuard";
import RouteTransition from "./RouteTransition";
import BackToTop from "./BackToTop";
import BottomTabBar from "./BottomTabBar";
import EdgeSwipeBack from "./EdgeSwipeBack";
import KeyboardFocusScroller from "./KeyboardFocusScroller";
import ScrollRestoration from "./ScrollRestoration";
import SkipLink from "./SkipLink";
import OfflineBanner from "./OfflineBanner";
import SessionPushNudge from "./SessionPushNudge";
import { FeedDiversityProvider } from "@/contexts/FeedDiversityContext";

const CommandPalette = lazy(() => import("./CommandPalette"));
const PushPermissionPrompt = lazy(() => import("./PushPermissionPrompt"));
const StreakMilestoneDialog = lazy(() => import("./StreakMilestoneDialog"));
const StreakFreezeUsedToast = lazy(() => import("./StreakFreezeUsedToast"));
const WelcomeBackDialog = lazy(() => import("./WelcomeBackDialog"));
const InstallPromptBanner = lazy(() => import("./InstallPromptBanner"));

const RouteFallback = () => (
  <div className="min-h-dvh bg-background">
    <PageSkeleton variant="default" />
  </div>
);

/**
 * AppShell — global chrome that wraps every route.
 *
 * Extracted from App.tsx in W1/M2 as a pure refactor. Contains:
 *  - Accessibility helpers (SkipLink, KeyboardFocusScroller, ScrollRestoration)
 *  - Persistent chrome (BottomTabBar, EdgeSwipeBack, OfflineBanner, BackToTop)
 *  - Cross-cutting bridges (MobileBridge, ReferralBridge, AdhanNotifier, OfflineSweeper, GatedPreviewGuard)
 *  - Lazy overlay dialogs (CommandPalette, PushPermissionPrompt, StreakMilestoneDialog)
 *  - FeedDiversityProvider + Suspense + RouteTransition around the route tree
 *
 * NOTE: This component MUST render inside <BrowserRouter> — it uses
 * react-router hooks transitively (RouteTransition, ScrollRestoration, etc.).
 */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <OfflineBanner />
      <ScrollRestoration />
      <MobileBridge />
      <ReferralBridge />
      <AdhanNotifier />
      <GatedPreviewGuard />
      <OfflineSweeper />
      <BackToTop />
      <Suspense fallback={null}><PushPermissionPrompt /></Suspense>
      <SessionPushNudge />
      <Suspense fallback={null}><CommandPalette /></Suspense>
      <Suspense fallback={null}><StreakMilestoneDialog /></Suspense>
      <Suspense fallback={null}><StreakFreezeUsedToast /></Suspense>
      <Suspense fallback={null}><WelcomeBackDialog /></Suspense>
      <BottomTabBar />
      <EdgeSwipeBack />
      <KeyboardFocusScroller />
      <FeedDiversityProvider>
        <Suspense fallback={<RouteFallback />}>
          <RouteTransition>{children}</RouteTransition>
        </Suspense>
      </FeedDiversityProvider>
    </>
  );
}
