import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import AdminRoute from "./components/AdminRoute";

// Code-split everything else
const Watch = lazy(() => import("./pages/Watch.tsx"));
const SearchResults = lazy(() => import("./pages/SearchResults.tsx"));
const SectionAll = lazy(() => import("./pages/SectionAll.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const Channels = lazy(() => import("./pages/Channels.tsx"));
const ModerationLog = lazy(() => import("./pages/ModerationLog.tsx"));
const Audit = lazy(() => import("./pages/Audit.tsx"));
const AdminConsole = lazy(() => import("./pages/AdminConsole.tsx"));
const AdminReview = lazy(() => import("./pages/AdminReview.tsx"));
const AdminReports = lazy(() => import("./pages/AdminReports.tsx"));
const AdminEntitlements = lazy(() => import("./pages/AdminEntitlements.tsx"));

const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard.tsx"));
const ChannelTrust = lazy(() => import("./pages/ChannelTrust.tsx"));
const Analytics = lazy(() => import("./pages/Analytics.tsx"));
const AudioIntegrity = lazy(() => import("./pages/AudioIntegrity.tsx"));
const MfaEnroll = lazy(() => import("./pages/MfaEnroll.tsx"));
const MfaVerify = lazy(() => import("./pages/MfaVerify.tsx"));
const AdminRoles = lazy(() => import("./pages/AdminRoles.tsx"));
const AdminGsc = lazy(() => import("./pages/AdminGsc.tsx"));
const AdminPermissions = lazy(() => import("./pages/AdminPermissions.tsx"));
const AdminAlerts = lazy(() => import("./pages/AdminAlerts.tsx"));
const Prayer = lazy(() => import("./pages/Prayer.tsx"));
const Quran = lazy(() => import("./pages/Quran.tsx"));
const Dhikr = lazy(() => import("./pages/Dhikr.tsx"));
const Adhkar = lazy(() => import("./pages/Adhkar.tsx"));
const Zakat = lazy(() => import("./pages/Zakat.tsx"));
const HijriCalendar = lazy(() => import("./pages/HijriCalendar.tsx"));
const AsmaUlHusna = lazy(() => import("./pages/AsmaUlHusna.tsx"));
const MosqueFinder = lazy(() => import("./pages/MosqueFinder.tsx"));

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
                <Route path="/about" element={<About />} />
                <Route path="/prayer" element={<Prayer />} />
                <Route path="/quran" element={<Quran />} />
                <Route path="/quran/:surah" element={<Quran />} />
                <Route path="/dhikr" element={<Dhikr />} />
                <Route path="/adhkar" element={<Adhkar />} />
                <Route path="/zakat" element={<Zakat />} />
                <Route path="/hijri" element={<HijriCalendar />} />
                <Route path="/names" element={<AsmaUlHusna />} />
                <Route path="/mosques" element={<MosqueFinder />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/owner-profile" element={<Navigate to="/owner" replace />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/channels" element={<Channels />} />
                <Route path="/admin" element={<Navigate to="/admin/console" replace />} />
                <Route path="/admin/moderation" element={<AdminRoute><ModerationLog /></AdminRoute>} />
                <Route path="/admin/audit" element={<AdminRoute><Audit /></AdminRoute>} />
                <Route path="/admin/console" element={<AdminRoute><AdminConsole /></AdminRoute>} />
                <Route path="/admin/review" element={<AdminRoute><AdminReview /></AdminRoute>} />
                <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
                <Route path="/admin/entitlements" element={<AdminRoute><AdminEntitlements /></AdminRoute>} />

                <Route path="/owner" element={<AdminRoute><OwnerDashboard /></AdminRoute>} />
                <Route path="/admin/channel-trust" element={<AdminRoute><ChannelTrust /></AdminRoute>} />
                <Route path="/admin/analytics" element={<AdminRoute><Analytics /></AdminRoute>} />
                <Route path="/admin/audio-integrity" element={<AdminRoute><AudioIntegrity /></AdminRoute>} />
                <Route path="/admin/roles" element={<AdminRoute><AdminRoles /></AdminRoute>} />
                <Route path="/admin/gsc" element={<AdminRoute><AdminGsc /></AdminRoute>} />
                <Route path="/admin/permissions" element={<AdminRoute><AdminPermissions /></AdminRoute>} />
                <Route path="/admin/alerts" element={<AdminRoute><AdminAlerts /></AdminRoute>} />
                <Route path="/security/mfa" element={<MfaEnroll />} />
                <Route path="/security/mfa/verify" element={<MfaVerify />} />
                <Route path="/mfa-enroll" element={<Navigate to="/security/mfa" replace />} />
                <Route path="/mfa-verify" element={<Navigate to="/security/mfa/verify" replace />} />
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
