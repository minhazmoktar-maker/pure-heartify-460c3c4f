import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PageSkeleton from "./components/PageSkeleton";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlayerProvider } from "@/contexts/PlayerContext";
import GatedPreviewGuard from "@/components/premium/GatedPreviewGuard";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import NotFound from "./pages/NotFound.tsx";
const OAuthConsent = lazy(() => import("./pages/OAuthConsent.tsx"));
import { MobileBridge } from "./components/MobileBridge";
import ReferralBridge from "./components/ReferralBridge";
import AdhanNotifier from "./components/AdhanNotifier";
import OfflineSweeper from "./components/OfflineSweeper";
import ErrorBoundary from "./components/ErrorBoundary";
import AdminRoute from "./components/AdminRoute";
import RouteTransition from "./components/RouteTransition";
import BackToTop from "./components/BackToTop";
import AgeGate from "./components/AgeGate";
import CookieConsent from "./components/CookieConsent";
import CommandPalette from "./components/CommandPalette";
import BottomTabBar from "./components/BottomTabBar";
import ScrollRestoration from "./components/ScrollRestoration";
import { KidsModeProvider } from "./contexts/KidsModeContext";

const Shorts = lazy(() => import("./pages/Shorts.tsx"));
const Mushaf = lazy(() => import("./pages/Mushaf.tsx"));
const Redeem = lazy(() => import("./pages/Redeem.tsx"));
const Changelog = lazy(() => import("./pages/Changelog.tsx"));

const About = lazy(() => import("./pages/About.tsx"));
const Trust = lazy(() => import("./pages/Trust.tsx"));
const Status = lazy(() => import("./pages/Status.tsx"));
const Creators = lazy(() => import("./pages/Creators.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const ExportData = lazy(() => import("./pages/ExportData.tsx"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail.tsx"));
const Achievements = lazy(() => import("./pages/Achievements.tsx"));
const AdabPage = lazy(() => import("./pages/AdabPage.tsx"));
const AdhanIqamah = lazy(() => import("./pages/AdhanIqamah.tsx"));
const Adhkar = lazy(() => import("./pages/Adhkar.tsx"));
const AdminConsole = lazy(() => import("./pages/AdminConsole.tsx"));
const AdminEntitlements = lazy(() => import("./pages/AdminEntitlements.tsx"));
const AdminModeration = lazy(() => import("./pages/AdminModeration.tsx"));
const AdminSLA = lazy(() => import("./pages/AdminSLA.tsx"));
const AdminReports = lazy(() => import("./pages/AdminReports.tsx"));
const AdminReview = lazy(() => import("./pages/AdminReview.tsx"));
const AdminRoles = lazy(() => import("./pages/AdminRoles.tsx"));
const AdminUsers = lazy(() => import("./pages/AdminUsers.tsx"));

