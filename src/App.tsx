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
const HadithLibrary = lazy(() => import("./pages/HadithLibrary.tsx"));
const SalahTracker = lazy(() => import("./pages/SalahTracker.tsx"));
const Achievements = lazy(() => import("./pages/Achievements.tsx"));
const Challenges = lazy(() => import("./pages/Challenges.tsx"));
const Today = lazy(() => import("./pages/Today.tsx"));
const Reminders = lazy(() => import("./pages/Reminders.tsx"));
const Recap = lazy(() => import("./pages/Recap.tsx"));
const Journal = lazy(() => import("./pages/Journal.tsx"));
const Khatm = lazy(() => import("./pages/Khatm.tsx"));
const Bookmarks = lazy(() => import("./pages/Bookmarks.tsx"));
const Fasting = lazy(() => import("./pages/Fasting.tsx"));
const Seerah = lazy(() => import("./pages/Seerah.tsx"));
const Learn = lazy(() => import("./pages/Learn.tsx"));
const Wird = lazy(() => import("./pages/Wird.tsx"));
const Sadaqah = lazy(() => import("./pages/Sadaqah.tsx"));
const Wasiyyah = lazy(() => import("./pages/Wasiyyah.tsx"));
const Ramadan = lazy(() => import("./pages/Ramadan.tsx"));
const Hajj = lazy(() => import("./pages/Hajj.tsx"));
const Qibla = lazy(() => import("./pages/Qibla.tsx"));
const HalalCheck = lazy(() => import("./pages/HalalCheck.tsx"));
const DuaWall = lazy(() => import("./pages/DuaWall.tsx"));
const BabyNames = lazy(() => import("./pages/BabyNames.tsx"));
const Nikah = lazy(() => import("./pages/Nikah.tsx"));
const Quiz = lazy(() => import("./pages/Quiz.tsx"));
const Stories = lazy(() => import("./pages/Stories.tsx"));
const NewMuslim = lazy(() => import("./pages/NewMuslim.tsx"));
const Hifz = lazy(() => import("./pages/Hifz.tsx"));
const Dreams = lazy(() => import("./pages/Dreams.tsx"));
const Alphabet = lazy(() => import("./pages/Alphabet.tsx"));
const Tajweed = lazy(() => import("./pages/Tajweed.tsx"));
const Glossary = lazy(() => import("./pages/Glossary.tsx"));
const IslamicEvents = lazy(() => import("./pages/IslamicEvents.tsx"));
const Inheritance = lazy(() => import("./pages/Inheritance.tsx"));
const WuduGuide = lazy(() => import("./pages/WuduGuide.tsx"));
const SalahGuide = lazy(() => import("./pages/SalahGuide.tsx"));
const Fatwa = lazy(() => import("./pages/Fatwa.tsx"));
const Ruqya = lazy(() => import("./pages/Ruqya.tsx"));
const Nawawi40 = lazy(() => import("./pages/Nawawi40.tsx"));
const Prophets = lazy(() => import("./pages/Prophets.tsx"));
const Sahaba = lazy(() => import("./pages/Sahaba.tsx"));
const IslamicFinance = lazy(() => import("./pages/IslamicFinance.tsx"));
const AdabPage = lazy(() => import("./pages/AdabPage.tsx"));
const Parenting = lazy(() => import("./pages/Parenting.tsx"));
const MarriageRights = lazy(() => import("./pages/MarriageRights.tsx"));
const Janazah = lazy(() => import("./pages/Janazah.tsx"));
const TibbNabawi = lazy(() => import("./pages/TibbNabawi.tsx"));
const UmrahGuide = lazy(() => import("./pages/UmrahGuide.tsx"));
const WomensFiqh = lazy(() => import("./pages/WomensFiqh.tsx"));
const Aqeedah = lazy(() => import("./pages/Aqeedah.tsx"));
const IslamicHistory = lazy(() => import("./pages/IslamicHistory.tsx"));
const Scholars = lazy(() => import("./pages/Scholars.tsx"));
const Akhlaq = lazy(() => import("./pages/Akhlaq.tsx"));
const SignsOfHour = lazy(() => import("./pages/SignsOfHour.tsx"));
const SunnahPrayers = lazy(() => import("./pages/SunnahPrayers.tsx"));
const Kalimahs = lazy(() => import("./pages/Kalimahs.tsx"));
const MasnoonDuas = lazy(() => import("./pages/MasnoonDuas.tsx"));
const Purification = lazy(() => import("./pages/Purification.tsx"));
const TravelAdab = lazy(() => import("./pages/TravelAdab.tsx"));
const EatingSunnah = lazy(() => import("./pages/EatingSunnah.tsx"));
const MeansOfReward = lazy(() => import("./pages/MeansOfReward.tsx"));
const MajorSins = lazy(() => import("./pages/MajorSins.tsx"));
const Tawbah = lazy(() => import("./pages/Tawbah.tsx"));
const JannahDescriptions = lazy(() => import("./pages/JannahDescriptions.tsx"));
const Pillars = lazy(() => import("./pages/Pillars.tsx"));
const SacredMosques = lazy(() => import("./pages/SacredMosques.tsx"));
const Madhabs = lazy(() => import("./pages/Madhabs.tsx"));
const QuranSciences = lazy(() => import("./pages/QuranSciences.tsx"));
const HadithSciences = lazy(() => import("./pages/HadithSciences.tsx"));
const Battles = lazy(() => import("./pages/Battles.tsx"));
const Miracles = lazy(() => import("./pages/Miracles.tsx"));
const FarewellSermon = lazy(() => import("./pages/FarewellSermon.tsx"));
const AhlulBayt = lazy(() => import("./pages/AhlulBayt.tsx"));
const KidsDuas = lazy(() => import("./pages/KidsDuas.tsx"));
const Hisnul = lazy(() => import("./pages/Hisnul.tsx"));
const ProphetDay = lazy(() => import("./pages/ProphetDay.tsx"));
const MasjidAdab = lazy(() => import("./pages/MasjidAdab.tsx"));
const NeighborRights = lazy(() => import("./pages/NeighborRights.tsx"));
const Ikhlas = lazy(() => import("./pages/Ikhlas.tsx"));
const Sabr = lazy(() => import("./pages/Sabr.tsx"));
const Shukr = lazy(() => import("./pages/Shukr.tsx"));
const Tawakkul = lazy(() => import("./pages/Tawakkul.tsx"));
const Khushu = lazy(() => import("./pages/Khushu.tsx"));
const Barakah = lazy(() => import("./pages/Barakah.tsx"));
const Tawheed = lazy(() => import("./pages/Tawheed.tsx"));
const HeartDiseases = lazy(() => import("./pages/HeartDiseases.tsx"));
const Bidah = lazy(() => import("./pages/Bidah.tsx"));
const BusinessEthics = lazy(() => import("./pages/BusinessEthics.tsx"));
const SeekingKnowledge = lazy(() => import("./pages/SeekingKnowledge.tsx"));
const ParentsRights = lazy(() => import("./pages/ParentsRights.tsx"));
const ChildrensRights = lazy(() => import("./pages/ChildrensRights.tsx"));
const MuslimRights = lazy(() => import("./pages/MuslimRights.tsx"));
const TongueAdab = lazy(() => import("./pages/TongueAdab.tsx"));
const WomensPurity = lazy(() => import("./pages/WomensPurity.tsx"));
const Itikaf = lazy(() => import("./pages/Itikaf.tsx"));
const LaylatAlQadr = lazy(() => import("./pages/LaylatAlQadr.tsx"));
const Ashura = lazy(() => import("./pages/Ashura.tsx"));
const DhulHijjah = lazy(() => import("./pages/DhulHijjah.tsx"));
const Jumuah = lazy(() => import("./pages/Jumuah.tsx"));
const Rizq = lazy(() => import("./pages/Rizq.tsx"));
const Muhasabah = lazy(() => import("./pages/Muhasabah.tsx"));
const Dawah = lazy(() => import("./pages/Dawah.tsx"));
const DuaEtiquette = lazy(() => import("./pages/DuaEtiquette.tsx"));
const Istikhara = lazy(() => import("./pages/Istikhara.tsx"));
const Ihsan = lazy(() => import("./pages/Ihsan.tsx"));
const Muraqabah = lazy(() => import("./pages/Muraqabah.tsx"));
const Zuhd = lazy(() => import("./pages/Zuhd.tsx"));
const UmmahUnity = lazy(() => import("./pages/UmmahUnity.tsx"));
const Aqiqah = lazy(() => import("./pages/Aqiqah.tsx"));
const AdhanIqamah = lazy(() => import("./pages/AdhanIqamah.tsx"));
const SujoodSahw = lazy(() => import("./pages/SujoodSahw.tsx"));
const SujoodTilawah = lazy(() => import("./pages/SujoodTilawah.tsx"));
const QadaPrayers = lazy(() => import("./pages/QadaPrayers.tsx"));
const QasrJam = lazy(() => import("./pages/QasrJam.tsx"));
const MashKhuffain = lazy(() => import("./pages/MashKhuffain.tsx"));
const WealthManagement = lazy(() => import("./pages/WealthManagement.tsx"));
const ZiyarahAdab = lazy(() => import("./pages/ZiyarahAdab.tsx"));
const HalalInvesting = lazy(() => import("./pages/HalalInvesting.tsx"));
const MannersWithQuran = lazy(() => import("./pages/MannersWithQuran.tsx"));
const EldersRights = lazy(() => import("./pages/EldersRights.tsx"));
const RightsOfPoor = lazy(() => import("./pages/RightsOfPoor.tsx"));
const SilaturRahm = lazy(() => import("./pages/SilaturRahm.tsx"));
const HasadEvilEye = lazy(() => import("./pages/HasadEvilEye.tsx"));

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
                <Route path="/hadith" element={<HadithLibrary />} />
                <Route path="/salah" element={<SalahTracker />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/challenges" element={<Challenges />} />
                <Route path="/today" element={<Today />} />
                <Route path="/reminders" element={<Reminders />} />
                <Route path="/recap" element={<Recap />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/khatm" element={<Khatm />} />
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
                <Route path="/prophet-day" element={<ProphetDay />} />
                <Route path="/masjid-adab" element={<MasjidAdab />} />
                <Route path="/neighbor-rights" element={<NeighborRights />} />
                <Route path="/ikhlas" element={<Ikhlas />} />
                <Route path="/sabr" element={<Sabr />} />
                <Route path="/shukr" element={<Shukr />} />
                <Route path="/tawakkul" element={<Tawakkul />} />
                <Route path="/khushu" element={<Khushu />} />
                <Route path="/barakah" element={<Barakah />} />
                <Route path="/tawheed" element={<Tawheed />} />
                <Route path="/heart-diseases" element={<HeartDiseases />} />
                <Route path="/bidah" element={<Bidah />} />
                <Route path="/business-ethics" element={<BusinessEthics />} />
                <Route path="/seeking-knowledge" element={<SeekingKnowledge />} />
                <Route path="/parents-rights" element={<ParentsRights />} />
                <Route path="/childrens-rights" element={<ChildrensRights />} />
                <Route path="/muslim-rights" element={<MuslimRights />} />
                <Route path="/tongue-adab" element={<TongueAdab />} />
                <Route path="/womens-purity" element={<WomensPurity />} />
                <Route path="/itikaf" element={<Itikaf />} />
                <Route path="/laylat-al-qadr" element={<LaylatAlQadr />} />
                <Route path="/ashura" element={<Ashura />} />
                <Route path="/dhul-hijjah" element={<DhulHijjah />} />
                <Route path="/jumuah" element={<Jumuah />} />
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
