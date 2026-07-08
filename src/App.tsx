import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import NotFound from "./pages/NotFound.tsx";
import { MobileBridge } from "./components/MobileBridge";
import ReferralBridge from "./components/ReferralBridge";
import ErrorBoundary from "./components/ErrorBoundary";

// Code-split everything else
const Watch = lazy(() => import("./pages/Watch.tsx"));
const SearchResults = lazy(() => import("./pages/SearchResults.tsx"));
const SectionAll = lazy(() => import("./pages/SectionAll.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const Channels = lazy(() => import("./pages/Channels.tsx"));
const ModerationLog = lazy(() => import("./pages/ModerationLog.tsx"));
const Audit = lazy(() => import("./pages/Audit.tsx"));
const AdminConsole = lazy(() => import("./pages/AdminConsole.tsx"));
const AdminReview = lazy(() => import("./pages/AdminReview.tsx"));
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard.tsx"));
const ChannelTrust = lazy(() => import("./pages/ChannelTrust.tsx"));
const Analytics = lazy(() => import("./pages/Analytics.tsx"));
const AudioIntegrity = lazy(() => import("./pages/AudioIntegrity.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <LocaleProvider>
          <PlayerProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <MobileBridge />
            <ReferralBridge />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/watch/:videoId" element={<Watch />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/section/:sectionId" element={<SectionAll />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/channels" element={<Channels />} />
                <Route path="/admin/moderation" element={<ModerationLog />} />
                <Route path="/admin/audit" element={<Audit />} />
                <Route path="/admin/console" element={<AdminConsole />} />
                <Route path="/admin/review" element={<AdminReview />} />
                <Route path="/owner" element={<OwnerDashboard />} />
                <Route path="/admin/channel-trust" element={<ChannelTrust />} />
                <Route path="/admin/analytics" element={<Analytics />} />
                <Route path="/admin/audio-integrity" element={<AudioIntegrity />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </PlayerProvider>
          </LocaleProvider>
      </AuthProvider>
    </ThemeProvider>
  </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