const AhlulBayt = lazy(() => import("./pages/AhlulBayt.tsx"));
const Akhlaq = lazy(() => import("./pages/Akhlaq.tsx"));
const Alphabet = lazy(() => import("./pages/Alphabet.tsx"));
const Analytics = lazy(() => import("./pages/Analytics.tsx"));
const Aqeedah = lazy(() => import("./pages/Aqeedah.tsx"));
const AsmaUlHusna = lazy(() => import("./pages/AsmaUlHusna.tsx"));
const AudioIntegrity = lazy(() => import("./pages/AudioIntegrity.tsx"));
const Audit = lazy(() => import("./pages/Audit.tsx"));
const BabyNames = lazy(() => import("./pages/BabyNames.tsx"));
const Battles = lazy(() => import("./pages/Battles.tsx"));
const Bookmarks = lazy(() => import("./pages/Bookmarks.tsx"));
const Challenges = lazy(() => import("./pages/Challenges.tsx"));
const ChannelTrust = lazy(() => import("./pages/ChannelTrust.tsx"));
const Channels = lazy(() => import("./pages/Channels.tsx"));
const Dhikr = lazy(() => import("./pages/Dhikr.tsx"));
const Dreams = lazy(() => import("./pages/Dreams.tsx"));
const DuaWall = lazy(() => import("./pages/DuaWall.tsx"));
const EatingSunnah = lazy(() => import("./pages/EatingSunnah.tsx"));
const FarewellSermon = lazy(() => import("./pages/FarewellSermon.tsx"));
const Fasting = lazy(() => import("./pages/Fasting.tsx"));
const Fatwa = lazy(() => import("./pages/Fatwa.tsx"));
const DigitalPurification = lazy(() => import("./pages/DigitalPurification.tsx"));
const Quotes = lazy(() => import("./pages/Quotes.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const Ghusl = lazy(() => import("./pages/Ghusl.tsx"));
const Glossary = lazy(() => import("./pages/Glossary.tsx"));
const HadithLibrary = lazy(() => import("./pages/HadithLibrary.tsx"));
const HadithSciences = lazy(() => import("./pages/HadithSciences.tsx"));
const Hajj = lazy(() => import("./pages/Hajj.tsx"));
const HeartifyPlus = lazy(() => import("./pages/HeartifyPlus.tsx"));
const PlusInvite = lazy(() => import("./pages/PlusInvite.tsx"));
const OfflineLibrary = lazy(() => import("./pages/OfflineLibrary.tsx"));
const HalalCheck = lazy(() => import("./pages/HalalCheck.tsx"));
const Hifz = lazy(() => import("./pages/Hifz.tsx"));
const HijriCalendar = lazy(() => import("./pages/HijriCalendar.tsx"));
const Hisnul = lazy(() => import("./pages/Hisnul.tsx"));
const Inheritance = lazy(() => import("./pages/Inheritance.tsx"));
const IslamicEvents = lazy(() => import("./pages/IslamicEvents.tsx"));
const IslamicFinance = lazy(() => import("./pages/IslamicFinance.tsx"));
const IslamicHistory = lazy(() => import("./pages/IslamicHistory.tsx"));
const Janazah = lazy(() => import("./pages/Janazah.tsx"));
const JannahDescriptions = lazy(() => import("./pages/JannahDescriptions.tsx"));
const Journal = lazy(() => import("./pages/Journal.tsx"));
const Kalimahs = lazy(() => import("./pages/Kalimahs.tsx"));
const Khatm = lazy(() => import("./pages/Khatm.tsx"));
const GroupKhatm = lazy(() => import("./pages/GroupKhatm.tsx"));
const GroupKhatmDetail = lazy(() => import("./pages/GroupKhatmDetail.tsx"));
const GroupKhatmJoin = lazy(() => import("./pages/GroupKhatmJoin.tsx"));
const AdminViral = lazy(() => import("./pages/AdminViral.tsx"));
const Leaderboards = lazy(() => import("./pages/Leaderboards.tsx"));
const TeamStreaks = lazy(() => import("./pages/TeamStreaks.tsx"));
const DhikrCircles = lazy(() => import("./pages/DhikrCircles.tsx"));
const PublicDhikrCircle = lazy(() => import("./pages/PublicDhikrCircle.tsx"));
const PublicDua = lazy(() => import("./pages/PublicDua.tsx"));
const PublicTeamStreak = lazy(() => import("./pages/PublicTeamStreak.tsx"));
const PublicKhatmGroup = lazy(() => import("./pages/PublicKhatmGroup.tsx"));
const PublicWeeklyRecap = lazy(() => import("./pages/PublicWeeklyRecap.tsx"));
const PublicBadge = lazy(() => import("./pages/PublicBadge.tsx"));
const PublicStreak = lazy(() => import("./pages/PublicStreak.tsx"));
const PublicAyah = lazy(() => import("./pages/PublicAyah.tsx"));
const PublicHadith = lazy(() => import("./pages/PublicHadith.tsx"));
const PublicName = lazy(() => import("./pages/PublicName.tsx"));
const PublicSurah = lazy(() => import("./pages/PublicSurah.tsx"));
const PublicHisn = lazy(() => import("./pages/PublicHisn.tsx"));
const PublicProphet = lazy(() => import("./pages/PublicProphet.tsx"));
const PublicSahabi = lazy(() => import("./pages/PublicSahabi.tsx"));
const PublicHijriMonth = lazy(() => import("./pages/PublicHijriMonth.tsx"));
const PublicIslamicEvent = lazy(() => import("./pages/PublicIslamicEvent.tsx"));
const PublicMasjid = lazy(() => import("./pages/PublicMasjid.tsx"));
const PublicKalimah = lazy(() => import("./pages/PublicKalimah.tsx"));
const PublicSalah = lazy(() => import("./pages/PublicSalah.tsx"));
const PublicPillar = lazy(() => import("./pages/PublicPillar.tsx"));
const PublicIman = lazy(() => import("./pages/PublicIman.tsx"));
const PublicMadhhab = lazy(() => import("./pages/PublicMadhhab.tsx"));
const PublicSeerah = lazy(() => import("./pages/PublicSeerah.tsx"));
const PublicScholar = lazy(() => import("./pages/PublicScholar.tsx"));
const PublicJuz = lazy(() => import("./pages/PublicJuz.tsx"));
const PublicBattle = lazy(() => import("./pages/PublicBattle.tsx"));
const PublicMiracle = lazy(() => import("./pages/PublicMiracle.tsx"));
const PublicQuranDua = lazy(() => import("./pages/PublicQuranDua.tsx"));
const PublicAdhkarSet = lazy(() => import("./pages/PublicAdhkarSet.tsx"));
const PublicSunnahAct = lazy(() => import("./pages/PublicSunnahAct.tsx"));
const PublicDurood = lazy(() => import("./pages/PublicDurood.tsx"));
const PublicProphetName = lazy(() => import("./pages/PublicProphetName.tsx"));
const PublicSignOfHour = lazy(() => import("./pages/PublicSignOfHour.tsx"));
const PublicMosque = lazy(() => import("./pages/PublicMosque.tsx"));
const PublicVirtue = lazy(() => import("./pages/PublicVirtue.tsx"));

const KidsDuas = lazy(() => import("./pages/KidsDuas.tsx"));
const Learn = lazy(() => import("./pages/Learn.tsx"));
const Library = lazy(() => import("./pages/Library.tsx"));
const LibraryEntry = lazy(() => import("./pages/LibraryEntry.tsx"));
const Madhabs = lazy(() => import("./pages/Madhabs.tsx"));
const MajorSins = lazy(() => import("./pages/MajorSins.tsx"));
const MarriageRights = lazy(() => import("./pages/MarriageRights.tsx"));
const MasnoonDuas = lazy(() => import("./pages/MasnoonDuas.tsx"));
const MeansOfReward = lazy(() => import("./pages/MeansOfReward.tsx"));
const MfaEnroll = lazy(() => import("./pages/MfaEnroll.tsx"));
const MfaVerify = lazy(() => import("./pages/MfaVerify.tsx"));
const Miracles = lazy(() => import("./pages/Miracles.tsx"));
const ModerationLog = lazy(() => import("./pages/ModerationLog.tsx"));
const MosqueFinder = lazy(() => import("./pages/MosqueFinder.tsx"));
const MuslimRights = lazy(() => import("./pages/MuslimRights.tsx"));
const Nawawi40 = lazy(() => import("./pages/Nawawi40.tsx"));
const NewMuslim = lazy(() => import("./pages/NewMuslim.tsx"));
const Nikah = lazy(() => import("./pages/Nikah.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));

const Parenting = lazy(() => import("./pages/Parenting.tsx"));
const ParentsRights = lazy(() => import("./pages/ParentsRights.tsx"));
const Pillars = lazy(() => import("./pages/Pillars.tsx"));
const Prayer = lazy(() => import("./pages/Prayer.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const PublicProfile = lazy(() => import("./pages/PublicProfile.tsx"));
const Prophets = lazy(() => import("./pages/Prophets.tsx"));
const Purification = lazy(() => import("./pages/Purification.tsx"));
const Qibla = lazy(() => import("./pages/Qibla.tsx"));
const Quiz = lazy(() => import("./pages/Quiz.tsx"));
const Quran = lazy(() => import("./pages/Quran.tsx"));
const QuranSciences = lazy(() => import("./pages/QuranSciences.tsx"));
const Ramadan = lazy(() => import("./pages/Ramadan.tsx"));
const Recap = lazy(() => import("./pages/Recap.tsx"));
const Reminders = lazy(() => import("./pages/Reminders.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Ruqya = lazy(() => import("./pages/Ruqya.tsx"));
const SacredMosques = lazy(() => import("./pages/SacredMosques.tsx"));
const Sadaqah = lazy(() => import("./pages/Sadaqah.tsx"));
const Sahaba = lazy(() => import("./pages/Sahaba.tsx"));
const SalahGuide = lazy(() => import("./pages/SalahGuide.tsx"));
const SalahTracker = lazy(() => import("./pages/SalahTracker.tsx"));
const Scholars = lazy(() => import("./pages/Scholars.tsx"));
const SearchResults = lazy(() => import("./pages/SearchResults.tsx"));
const SectionAll = lazy(() => import("./pages/SectionAll.tsx"));
const SeekingKnowledge = lazy(() => import("./pages/SeekingKnowledge.tsx"));
const Seerah = lazy(() => import("./pages/Seerah.tsx"));
const SharedEconomy = lazy(() => import("./pages/SharedEconomy.tsx"));
const SignsOfHour = lazy(() => import("./pages/SignsOfHour.tsx"));
const Stories = lazy(() => import("./pages/Stories.tsx"));
const SunnahPrayers = lazy(() => import("./pages/SunnahPrayers.tsx"));
const Tajweed = lazy(() => import("./pages/Tajweed.tsx"));
const Tawbah = lazy(() => import("./pages/Tawbah.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const TibbNabawi = lazy(() => import("./pages/TibbNabawi.tsx"));
const Today = lazy(() => import("./pages/Today.tsx"));
const TravelAdab = lazy(() => import("./pages/TravelAdab.tsx"));
const UmrahGuide = lazy(() => import("./pages/UmrahGuide.tsx"));
const Wasiyyah = lazy(() => import("./pages/Wasiyyah.tsx"));
const Watch = lazy(() => import("./pages/Watch.tsx"));
const Wird = lazy(() => import("./pages/Wird.tsx"));
const WomensFiqh = lazy(() => import("./pages/WomensFiqh.tsx"));
const WomensPurity = lazy(() => import("./pages/WomensPurity.tsx"));
const WuduGuide = lazy(() => import("./pages/WuduGuide.tsx"));
const Zakat = lazy(() => import("./pages/Zakat.tsx"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings.tsx"));
const Playlists = lazy(() => import("./pages/Playlists.tsx"));
const PlaylistDetail = lazy(() => import("./pages/PlaylistDetail.tsx"));
const Appeals = lazy(() => import("./pages/Appeals.tsx"));
const Transparency = lazy(() => import("./pages/Transparency.tsx"));
const CreatorDashboard = lazy(() => import("./pages/CreatorDashboard.tsx"));
const AdminAppeals = lazy(() => import("./pages/AdminAppeals.tsx"));
const AdminExperiments = lazy(() => import("./pages/AdminExperiments.tsx"));
const AdminFeatureFlags = lazy(() => import("./pages/AdminFeatureFlags.tsx"));
const AdminRetention = lazy(() => import("./pages/AdminRetention.tsx"));


// Global React Query defaults — Phase 3 tuning.
// - 5-min freshness cuts refetches on route switches (feed, dua, prayer)
// - 30-min gcTime keeps cached data alive across quick nav bounces
// - retry=1 stops 5xx storms
// - refetchOnWindowFocus off — the app is a media surface, not a dashboard
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
    },
    mutations: {
      retry: 0,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-dvh bg-background">
    <PageSkeleton variant="default" />
  </div>
);

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <LocaleProvider>
          <KidsModeProvider>
          <PlayerProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollRestoration />
            <MobileBridge />
            <ReferralBridge />
            <AdhanNotifier />
            <GatedPreviewGuard />
            <OfflineSweeper />
            <BackToTop />
            <AgeGate />
            <CookieConsent />
            <CommandPalette />
            <BottomTabBar />
            <Suspense fallback={<RouteFallback />}>
              <RouteTransition>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/watch/:videoId" element={<Watch />} />
                <Route path="/shorts" element={<Shorts />} />
                <Route path="/mushaf" element={<Mushaf />} />
                <Route path="/mushaf/:page" element={<Mushaf />} />
                <Route path="/redeem" element={<Redeem />} />
                <Route path="/changelog" element={<Changelog />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/section/:sectionId" element={<SectionAll />} />
                <Route path="/login" element={<Login />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/about" element={<About />} />
                <Route path="/trust" element={<Trust />} />
                <Route path="/status" element={<Status />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/account/export-data" element={<ExportData />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/creators" element={<Creators />} />
                <Route path="/plus" element={<HeartifyPlus />} />
                <Route path="/plus/join" element={<PlusInvite />} />
                <Route path="/offline" element={<OfflineLibrary />} />
                <Route path="/premium" element={<Navigate to="/plus" replace />} />
                <Route path="/pricing" element={<Navigate to="/plus" replace />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/settings/notifications" element={<NotificationSettings />} />
                <Route path="/playlists" element={<Playlists />} />
                <Route path="/p/:id" element={<PlaylistDetail />} />
                <Route path="/appeals" element={<Appeals />} />
                <Route path="/appeals/:decisionId" element={<Appeals />} />
                <Route path="/transparency" element={<Transparency />} />
                <Route path="/creators/dashboard" element={<CreatorDashboard />} />
                <Route path="/admin/appeals" element={<AdminRoute><AdminAppeals /></AdminRoute>} />
                <Route path="/admin/experiments" element={<AdminRoute><AdminExperiments /></AdminRoute>} />
                <Route path="/admin/feature-flags" element={<AdminRoute><AdminFeatureFlags /></AdminRoute>} />
                <Route path="/admin/retention" element={<AdminRoute><AdminRetention /></AdminRoute>} />
                <Route path="/channels" element={<Channels />} />
                <Route path="/library" element={<Library />} />
                <Route path="/library/:slug" element={<LibraryEntry />} />
                <Route path="/prayer" element={<Prayer />} />
                <Route path="/quran" element={<Quran />} />
                <Route path="/quran/:surah" element={<Quran />} />
                <Route path="/dhikr" element={<Dhikr />} />
                <Route path="/adhkar" element={<Adhkar />} />
                <Route path="/zakat" element={<Zakat />} />
                <Route path="/hijri" element={<HijriCalendar />} />
                <Route path="/names" element={<AsmaUlHusna />} />
                <Route path="/mosques" element={<MosqueFinder />} />
                <Route path="/hadith" element={<HadithLibrary />} />
                <Route path="/salah" element={<SalahTracker />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/challenges" element={<Challenges />} />
                <Route path="/today" element={<Today />} />
                <Route path="/reminders" element={<Reminders />} />
                <Route path="/recap" element={<Recap />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/khatm" element={<Khatm />} />
                <Route path="/khatm/groups" element={<GroupKhatm />} />
                <Route path="/khatm/group/:id" element={<GroupKhatmDetail />} />
                <Route path="/khatm/join/:code" element={<GroupKhatmJoin />} />
                <Route path="/leaderboards" element={<Leaderboards />} />
                <Route path="/teams" element={<TeamStreaks />} />
                <Route path="/dhikr/circles" element={<DhikrCircles />} />
                <Route path="/c/:id" element={<PublicDhikrCircle />} />
                <Route path="/d/:id" element={<PublicDua />} />
                <Route path="/t/:id" element={<PublicTeamStreak />} />
                <Route path="/k/:id" element={<PublicKhatmGroup />} />
                <Route path="/w/:handle/:week" element={<PublicWeeklyRecap />} />
                <Route path="/b/:handle/:badgeId" element={<PublicBadge />} />
                <Route path="/s/:handle/:days" element={<PublicStreak />} />
                <Route path="/ayah/:surah/:verse" element={<PublicAyah />} />
                <Route path="/hadith/:collection/:number" element={<PublicHadith />} />
                <Route path="/name/:index" element={<PublicName />} />
                <Route path="/surah/:number" element={<PublicSurah />} />
                <Route path="/hisn/:id" element={<PublicHisn />} />
                <Route path="/prophet/:slug" element={<PublicProphet />} />
                <Route path="/sahabi/:slug" element={<PublicSahabi />} />
                <Route path="/hijri-month/:slug" element={<PublicHijriMonth />} />
                <Route path="/event/:slug" element={<PublicIslamicEvent />} />
                <Route path="/masjid/:slug" element={<PublicMasjid />} />
                <Route path="/kalimah/:n" element={<PublicKalimah />} />
                <Route path="/salah/:slug" element={<PublicSalah />} />
                <Route path="/pillar/:n" element={<PublicPillar />} />
                <Route path="/iman/:n" element={<PublicIman />} />
                <Route path="/madhhab/:slug" element={<PublicMadhhab />} />
                <Route path="/seerah/:id" element={<PublicSeerah />} />
                <Route path="/scholar/:slug" element={<PublicScholar />} />
                <Route path="/juz/:n" element={<PublicJuz />} />
                <Route path="/battle/:slug" element={<PublicBattle />} />
                <Route path="/miracle/:slug" element={<PublicMiracle />} />
                <Route path="/quran-dua/:slug" element={<PublicQuranDua />} />
                <Route path="/adhkar-set/:id" element={<PublicAdhkarSet />} />
                <Route path="/sunnah/:slug" element={<PublicSunnahAct />} />
                <Route path="/durood/:slug" element={<PublicDurood />} />
                <Route path="/prophet-name/:slug" element={<PublicProphetName />} />
                <Route path="/sign-of-hour/:slug" element={<PublicSignOfHour />} />
                <Route path="/mosque/:slug" element={<PublicMosque />} />
                <Route path="/virtue/:slug" element={<PublicVirtue />} />
                <Route path="/u/:handle" element={<PublicProfile />} />

                <Route path="/bookmarks" element={<Bookmarks />} />
                <Route path="/fasting" element={<Fasting />} />
                <Route path="/seerah" element={<Seerah />} />
                <Route path="/learn" element={<Learn />} />
                <Route path="/wird" element={<Wird />} />
                <Route path="/sadaqah" element={<Sadaqah />} />
                <Route path="/wasiyyah" element={<Wasiyyah />} />
                <Route path="/ramadan" element={<Ramadan />} />
                <Route path="/hajj" element={<Hajj />} />
                <Route path="/qibla" element={<Qibla />} />
                <Route path="/halal-check" element={<HalalCheck />} />
                <Route path="/dua-wall" element={<DuaWall />} />
                <Route path="/baby-names" element={<BabyNames />} />
                <Route path="/nikah" element={<Nikah />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/stories" element={<Stories />} />
                <Route path="/new-muslim" element={<NewMuslim />} />
                <Route path="/hifz" element={<Hifz />} />
                <Route path="/dreams" element={<Dreams />} />
                <Route path="/alphabet" element={<Alphabet />} />
                <Route path="/tajweed" element={<Tajweed />} />
                <Route path="/glossary" element={<Glossary />} />
                <Route path="/events" element={<IslamicEvents />} />
                <Route path="/inheritance" element={<Inheritance />} />
                <Route path="/wudu" element={<WuduGuide />} />
                <Route path="/salah-guide" element={<SalahGuide />} />
                <Route path="/fatwa" element={<Fatwa />} />
                <Route path="/digital-purification" element={<DigitalPurification />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/ruqya" element={<Ruqya />} />
                <Route path="/nawawi-40" element={<Nawawi40 />} />
                <Route path="/prophets" element={<Prophets />} />
                <Route path="/sahaba" element={<Sahaba />} />
                <Route path="/islamic-finance" element={<IslamicFinance />} />
                <Route path="/adab" element={<AdabPage />} />
                <Route path="/parenting" element={<Parenting />} />
                <Route path="/marriage-rights" element={<MarriageRights />} />
                <Route path="/janazah" element={<Janazah />} />
                <Route path="/tibb" element={<TibbNabawi />} />
                <Route path="/umrah" element={<UmrahGuide />} />
                <Route path="/womens-fiqh" element={<WomensFiqh />} />
                <Route path="/aqeedah" element={<Aqeedah />} />
                <Route path="/history" element={<IslamicHistory />} />
                <Route path="/scholars" element={<Scholars />} />
                <Route path="/akhlaq" element={<Akhlaq />} />
                <Route path="/signs-of-hour" element={<SignsOfHour />} />
                <Route path="/sunnah-prayers" element={<SunnahPrayers />} />
                <Route path="/kalimahs" element={<Kalimahs />} />
                <Route path="/masnoon-duas" element={<MasnoonDuas />} />
                <Route path="/purification" element={<Purification />} />
                <Route path="/travel-adab" element={<TravelAdab />} />
                <Route path="/eating-sunnah" element={<EatingSunnah />} />
                <Route path="/means-of-reward" element={<MeansOfReward />} />
                <Route path="/major-sins" element={<MajorSins />} />
                <Route path="/tawbah" element={<Tawbah />} />
                <Route path="/jannah" element={<JannahDescriptions />} />
                <Route path="/pillars" element={<Pillars />} />
                <Route path="/sacred-mosques" element={<SacredMosques />} />
                <Route path="/madhabs" element={<Madhabs />} />
                <Route path="/quran-sciences" element={<QuranSciences />} />
                <Route path="/hadith-sciences" element={<HadithSciences />} />
                <Route path="/battles" element={<Battles />} />
                <Route path="/miracles" element={<Miracles />} />
                <Route path="/farewell-sermon" element={<FarewellSermon />} />
                <Route path="/ahlul-bayt" element={<AhlulBayt />} />
                <Route path="/kids-duas" element={<KidsDuas />} />
                <Route path="/hisnul" element={<Hisnul />} />
                <Route path="/seeking-knowledge" element={<SeekingKnowledge />} />
                <Route path="/parents-rights" element={<ParentsRights />} />
                <Route path="/muslim-rights" element={<MuslimRights />} />
                <Route path="/womens-purity" element={<WomensPurity />} />
                <Route path="/adhan-iqamah" element={<AdhanIqamah />} />
                <Route path="/ghusl" element={<Ghusl />} />
                <Route path="/shared-economy" element={<SharedEconomy />} />

                <Route path="/admin" element={<Navigate to="/admin/console" replace />} />
                <Route path="/admin/moderation" element={<AdminRoute><AdminModeration /></AdminRoute>} />
                <Route path="/admin/sla" element={<AdminRoute><AdminSLA /></AdminRoute>} />
                <Route path="/admin/viral" element={<AdminRoute><AdminViral /></AdminRoute>} />

                <Route path="/admin/moderation-log" element={<Navigate to="/admin/moderation" replace />} />
                <Route path="/admin/audit" element={<AdminRoute><Audit /></AdminRoute>} />
                <Route path="/admin/console" element={<AdminRoute><AdminConsole /></AdminRoute>} />
                <Route path="/admin/review" element={<Navigate to="/admin/moderation" replace />} />
                <Route path="/admin/reports" element={<Navigate to="/admin/moderation" replace />} />
                <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                <Route path="/admin/entitlements" element={<Navigate to="/admin/users" replace />} />
                <Route path="/admin/roles" element={<Navigate to="/admin/users" replace />} />
                <Route path="/owner" element={<Navigate to="/admin/users" replace />} />
                <Route path="/admin/channel-trust" element={<AdminRoute><ChannelTrust /></AdminRoute>} />
                <Route path="/admin/analytics" element={<AdminRoute><Analytics /></AdminRoute>} />
                <Route path="/admin/audio-integrity" element={<AdminRoute><AudioIntegrity /></AdminRoute>} />
                <Route path="/admin/gsc" element={<Navigate to="/admin/users" replace />} />
                <Route path="/admin/permissions" element={<Navigate to="/admin/users" replace />} />
                <Route path="/admin/alerts" element={<Navigate to="/admin/users" replace />} />
                <Route path="/owner-profile" element={<Navigate to="/admin/users" replace />} />

                <Route path="/mfa-enroll" element={<Navigate to="/security/mfa" replace />} />
                <Route path="/mfa-verify" element={<Navigate to="/security/mfa/verify" replace />} />
                <Route path="/security/mfa" element={<MfaEnroll />} />
                <Route path="/security/mfa/verify" element={<MfaVerify />} />

                {/* Legacy content pages redirect into the Library */}
                <Route path="/ai-in-islam" element={<Navigate to="/library/ai-in-islam" replace />} />
                <Route path="/abbasid-era" element={<Navigate to="/library/abbasid-era" replace />} />
                <Route path="/abortion-rulings" element={<Navigate to="/library/abortion-rulings" replace />} />
                <Route path="/adab-of-masjid" element={<Navigate to="/library/adab-of-masjid" replace />} />
                <Route path="/addiction-recovery" element={<Navigate to="/library/addiction-recovery" replace />} />
                <Route path="/adoption-kafalah" element={<Navigate to="/library/adoption-kafalah" replace />} />
                <Route path="/al-wala-wal-bara" element={<Navigate to="/library/al-wala-wal-bara" replace />} />
                <Route path="/alcohol-rulings" element={<Navigate to="/library/alcohol-rulings" replace />} />
                <Route path="/andalus-heritage" element={<Navigate to="/library/andalus-heritage" replace />} />
                <Route path="/angels-in-islam" element={<Navigate to="/library/angels-in-islam" replace />} />
                <Route path="/anger" element={<Navigate to="/library/anger" replace />} />
                <Route path="/animal-rights" element={<Navigate to="/library/animal-rights" replace />} />
                <Route path="/aqidah-tahawiyyah" element={<Navigate to="/library/aqidah-tahawiyyah" replace />} />
                <Route path="/aqiqah" element={<Navigate to="/library/aqiqah" replace />} />
                <Route path="/aqiqah-rules" element={<Navigate to="/library/aqiqah-rules" replace />} />
                <Route path="/arabic-learning" element={<Navigate to="/library/arabic-learning" replace />} />
                <Route path="/ashura" element={<Navigate to="/library/ashura" replace />} />
                <Route path="/asma-wa-sifat" element={<Navigate to="/library/asma-wa-sifat" replace />} />
                <Route path="/atheism-response" element={<Navigate to="/library/atheism-response" replace />} />
                <Route path="/awwabin" element={<Navigate to="/library/awwabin" replace />} />
                <Route path="/badr-lessons" element={<Navigate to="/library/badr-lessons" replace />} />
                <Route path="/barakah" element={<Navigate to="/library/barakah" replace />} />
                <Route path="/barzakh-afterlife" element={<Navigate to="/library/barzakh-afterlife" replace />} />
                <Route path="/islamic-bedtime-stories" element={<Navigate to="/library/islamic-bedtime-stories" replace />} />
                <Route path="/bidah" element={<Navigate to="/library/bidah" replace />} />
                <Route path="/books-of-allah" element={<Navigate to="/library/books-of-allah" replace />} />
                <Route path="/breastfeeding-fiqh" element={<Navigate to="/library/breastfeeding-fiqh" replace />} />
                <Route path="/business-ethics" element={<Navigate to="/library/business-ethics" replace />} />
                <Route path="/charity-discovery" element={<Navigate to="/library/charity-discovery" replace />} />
                <Route path="/childrens-rights" element={<Navigate to="/library/childrens-rights" replace />} />
                <Route path="/christianity-compared" element={<Navigate to="/library/christianity-compared" replace />} />
                <Route path="/contemporary-islam" element={<Navigate to="/library/contemporary-islam" replace />} />
                <Route path="/contraception-islam" element={<Navigate to="/library/contraception-islam" replace />} />
                <Route path="/creator-program" element={<Navigate to="/library/creator-program" replace />} />
                <Route path="/crypto-islamic" element={<Navigate to="/library/crypto-islamic" replace />} />
                <Route path="/custody-rules" element={<Navigate to="/library/custody-rules" replace />} />
                <Route path="/dawah" element={<Navigate to="/library/dawah" replace />} />
                <Route path="/depression-anxiety" element={<Navigate to="/library/depression-anxiety" replace />} />
                <Route path="/dhikr-benefits" element={<Navigate to="/library/dhikr-benefits" replace />} />
                <Route path="/dhul-hijjah" element={<Navigate to="/library/dhul-hijjah" replace />} />
                <Route path="/digital-wellbeing" element={<Navigate to="/library/digital-wellbeing" replace />} />
                <Route path="/disability-islam" element={<Navigate to="/library/disability-islam" replace />} />
                <Route path="/disaster-relief" element={<Navigate to="/library/disaster-relief" replace />} />
                <Route path="/divorce-procedure" element={<Navigate to="/library/divorce-procedure" replace />} />
                <Route path="/dua-etiquette" element={<Navigate to="/library/dua-etiquette" replace />} />
                <Route path="/duha" element={<Navigate to="/library/duha" replace />} />
                <Route path="/elder-care" element={<Navigate to="/library/elder-care" replace />} />
                <Route path="/elders-rights" element={<Navigate to="/library/elders-rights" replace />} />
                <Route path="/environment-islam" element={<Navigate to="/library/environment-islam" replace />} />
                <Route path="/ethical-investing" element={<Navigate to="/library/ethical-investing" replace />} />
                <Route path="/evening-routine" element={<Navigate to="/library/evening-routine" replace />} />
                <Route path="/evil-eye-protection" element={<Navigate to="/library/evil-eye-protection" replace />} />
                <Route path="/fasting-rulings" element={<Navigate to="/library/fasting-rulings" replace />} />
                <Route path="/fath-makkah" element={<Navigate to="/library/fath-makkah" replace />} />
                <Route path="/feminism-islam" element={<Navigate to="/library/feminism-islam" replace />} />
                <Route path="/fidyah-kaffarah" element={<Navigate to="/library/fidyah-kaffarah" replace />} />
                <Route path="/financial-fraud" element={<Navigate to="/library/financial-fraud" replace />} />
                <Route path="/usul-fiqh" element={<Navigate to="/library/usul-fiqh" replace />} />
                <Route path="/fitrah" element={<Navigate to="/library/fitrah" replace />} />
                <Route path="/forbidden-prayer-times" element={<Navigate to="/library/forbidden-prayer-times" replace />} />
                <Route path="/free-mixing" element={<Navigate to="/library/free-mixing" replace />} />
                <Route path="/funeral-rites" element={<Navigate to="/library/funeral-rites" replace />} />
                <Route path="/gambling-rulings" element={<Navigate to="/library/gambling-rulings" replace />} />
                <Route path="/gender-roles" element={<Navigate to="/library/gender-roles" replace />} />
                <Route path="/ghibah" element={<Navigate to="/library/ghibah" replace />} />
                <Route path="/global-ulema-council" element={<Navigate to="/library/global-ulema-council" replace />} />
                <Route path="/hadith-grading" element={<Navigate to="/library/hadith-grading" replace />} />
                <Route path="/kutub-sittah" element={<Navigate to="/library/kutub-sittah" replace />} />
                <Route path="/hajj-logistics" element={<Navigate to="/library/hajj-logistics" replace />} />
                <Route path="/halal-careers" element={<Navigate to="/library/halal-careers" replace />} />
                <Route path="/halal-certification" element={<Navigate to="/library/halal-certification" replace />} />
                <Route path="/halal-cosmetics" element={<Navigate to="/library/halal-cosmetics" replace />} />
                <Route path="/halal-gaming" element={<Navigate to="/library/halal-gaming" replace />} />
                <Route path="/halal-haram-food" element={<Navigate to="/library/halal-haram-food" replace />} />
                <Route path="/halal-investing" element={<Navigate to="/library/halal-investing" replace />} />
                <Route path="/halal-kids-games" element={<Navigate to="/library/halal-kids-games" replace />} />
                <Route path="/halal-relationships" element={<Navigate to="/library/halal-relationships" replace />} />
                <Route path="/halal-restaurants" element={<Navigate to="/library/halal-restaurants" replace />} />
                <Route path="/halal-slaughter" element={<Navigate to="/library/halal-slaughter" replace />} />
                <Route path="/halal-travel" element={<Navigate to="/library/halal-travel" replace />} />
                <Route path="/hasad-evil-eye" element={<Navigate to="/library/hasad-evil-eye" replace />} />
                <Route path="/hayd-fiqh" element={<Navigate to="/library/hayd-fiqh" replace />} />
                <Route path="/heart-diseases" element={<Navigate to="/library/heart-diseases" replace />} />
                <Route path="/heartify-roadmap" element={<Navigate to="/library/heartify-roadmap" replace />} />
                <Route path="/hijab-rulings" element={<Navigate to="/library/hijab-rulings" replace />} />
                <Route path="/hijama-cupping" element={<Navigate to="/library/hijama-cupping" replace />} />
                <Route path="/hijamah-rules" element={<Navigate to="/library/hijamah-rules" replace />} />
                <Route path="/hijra-lessons" element={<Navigate to="/library/hijra-lessons" replace />} />
                <Route path="/hinduism-buddhism" element={<Navigate to="/library/hinduism-buddhism" replace />} />
                <Route path="/hira" element={<Navigate to="/library/hira" replace />} />
                <Route path="/hudaybiyah-lessons" element={<Navigate to="/library/hudaybiyah-lessons" replace />} />
                <Route path="/ivf-islam" element={<Navigate to="/library/ivf-islam" replace />} />
                <Route path="/ibn-hajar" element={<Navigate to="/library/ibn-hajar" replace />} />
                <Route path="/ibn-kathir" element={<Navigate to="/library/ibn-kathir" replace />} />
                <Route path="/ibn-qayyim" element={<Navigate to="/library/ibn-qayyim" replace />} />
                <Route path="/ibn-taymiyyah" element={<Navigate to="/library/ibn-taymiyyah" replace />} />
                <Route path="/eid-prayers" element={<Navigate to="/library/eid-prayers" replace />} />
                <Route path="/iddah-rules" element={<Navigate to="/library/iddah-rules" replace />} />
                <Route path="/iftar-apps" element={<Navigate to="/library/iftar-apps" replace />} />
                <Route path="/iftar-suhoor-adab" element={<Navigate to="/library/iftar-suhoor-adab" replace />} />
                <Route path="/ihsan" element={<Navigate to="/library/ihsan" replace />} />
                <Route path="/ijarah" element={<Navigate to="/library/ijarah" replace />} />
                <Route path="/ijtihad-taqlid" element={<Navigate to="/library/ijtihad-taqlid" replace />} />
                <Route path="/ikhlas" element={<Navigate to="/library/ikhlas" replace />} />
                <Route path="/ilm-amal" element={<Navigate to="/library/ilm-amal" replace />} />
                <Route path="/imam-abu-hanifa" element={<Navigate to="/library/imam-abu-hanifa" replace />} />
                <Route path="/imam-ahmad" element={<Navigate to="/library/imam-ahmad" replace />} />
                <Route path="/imam-bukhari" element={<Navigate to="/library/imam-bukhari" replace />} />
                <Route path="/imam-ghazali" element={<Navigate to="/library/imam-ghazali" replace />} />
                <Route path="/imam-malik" element={<Navigate to="/library/imam-malik" replace />} />
                <Route path="/imam-muslim" element={<Navigate to="/library/imam-muslim" replace />} />
                <Route path="/imam-nawawi" element={<Navigate to="/library/imam-nawawi" replace />} />
                <Route path="/imam-shafii" element={<Navigate to="/library/imam-shafii" replace />} />
                <Route path="/influencer-ethics" element={<Navigate to="/library/influencer-ethics" replace />} />
                <Route path="/inheritance-calculator" element={<Navigate to="/library/inheritance-calculator" replace />} />
                <Route path="/insurance-islamic" element={<Navigate to="/library/insurance-islamic" replace />} />
                <Route path="/interfaith-dialogue" element={<Navigate to="/library/interfaith-dialogue" replace />} />
                <Route path="/islamic-architecture" element={<Navigate to="/library/islamic-architecture" replace />} />
                <Route path="/islamic-calligraphy" element={<Navigate to="/library/islamic-calligraphy" replace />} />
                <Route path="/islamic-education" element={<Navigate to="/library/islamic-education" replace />} />
                <Route path="/islamic-medicine" element={<Navigate to="/library/islamic-medicine" replace />} />
                <Route path="/islamic-meditation" element={<Navigate to="/library/islamic-meditation" replace />} />
                <Route path="/islamic-parenting" element={<Navigate to="/library/islamic-parenting" replace />} />
                <Route path="/islamic-podcasts" element={<Navigate to="/library/islamic-podcasts" replace />} />
                <Route path="/islamic-psychology" element={<Navigate to="/library/islamic-psychology" replace />} />
                <Route path="/islamic-schools" element={<Navigate to="/library/islamic-schools" replace />} />
                <Route path="/islamic-science" element={<Navigate to="/library/islamic-science" replace />} />
                <Route path="/islamic-wedding" element={<Navigate to="/library/islamic-wedding" replace />} />
                <Route path="/istihada-fiqh" element={<Navigate to="/library/istihada-fiqh" replace />} />
                <Route path="/istikhara" element={<Navigate to="/library/istikhara" replace />} />
                <Route path="/istisqa" element={<Navigate to="/library/istisqa" replace />} />
                <Route path="/itikaf" element={<Navigate to="/library/itikaf" replace />} />
                <Route path="/janabah-fiqh" element={<Navigate to="/library/janabah-fiqh" replace />} />
                <Route path="/jihad-types" element={<Navigate to="/library/jihad-types" replace />} />
                <Route path="/jinn-shaytan" element={<Navigate to="/library/jinn-shaytan" replace />} />
                <Route path="/judaism-compared" element={<Navigate to="/library/judaism-compared" replace />} />
                <Route path="/jumuah" element={<Navigate to="/library/jumuah" replace />} />
                <Route path="/kaffarah-guide" element={<Navigate to="/library/kaffarah-guide" replace />} />
                <Route path="/kaffarat-al-majlis" element={<Navigate to="/library/kaffarat-al-majlis" replace />} />
                <Route path="/khandaq-lessons" element={<Navigate to="/library/khandaq-lessons" replace />} />
                <Route path="/khilafah-concept" element={<Navigate to="/library/khilafah-concept" replace />} />
                <Route path="/khilafah-rashida" element={<Navigate to="/library/khilafah-rashida" replace />} />
                <Route path="/khula-annulment" element={<Navigate to="/library/khula-annulment" replace />} />
                <Route path="/khushu" element={<Navigate to="/library/khushu" replace />} />
                <Route path="/kufr-nifaq" element={<Navigate to="/library/kufr-nifaq" replace />} />
                <Route path="/kusuf-khusuf" element={<Navigate to="/library/kusuf-khusuf" replace />} />
                <Route path="/laylat-al-qadr" element={<Navigate to="/library/laylat-al-qadr" replace />} />
                <Route path="/lgbtq-islamic-view" element={<Navigate to="/library/lgbtq-islamic-view" replace />} />
                <Route path="/liberalism-islam" element={<Navigate to="/library/liberalism-islam" replace />} />
                <Route path="/live-halaqat" element={<Navigate to="/library/live-halaqat" replace />} />
                <Route path="/madinah-period" element={<Navigate to="/library/madinah-period" replace />} />
                <Route path="/mahr-rulings" element={<Navigate to="/library/mahr-rulings" replace />} />
                <Route path="/mahram-nonmahram" element={<Navigate to="/library/mahram-nonmahram" replace />} />
                <Route path="/major-signs-hour" element={<Navigate to="/library/major-signs-hour" replace />} />
                <Route path="/makkah-period" element={<Navigate to="/library/makkah-period" replace />} />
                <Route path="/quran-manners" element={<Navigate to="/library/quran-manners" replace />} />
                <Route path="/maqasid" element={<Navigate to="/library/maqasid" replace />} />
                <Route path="/nikah-contract" element={<Navigate to="/library/nikah-contract" replace />} />
                <Route path="/marriage-proposal" element={<Navigate to="/library/marriage-proposal" replace />} />
                <Route path="/martyrdom" element={<Navigate to="/library/martyrdom" replace />} />
                <Route path="/mash-khuffain" element={<Navigate to="/library/mash-khuffain" replace />} />
                <Route path="/masjid-adab" element={<Navigate to="/library/masjid-adab" replace />} />
                <Route path="/masjid-discovery" element={<Navigate to="/library/masjid-discovery" replace />} />
                <Route path="/masjid-partnerships" element={<Navigate to="/library/masjid-partnerships" replace />} />
                <Route path="/matrimony-trends" element={<Navigate to="/library/matrimony-trends" replace />} />
                <Route path="/imam-mental-health" element={<Navigate to="/library/imam-mental-health" replace />} />
                <Route path="/mental-health-islam" element={<Navigate to="/library/mental-health-islam" replace />} />
                <Route path="/messengers-of-allah" element={<Navigate to="/library/messengers-of-allah" replace />} />
                <Route path="/mirath-basics" element={<Navigate to="/library/mirath-basics" replace />} />
                <Route path="/missed-sunnah" element={<Navigate to="/library/missed-sunnah" replace />} />
                <Route path="/miswak-sunnah" element={<Navigate to="/library/miswak-sunnah" replace />} />
                <Route path="/moderation-ethics" element={<Navigate to="/library/moderation-ethics" replace />} />
                <Route path="/modern-medicine" element={<Navigate to="/library/modern-medicine" replace />} />
                <Route path="/morning-routine" element={<Navigate to="/library/morning-routine" replace />} />
                <Route path="/mortgage-islamic" element={<Navigate to="/library/mortgage-islamic" replace />} />
                <Route path="/mudarabah" element={<Navigate to="/library/mudarabah" replace />} />
                <Route path="/muhasabah" element={<Navigate to="/library/muhasabah" replace />} />
                <Route path="/murabaha-finance" element={<Navigate to="/library/murabaha-finance" replace />} />
                <Route path="/muraqabah" element={<Navigate to="/library/muraqabah" replace />} />
                <Route path="/musharakah" element={<Navigate to="/library/musharakah" replace />} />
                <Route path="/music-rulings" element={<Navigate to="/library/music-rulings" replace />} />
                <Route path="/muslim-burial" element={<Navigate to="/library/muslim-burial" replace />} />
                <Route path="/muslim-dating" element={<Navigate to="/library/muslim-dating" replace />} />
                <Route path="/muslim-entrepreneurs" element={<Navigate to="/library/muslim-entrepreneurs" replace />} />
                <Route path="/muslim-fitness" element={<Navigate to="/library/muslim-fitness" replace />} />
                <Route path="/muslim-homeschool" element={<Navigate to="/library/muslim-homeschool" replace />} />
                <Route path="/muslim-minorities" element={<Navigate to="/library/muslim-minorities" replace />} />
                <Route path="/muslim-sleep-science" element={<Navigate to="/library/muslim-sleep-science" replace />} />
                <Route path="/muslim-therapists" element={<Navigate to="/library/muslim-therapists" replace />} />
                <Route path="/muslim-travel-guides" element={<Navigate to="/library/muslim-travel-guides" replace />} />
                <Route path="/najasah-impurities" element={<Navigate to="/library/najasah-impurities" replace />} />
                <Route path="/nationalism-islam" element={<Navigate to="/library/nationalism-islam" replace />} />
                <Route path="/neighbor-rights" element={<Navigate to="/library/neighbor-rights" replace />} />
                <Route path="/nifas-fiqh" element={<Navigate to="/library/nifas-fiqh" replace />} />
                <Route path="/tahajjud" element={<Navigate to="/library/tahajjud" replace />} />
                <Route path="/offline-quran-audio" element={<Navigate to="/library/offline-quran-audio" replace />} />
                <Route path="/organ-donation" element={<Navigate to="/library/organ-donation" replace />} />
                <Route path="/orphan-care" element={<Navigate to="/library/orphan-care" replace />} />
                <Route path="/orphan-sponsorship" element={<Navigate to="/library/orphan-sponsorship" replace />} />
                <Route path="/ottoman-era" element={<Navigate to="/library/ottoman-era" replace />} />
                <Route path="/photography-rulings" element={<Navigate to="/library/photography-rulings" replace />} />
                <Route path="/political-islam" element={<Navigate to="/library/political-islam" replace />} />
                <Route path="/polygamy-rulings" element={<Navigate to="/library/polygamy-rulings" replace />} />
                <Route path="/prisoners-of-war" element={<Navigate to="/library/prisoners-of-war" replace />} />
                <Route path="/prophet-day" element={<Navigate to="/library/prophet-day" replace />} />
                <Route path="/prophetic-diet" element={<Navigate to="/library/prophetic-diet" replace />} />
                <Route path="/qada-prayers" element={<Navigate to="/library/qada-prayers" replace />} />
                <Route path="/qadr-divine-decree" element={<Navigate to="/library/qadr-divine-decree" replace />} />
                <Route path="/qard-hasan" element={<Navigate to="/library/qard-hasan" replace />} />
                <Route path="/qasr-jam" element={<Navigate to="/library/qasr-jam" replace />} />
                <Route path="/naskh" element={<Navigate to="/library/naskh" replace />} />
                <Route path="/asbab-nuzul" element={<Navigate to="/library/asbab-nuzul" replace />} />
                <Route path="/makki-madani" element={<Navigate to="/library/makki-madani" replace />} />
                <Route path="/hifz-tips" element={<Navigate to="/library/hifz-tips" replace />} />
                <Route path="/qiraat" element={<Navigate to="/library/qiraat" replace />} />
                <Route path="/quran-reflection" element={<Navigate to="/library/quran-reflection" replace />} />
                <Route path="/tafsir-basics" element={<Navigate to="/library/tafsir-basics" replace />} />
                <Route path="/qurbani-rules" element={<Navigate to="/library/qurbani-rules" replace />} />
                <Route path="/raudha-etiquette" element={<Navigate to="/library/raudha-etiquette" replace />} />
                <Route path="/refugee-support" element={<Navigate to="/library/refugee-support" replace />} />
                <Route path="/riba-explained" element={<Navigate to="/library/riba-explained" replace />} />
                <Route path="/rights-of-poor" element={<Navigate to="/library/rights-of-poor" replace />} />
                <Route path="/rizq" element={<Navigate to="/library/rizq" replace />} />
                <Route path="/ruqyah-shariah" element={<Navigate to="/library/ruqyah-shariah" replace />} />
                <Route path="/sabr" element={<Navigate to="/library/sabr" replace />} />
                <Route path="/sadaqah-jariyah-guide" element={<Navigate to="/library/sadaqah-jariyah-guide" replace />} />
                <Route path="/sahaba-men" element={<Navigate to="/library/sahaba-men" replace />} />
                <Route path="/sahaba-women" element={<Navigate to="/library/sahaba-women" replace />} />
                <Route path="/salafi-manhaj" element={<Navigate to="/library/salafi-manhaj" replace />} />
                <Route path="/salawat" element={<Navigate to="/library/salawat" replace />} />
                <Route path="/secularism-islam" element={<Navigate to="/library/secularism-islam" replace />} />
                <Route path="/shirk-types" element={<Navigate to="/library/shirk-types" replace />} />
                <Route path="/shukr" element={<Navigate to="/library/shukr" replace />} />
                <Route path="/silat-rahm" element={<Navigate to="/library/silat-rahm" replace />} />
                <Route path="/sleep-sunnah" element={<Navigate to="/library/sleep-sunnah" replace />} />
                <Route path="/social-media-ethics" element={<Navigate to="/library/social-media-ethics" replace />} />
                <Route path="/sports-islam" element={<Navigate to="/library/sports-islam" replace />} />
                <Route path="/streaming-ethics" element={<Navigate to="/library/streaming-ethics" replace />} />
                <Route path="/stress-anxiety" element={<Navigate to="/library/stress-anxiety" replace />} />
                <Route path="/suicide-prevention" element={<Navigate to="/library/suicide-prevention" replace />} />
                <Route path="/sujood-sahw" element={<Navigate to="/library/sujood-sahw" replace />} />
                <Route path="/sujood-tilawah" element={<Navigate to="/library/sujood-tilawah" replace />} />
                <Route path="/sukuk" element={<Navigate to="/library/sukuk" replace />} />
                <Route path="/sunnah-of-clothing" element={<Navigate to="/library/sunnah-of-clothing" replace />} />
                <Route path="/sunnah-of-drinking" element={<Navigate to="/library/sunnah-of-drinking" replace />} />
                <Route path="/sunnah-of-eating" element={<Navigate to="/library/sunnah-of-eating" replace />} />
                <Route path="/sunnah-of-gifts" element={<Navigate to="/library/sunnah-of-gifts" replace />} />
                <Route path="/sunnah-of-greeting" element={<Navigate to="/library/sunnah-of-greeting" replace />} />
                <Route path="/sunnah-of-sleep" element={<Navigate to="/library/sunnah-of-sleep" replace />} />
                <Route path="/sunnah-of-travel" element={<Navigate to="/library/sunnah-of-travel" replace />} />
                <Route path="/tabiun-era" element={<Navigate to="/library/tabiun-era" replace />} />
                <Route path="/tabuk-lessons" element={<Navigate to="/library/tabuk-lessons" replace />} />
                <Route path="/tafakkur" element={<Navigate to="/library/tafakkur" replace />} />
                <Route path="/tahiyat-al-masjid" element={<Navigate to="/library/tahiyat-al-masjid" replace />} />
                <Route path="/tajwid-basics" element={<Navigate to="/library/tajwid-basics" replace />} />
                <Route path="/takaful" element={<Navigate to="/library/takaful" replace />} />
                <Route path="/talaq-rules" element={<Navigate to="/library/talaq-rules" replace />} />
                <Route path="/tawakkul" element={<Navigate to="/library/tawakkul" replace />} />
                <Route path="/tawheed" element={<Navigate to="/library/tawheed" replace />} />
                <Route path="/tayammum" element={<Navigate to="/library/tayammum" replace />} />
                <Route path="/tongue-adab" element={<Navigate to="/library/tongue-adab" replace />} />
                <Route path="/treaties" element={<Navigate to="/library/treaties" replace />} />
                <Route path="/uhud-lessons" element={<Navigate to="/library/uhud-lessons" replace />} />
                <Route path="/umayyad-era" element={<Navigate to="/library/umayyad-era" replace />} />
                <Route path="/ummah-unity" element={<Navigate to="/library/ummah-unity" replace />} />
                <Route path="/umrah-planning" element={<Navigate to="/library/umrah-planning" replace />} />
                <Route path="/vaccines-islam" element={<Navigate to="/library/vaccines-islam" replace />} />
                <Route path="/vegetarianism-islam" element={<Navigate to="/library/vegetarianism-islam" replace />} />
                <Route path="/visiting-the-sick" element={<Navigate to="/library/visiting-the-sick" replace />} />
                <Route path="/walimah-sunnahs" element={<Navigate to="/library/walimah-sunnahs" replace />} />
                <Route path="/waqf-endowment" element={<Navigate to="/library/waqf-endowment" replace />} />
                <Route path="/waqf-modern" element={<Navigate to="/library/waqf-modern" replace />} />
                <Route path="/war-ethics" element={<Navigate to="/library/war-ethics" replace />} />
                <Route path="/wealth-management" element={<Navigate to="/library/wealth-management" replace />} />
                <Route path="/will-writing" element={<Navigate to="/library/will-writing" replace />} />
                <Route path="/witr" element={<Navigate to="/library/witr" replace />} />
                <Route path="/workplace-ethics" element={<Navigate to="/library/workplace-ethics" replace />} />
                <Route path="/yawm-al-qiyamah" element={<Navigate to="/library/yawm-al-qiyamah" replace />} />
                <Route path="/youth-mentorship" element={<Navigate to="/library/youth-mentorship" replace />} />
                <Route path="/zakat-calculators" element={<Navigate to="/library/zakat-calculators" replace />} />
                <Route path="/zakat-fitr" element={<Navigate to="/library/zakat-fitr" replace />} />
                <Route path="/zakat-on-business" element={<Navigate to="/library/zakat-on-business" replace />} />
                <Route path="/zakat-on-gold" element={<Navigate to="/library/zakat-on-gold" replace />} />
                <Route path="/zamzam-rulings" element={<Navigate to="/library/zamzam-rulings" replace />} />
                <Route path="/ziyarah-adab" element={<Navigate to="/library/ziyarah-adab" replace />} />
                <Route path="/zuhd" element={<Navigate to="/library/zuhd" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </RouteTransition>
            </Suspense>
          </BrowserRouter>
        </PlayerProvider>
          </KidsModeProvider>
          </LocaleProvider>
      </AuthProvider>
    </ThemeProvider>
  </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
