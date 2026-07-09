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
const Ghibah = lazy(() => import("./pages/Ghibah.tsx"));
const AngerControl = lazy(() => import("./pages/AngerControl.tsx"));
const Fitrah = lazy(() => import("./pages/Fitrah.tsx"));
const HiraKhalwa = lazy(() => import("./pages/HiraKhalwa.tsx"));
const TafakkurTadabbur = lazy(() => import("./pages/TafakkurTadabbur.tsx"));
const IlmVsAmal = lazy(() => import("./pages/IlmVsAmal.tsx"));
const NightPrayer = lazy(() => import("./pages/NightPrayer.tsx"));
const Witr = lazy(() => import("./pages/Witr.tsx"));
const Duha = lazy(() => import("./pages/Duha.tsx"));
const Tahiyatul = lazy(() => import("./pages/Tahiyatul.tsx"));
const AwwabinPrayer = lazy(() => import("./pages/AwwabinPrayer.tsx"));
const KaffaratMajlis = lazy(() => import("./pages/KaffaratMajlis.tsx"));
const SalatOnProphet = lazy(() => import("./pages/SalatOnProphet.tsx"));
const ForbiddenTimes = lazy(() => import("./pages/ForbiddenTimes.tsx"));
const MissedSunnah = lazy(() => import("./pages/MissedSunnah.tsx"));
const IdPrayers = lazy(() => import("./pages/IdPrayers.tsx"));
const KusufKhusuf = lazy(() => import("./pages/KusufKhusuf.tsx"));
const Istisqa = lazy(() => import("./pages/Istisqa.tsx"));
const Ghusl = lazy(() => import("./pages/Ghusl.tsx"));
const Tayammum = lazy(() => import("./pages/Tayammum.tsx"));
const NajasahImpurities = lazy(() => import("./pages/NajasahImpurities.tsx"));
const HaydFiqh = lazy(() => import("./pages/HaydFiqh.tsx"));
const NifasFiqh = lazy(() => import("./pages/NifasFiqh.tsx"));
const IstihadaFiqh = lazy(() => import("./pages/IstihadaFiqh.tsx"));
const JanabahFiqh = lazy(() => import("./pages/JanabahFiqh.tsx"));
const FidyahKaffarah = lazy(() => import("./pages/FidyahKaffarah.tsx"));
const IftarSuhoorAdab = lazy(() => import("./pages/IftarSuhoorAdab.tsx"));
const FastingRulings = lazy(() => import("./pages/FastingRulings.tsx"));
const ZakatFitr = lazy(() => import("./pages/ZakatFitr.tsx"));
const ZakatOnGold = lazy(() => import("./pages/ZakatOnGold.tsx"));
const ZakatOnBusiness = lazy(() => import("./pages/ZakatOnBusiness.tsx"));
const WaqfEndowment = lazy(() => import("./pages/WaqfEndowment.tsx"));
const MirathBasics = lazy(() => import("./pages/MirathBasics.tsx"));
const MarriageContract = lazy(() => import("./pages/MarriageContract.tsx"));
const WalimahSunnahs = lazy(() => import("./pages/WalimahSunnahs.tsx"));
const TalaqRules = lazy(() => import("./pages/TalaqRules.tsx"));
const IddahRules = lazy(() => import("./pages/IddahRules.tsx"));
const KhulaAnnulment = lazy(() => import("./pages/KhulaAnnulment.tsx"));
const BreastfeedingFiqh = lazy(() => import("./pages/BreastfeedingFiqh.tsx"));
const HalalHaramFood = lazy(() => import("./pages/HalalHaramFood.tsx"));
const QurbaniRules = lazy(() => import("./pages/QurbaniRules.tsx"));
const AqiqahRules = lazy(() => import("./pages/AqiqahRules.tsx"));
const HijamahRules = lazy(() => import("./pages/HijamahRules.tsx"));
const MiswakSunnah = lazy(() => import("./pages/MiswakSunnah.tsx"));
const RuqyahSharia = lazy(() => import("./pages/RuqyahSharia.tsx"));
const EvilEyeProtection = lazy(() => import("./pages/EvilEyeProtection.tsx"));
const JinnAndShaytan = lazy(() => import("./pages/JinnAndShaytan.tsx"));
const BarzakhAfterlife = lazy(() => import("./pages/BarzakhAfterlife.tsx"));
const YawmAlQiyamah = lazy(() => import("./pages/YawmAlQiyamah.tsx"));
const MajorSignsHour = lazy(() => import("./pages/MajorSignsHour.tsx"));
const MessengersOfAllah = lazy(() => import("./pages/MessengersOfAllah.tsx"));
const BooksOfAllah = lazy(() => import("./pages/BooksOfAllah.tsx"));
const AngelsInIslam = lazy(() => import("./pages/AngelsInIslam.tsx"));
const QadrDivineDecree = lazy(() => import("./pages/QadrDivineDecree.tsx"));
const AlWalaWalBara = lazy(() => import("./pages/AlWalaWalBara.tsx"));
const SunnahOfSleep = lazy(() => import("./pages/SunnahOfSleep.tsx"));
const SunnahOfClothing = lazy(() => import("./pages/SunnahOfClothing.tsx"));
const AdabOfMasjid = lazy(() => import("./pages/AdabOfMasjid.tsx"));
const VisitingSick = lazy(() => import("./pages/VisitingSick.tsx"));
const FuneralRites = lazy(() => import("./pages/FuneralRites.tsx"));
const SunnahOfEating = lazy(() => import("./pages/SunnahOfEating.tsx"));
const SunnahOfDrinking = lazy(() => import("./pages/SunnahOfDrinking.tsx"));
const SunnahOfTravel = lazy(() => import("./pages/SunnahOfTravel.tsx"));
const SunnahOfGreeting = lazy(() => import("./pages/SunnahOfGreeting.tsx"));
const SunnahOfGifts = lazy(() => import("./pages/SunnahOfGifts.tsx"));
const HijraLessons = lazy(() => import("./pages/HijraLessons.tsx"));
const MakkahPeriod = lazy(() => import("./pages/MakkahPeriod.tsx"));
const MadinahPeriod = lazy(() => import("./pages/MadinahPeriod.tsx"));
const BadrLessons = lazy(() => import("./pages/BadrLessons.tsx"));
const UhudLessons = lazy(() => import("./pages/UhudLessons.tsx"));
const KhandaqLessons = lazy(() => import("./pages/KhandaqLessons.tsx"));
const HudaybiyahLessons = lazy(() => import("./pages/HudaybiyahLessons.tsx"));
const FathMakkah = lazy(() => import("./pages/FathMakkah.tsx"));
const TabukLessons = lazy(() => import("./pages/TabukLessons.tsx"));
const KhilafahRashida = lazy(() => import("./pages/KhilafahRashida.tsx"));
const UmayyadEra = lazy(() => import("./pages/UmayyadEra.tsx"));
const AbbasidEra = lazy(() => import("./pages/AbbasidEra.tsx"));
const OttomanEra = lazy(() => import("./pages/OttomanEra.tsx"));
const AndalusHeritage = lazy(() => import("./pages/AndalusHeritage.tsx"));
const ContemporaryIslam = lazy(() => import("./pages/ContemporaryIslam.tsx"));
const SahabaWomen = lazy(() => import("./pages/SahabaWomen.tsx"));
const SahabaMen = lazy(() => import("./pages/SahabaMen.tsx"));
const TabiunEra = lazy(() => import("./pages/TabiunEra.tsx"));
const ImamAbuHanifa = lazy(() => import("./pages/ImamAbuHanifa.tsx"));
const ImamMalik = lazy(() => import("./pages/ImamMalik.tsx"));
const ImamShafii = lazy(() => import("./pages/ImamShafii.tsx"));
const ImamAhmad = lazy(() => import("./pages/ImamAhmad.tsx"));
const ImamBukhari = lazy(() => import("./pages/ImamBukhari.tsx"));
const ImamMuslim = lazy(() => import("./pages/ImamMuslim.tsx"));
const IbnTaymiyyah = lazy(() => import("./pages/IbnTaymiyyah.tsx"));
const IbnQayyim = lazy(() => import("./pages/IbnQayyim.tsx"));
const ImamGhazali = lazy(() => import("./pages/ImamGhazali.tsx"));
const ImamNawawi = lazy(() => import("./pages/ImamNawawi.tsx"));
const IbnKathir = lazy(() => import("./pages/IbnKathir.tsx"));
const IbnHajar = lazy(() => import("./pages/IbnHajar.tsx"));
const SalafiManhaj = lazy(() => import("./pages/SalafiManhaj.tsx"));
const AqidahTahawiyyah = lazy(() => import("./pages/AqidahTahawiyyah.tsx"));
const AsmaWaSifat = lazy(() => import("./pages/AsmaWaSifat.tsx"));
const ShirkTypes = lazy(() => import("./pages/ShirkTypes.tsx"));
const KufrNifaq = lazy(() => import("./pages/KufrNifaq.tsx"));
const SocialMediaEthics = lazy(() => import("./pages/SocialMediaEthics.tsx"));
const WorkplaceEthics = lazy(() => import("./pages/WorkplaceEthics.tsx"));
const FinancialFraud = lazy(() => import("./pages/FinancialFraud.tsx"));
const RibaExplained = lazy(() => import("./pages/RibaExplained.tsx"));
const CryptoIslamic = lazy(() => import("./pages/CryptoIslamic.tsx"));
const InsuranceIslamic = lazy(() => import("./pages/InsuranceIslamic.tsx"));
const MortgageIslamic = lazy(() => import("./pages/MortgageIslamic.tsx"));
const ModernMedicine = lazy(() => import("./pages/ModernMedicine.tsx"));
const OrganDonation = lazy(() => import("./pages/OrganDonation.tsx"));
const IVFIslam = lazy(() => import("./pages/IVFIslam.tsx"));
const AbortionRulings = lazy(() => import("./pages/AbortionRulings.tsx"));
const ContraceptionIslam = lazy(() => import("./pages/ContraceptionIslam.tsx"));
const VaccinesIslam = lazy(() => import("./pages/VaccinesIslam.tsx"));
const MentalHealthIslam = lazy(() => import("./pages/MentalHealthIslam.tsx"));
const AddictionRecovery = lazy(() => import("./pages/AddictionRecovery.tsx"));
const DepressionAnxiety = lazy(() => import("./pages/DepressionAnxiety.tsx"));
const GenderRoles = lazy(() => import("./pages/GenderRoles.tsx"));
const HijabRulings = lazy(() => import("./pages/HijabRulings.tsx"));
const MahramNonMahram = lazy(() => import("./pages/MahramNonMahram.tsx"));
const FreeMixing = lazy(() => import("./pages/FreeMixing.tsx"));
const LgbtqIslamicView = lazy(() => import("./pages/LgbtqIslamicView.tsx"));
const MusicRulings = lazy(() => import("./pages/MusicRulings.tsx"));
const PhotographyRulings = lazy(() => import("./pages/PhotographyRulings.tsx"));
const SportsIslam = lazy(() => import("./pages/SportsIslam.tsx"));
const AlcoholRulings = lazy(() => import("./pages/AlcoholRulings.tsx"));
const GamblingRulings = lazy(() => import("./pages/GamblingRulings.tsx"));
const HalalSlaughter = lazy(() => import("./pages/HalalSlaughter.tsx"));
const HalalCosmetics = lazy(() => import("./pages/HalalCosmetics.tsx"));
const HalalCertification = lazy(() => import("./pages/HalalCertification.tsx"));
const MuslimMinorities = lazy(() => import("./pages/MuslimMinorities.tsx"));
const PoliticalIslam = lazy(() => import("./pages/PoliticalIslam.tsx"));
const KhilafahConcept = lazy(() => import("./pages/KhilafahConcept.tsx"));
const JihadTypes = lazy(() => import("./pages/JihadTypes.tsx"));
const WarEthics = lazy(() => import("./pages/WarEthics.tsx"));
const PrisonersOfWar = lazy(() => import("./pages/PrisonersOfWar.tsx"));
const Treaties = lazy(() => import("./pages/Treaties.tsx"));
const InterfaithDialogue = lazy(() => import("./pages/InterfaithDialogue.tsx"));
const ChristianityCompared = lazy(() => import("./pages/ChristianityCompared.tsx"));
const JudaismCompared = lazy(() => import("./pages/JudaismCompared.tsx"));
const HinduismBuddhism = lazy(() => import("./pages/HinduismBuddhism.tsx"));
const AtheismResponse = lazy(() => import("./pages/AtheismResponse.tsx"));
const SecularismIslam = lazy(() => import("./pages/SecularismIslam.tsx"));
const FeminismIslam = lazy(() => import("./pages/FeminismIslam.tsx"));
const LiberalismIslam = lazy(() => import("./pages/LiberalismIslam.tsx"));
const NationalismIslam = lazy(() => import("./pages/NationalismIslam.tsx"));
const EnvironmentIslam = lazy(() => import("./pages/EnvironmentIslam.tsx"));
const AnimalRights = lazy(() => import("./pages/AnimalRights.tsx"));
const VegetarianismIslam = lazy(() => import("./pages/VegetarianismIslam.tsx"));
const HalalTravel = lazy(() => import("./pages/HalalTravel.tsx"));
const SharedEconomy = lazy(() => import("./pages/SharedEconomy.tsx"));
const EthicalInvesting = lazy(() => import("./pages/EthicalInvesting.tsx"));
const Sukuk = lazy(() => import("./pages/Sukuk.tsx"));
const Takaful = lazy(() => import("./pages/Takaful.tsx"));
const MurabahaFinance = lazy(() => import("./pages/MurabahaFinance.tsx"));
const Ijarah = lazy(() => import("./pages/Ijarah.tsx"));
const Musharakah = lazy(() => import("./pages/Musharakah.tsx"));
const Mudarabah = lazy(() => import("./pages/Mudarabah.tsx"));
const QardHasan = lazy(() => import("./pages/QardHasan.tsx"));
const WaqfModern = lazy(() => import("./pages/WaqfModern.tsx"));
const ZakatCalculators = lazy(() => import("./pages/ZakatCalculators.tsx"));
const QuranMemorizationTips = lazy(() => import("./pages/QuranMemorizationTips.tsx"));
const QuranTafsirBasics = lazy(() => import("./pages/QuranTafsirBasics.tsx"));
const QuranAsbabAnNuzul = lazy(() => import("./pages/QuranAsbabAnNuzul.tsx"));
const QuranMakkiMadani = lazy(() => import("./pages/QuranMakkiMadani.tsx"));
const QuranAbrogation = lazy(() => import("./pages/QuranAbrogation.tsx"));
const QuranQiraat = lazy(() => import("./pages/QuranQiraat.tsx"));
const HadithGrading = lazy(() => import("./pages/HadithGrading.tsx"));
const HadithSixBooks = lazy(() => import("./pages/HadithSixBooks.tsx"));
const FiqhUsul = lazy(() => import("./pages/FiqhUsul.tsx"));
const MaqasidShariah = lazy(() => import("./pages/MaqasidShariah.tsx"));
const IjtihadTaqlid = lazy(() => import("./pages/IjtihadTaqlid.tsx"));
const IslamicCalligraphy = lazy(() => import("./pages/IslamicCalligraphy.tsx"));
const IslamicArchitecture = lazy(() => import("./pages/IslamicArchitecture.tsx"));
const IslamicScience = lazy(() => import("./pages/IslamicScience.tsx"));
const IslamicMedicine = lazy(() => import("./pages/IslamicMedicine.tsx"));
const IslamicPsychology = lazy(() => import("./pages/IslamicPsychology.tsx"));
const IslamicEducation = lazy(() => import("./pages/IslamicEducation.tsx"));
const IslamicParenting = lazy(() => import("./pages/IslamicParenting.tsx"));
const MarriageProposal = lazy(() => import("./pages/MarriageProposal.tsx"));
const IslamicWedding = lazy(() => import("./pages/IslamicWedding.tsx"));

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
                <Route path="/rizq" element={<Rizq />} />
                <Route path="/muhasabah" element={<Muhasabah />} />
                <Route path="/dawah" element={<Dawah />} />
                <Route path="/dua-etiquette" element={<DuaEtiquette />} />
                <Route path="/istikhara" element={<Istikhara />} />
                <Route path="/ihsan" element={<Ihsan />} />
                <Route path="/muraqabah" element={<Muraqabah />} />
                <Route path="/zuhd" element={<Zuhd />} />
                <Route path="/ummah-unity" element={<UmmahUnity />} />
                <Route path="/aqiqah" element={<Aqiqah />} />
                <Route path="/adhan-iqamah" element={<AdhanIqamah />} />
                <Route path="/sujood-sahw" element={<SujoodSahw />} />
                <Route path="/sujood-tilawah" element={<SujoodTilawah />} />
                <Route path="/qada-prayers" element={<QadaPrayers />} />
                <Route path="/qasr-jam" element={<QasrJam />} />
                <Route path="/mash-khuffain" element={<MashKhuffain />} />
                <Route path="/wealth-management" element={<WealthManagement />} />
                <Route path="/ziyarah-adab" element={<ZiyarahAdab />} />
                <Route path="/halal-investing" element={<HalalInvesting />} />
                <Route path="/quran-manners" element={<MannersWithQuran />} />
                <Route path="/elders-rights" element={<EldersRights />} />
                <Route path="/rights-of-poor" element={<RightsOfPoor />} />
                <Route path="/silat-rahm" element={<SilaturRahm />} />
                <Route path="/hasad-evil-eye" element={<HasadEvilEye />} />
                <Route path="/ghibah" element={<Ghibah />} />
                <Route path="/anger" element={<AngerControl />} />
                <Route path="/fitrah" element={<Fitrah />} />
                <Route path="/hira" element={<HiraKhalwa />} />
                <Route path="/tafakkur" element={<TafakkurTadabbur />} />
                <Route path="/ilm-amal" element={<IlmVsAmal />} />
                <Route path="/tahajjud" element={<NightPrayer />} />
                <Route path="/witr" element={<Witr />} />
                <Route path="/duha" element={<Duha />} />
                <Route path="/tahiyat-al-masjid" element={<Tahiyatul />} />
                <Route path="/awwabin" element={<AwwabinPrayer />} />
                <Route path="/kaffarat-al-majlis" element={<KaffaratMajlis />} />
                <Route path="/salawat" element={<SalatOnProphet />} />
                <Route path="/forbidden-prayer-times" element={<ForbiddenTimes />} />
                <Route path="/missed-sunnah" element={<MissedSunnah />} />
                <Route path="/eid-prayers" element={<IdPrayers />} />
                <Route path="/kusuf-khusuf" element={<KusufKhusuf />} />
                <Route path="/istisqa" element={<Istisqa />} />
                <Route path="/ghusl" element={<Ghusl />} />
                <Route path="/tayammum" element={<Tayammum />} />
                <Route path="/najasah-impurities" element={<NajasahImpurities />} />
                <Route path="/hayd-fiqh" element={<HaydFiqh />} />
                <Route path="/nifas-fiqh" element={<NifasFiqh />} />
                <Route path="/istihada-fiqh" element={<IstihadaFiqh />} />
                <Route path="/janabah-fiqh" element={<JanabahFiqh />} />
                <Route path="/fidyah-kaffarah" element={<FidyahKaffarah />} />
                <Route path="/iftar-suhoor-adab" element={<IftarSuhoorAdab />} />
                <Route path="/fasting-rulings" element={<FastingRulings />} />
                <Route path="/zakat-fitr" element={<ZakatFitr />} />
                <Route path="/zakat-on-gold" element={<ZakatOnGold />} />
                <Route path="/zakat-on-business" element={<ZakatOnBusiness />} />
                <Route path="/waqf-endowment" element={<WaqfEndowment />} />
                <Route path="/mirath-basics" element={<MirathBasics />} />
                <Route path="/nikah-contract" element={<MarriageContract />} />
                <Route path="/walimah-sunnahs" element={<WalimahSunnahs />} />
                <Route path="/talaq-rules" element={<TalaqRules />} />
                <Route path="/iddah-rules" element={<IddahRules />} />
                <Route path="/khula-annulment" element={<KhulaAnnulment />} />
                <Route path="/breastfeeding-fiqh" element={<BreastfeedingFiqh />} />
                <Route path="/halal-haram-food" element={<HalalHaramFood />} />
                <Route path="/qurbani-rules" element={<QurbaniRules />} />
                <Route path="/aqiqah-rules" element={<AqiqahRules />} />
                <Route path="/hijamah-rules" element={<HijamahRules />} />
                <Route path="/miswak-sunnah" element={<MiswakSunnah />} />
                <Route path="/ruqyah-shariah" element={<RuqyahSharia />} />
                <Route path="/evil-eye-protection" element={<EvilEyeProtection />} />
                <Route path="/jinn-shaytan" element={<JinnAndShaytan />} />
                <Route path="/barzakh-afterlife" element={<BarzakhAfterlife />} />
                <Route path="/yawm-al-qiyamah" element={<YawmAlQiyamah />} />
                <Route path="/major-signs-hour" element={<MajorSignsHour />} />
                <Route path="/messengers-of-allah" element={<MessengersOfAllah />} />
                <Route path="/books-of-allah" element={<BooksOfAllah />} />
                <Route path="/angels-in-islam" element={<AngelsInIslam />} />
                <Route path="/qadr-divine-decree" element={<QadrDivineDecree />} />
                <Route path="/al-wala-wal-bara" element={<AlWalaWalBara />} />
                <Route path="/sunnah-of-sleep" element={<SunnahOfSleep />} />
                <Route path="/sunnah-of-clothing" element={<SunnahOfClothing />} />
                <Route path="/adab-of-masjid" element={<AdabOfMasjid />} />
                <Route path="/visiting-the-sick" element={<VisitingSick />} />
                <Route path="/funeral-rites" element={<FuneralRites />} />
                <Route path="/sunnah-of-eating" element={<SunnahOfEating />} />
                <Route path="/sunnah-of-drinking" element={<SunnahOfDrinking />} />
                <Route path="/sunnah-of-travel" element={<SunnahOfTravel />} />
                <Route path="/sunnah-of-greeting" element={<SunnahOfGreeting />} />
                <Route path="/sunnah-of-gifts" element={<SunnahOfGifts />} />
                <Route path="/hijra-lessons" element={<HijraLessons />} />
                <Route path="/makkah-period" element={<MakkahPeriod />} />
                <Route path="/madinah-period" element={<MadinahPeriod />} />
                <Route path="/badr-lessons" element={<BadrLessons />} />
                <Route path="/uhud-lessons" element={<UhudLessons />} />
                <Route path="/khandaq-lessons" element={<KhandaqLessons />} />
                <Route path="/hudaybiyah-lessons" element={<HudaybiyahLessons />} />
                <Route path="/fath-makkah" element={<FathMakkah />} />
                <Route path="/tabuk-lessons" element={<TabukLessons />} />
                <Route path="/khilafah-rashida" element={<KhilafahRashida />} />
                <Route path="/umayyad-era" element={<UmayyadEra />} />
                <Route path="/abbasid-era" element={<AbbasidEra />} />
                <Route path="/ottoman-era" element={<OttomanEra />} />
                <Route path="/andalus-heritage" element={<AndalusHeritage />} />
                <Route path="/contemporary-islam" element={<ContemporaryIslam />} />
                <Route path="/sahaba-women" element={<SahabaWomen />} />
                <Route path="/sahaba-men" element={<SahabaMen />} />
                <Route path="/tabiun-era" element={<TabiunEra />} />
                <Route path="/imam-abu-hanifa" element={<ImamAbuHanifa />} />
                <Route path="/imam-malik" element={<ImamMalik />} />
                <Route path="/imam-shafii" element={<ImamShafii />} />
                <Route path="/imam-ahmad" element={<ImamAhmad />} />
                <Route path="/imam-bukhari" element={<ImamBukhari />} />
                <Route path="/imam-muslim" element={<ImamMuslim />} />
                <Route path="/ibn-taymiyyah" element={<IbnTaymiyyah />} />
                <Route path="/ibn-qayyim" element={<IbnQayyim />} />
                <Route path="/imam-ghazali" element={<ImamGhazali />} />
                <Route path="/imam-nawawi" element={<ImamNawawi />} />
                <Route path="/ibn-kathir" element={<IbnKathir />} />
                <Route path="/ibn-hajar" element={<IbnHajar />} />
                <Route path="/salafi-manhaj" element={<SalafiManhaj />} />
                <Route path="/aqidah-tahawiyyah" element={<AqidahTahawiyyah />} />
                <Route path="/asma-wa-sifat" element={<AsmaWaSifat />} />
                <Route path="/shirk-types" element={<ShirkTypes />} />
                <Route path="/kufr-nifaq" element={<KufrNifaq />} />
                <Route path="/social-media-ethics" element={<SocialMediaEthics />} />
                <Route path="/workplace-ethics" element={<WorkplaceEthics />} />
                <Route path="/financial-fraud" element={<FinancialFraud />} />
                <Route path="/riba-explained" element={<RibaExplained />} />
                <Route path="/crypto-islamic" element={<CryptoIslamic />} />
                <Route path="/insurance-islamic" element={<InsuranceIslamic />} />
                <Route path="/mortgage-islamic" element={<MortgageIslamic />} />
                <Route path="/modern-medicine" element={<ModernMedicine />} />
                <Route path="/organ-donation" element={<OrganDonation />} />
                <Route path="/ivf-islam" element={<IVFIslam />} />
                <Route path="/abortion-rulings" element={<AbortionRulings />} />
                <Route path="/contraception-islam" element={<ContraceptionIslam />} />
                <Route path="/vaccines-islam" element={<VaccinesIslam />} />
                <Route path="/mental-health-islam" element={<MentalHealthIslam />} />
                <Route path="/addiction-recovery" element={<AddictionRecovery />} />
                <Route path="/depression-anxiety" element={<DepressionAnxiety />} />
                <Route path="/gender-roles" element={<GenderRoles />} />
                <Route path="/hijab-rulings" element={<HijabRulings />} />
                <Route path="/mahram-nonmahram" element={<MahramNonMahram />} />
                <Route path="/free-mixing" element={<FreeMixing />} />
                <Route path="/lgbtq-islamic-view" element={<LgbtqIslamicView />} />
                <Route path="/music-rulings" element={<MusicRulings />} />
                <Route path="/photography-rulings" element={<PhotographyRulings />} />
                <Route path="/sports-islam" element={<SportsIslam />} />
                <Route path="/alcohol-rulings" element={<AlcoholRulings />} />
                <Route path="/gambling-rulings" element={<GamblingRulings />} />
                <Route path="/halal-slaughter" element={<HalalSlaughter />} />
                <Route path="/halal-cosmetics" element={<HalalCosmetics />} />
                <Route path="/halal-certification" element={<HalalCertification />} />
                <Route path="/muslim-minorities" element={<MuslimMinorities />} />
                <Route path="/political-islam" element={<PoliticalIslam />} />
                <Route path="/khilafah-concept" element={<KhilafahConcept />} />
                <Route path="/jihad-types" element={<JihadTypes />} />
                <Route path="/war-ethics" element={<WarEthics />} />
                <Route path="/prisoners-of-war" element={<PrisonersOfWar />} />
                <Route path="/treaties" element={<Treaties />} />
                <Route path="/interfaith-dialogue" element={<InterfaithDialogue />} />
                <Route path="/christianity-compared" element={<ChristianityCompared />} />
                <Route path="/judaism-compared" element={<JudaismCompared />} />
                <Route path="/hinduism-buddhism" element={<HinduismBuddhism />} />
                <Route path="/atheism-response" element={<AtheismResponse />} />
                <Route path="/secularism-islam" element={<SecularismIslam />} />
                <Route path="/feminism-islam" element={<FeminismIslam />} />
                <Route path="/liberalism-islam" element={<LiberalismIslam />} />
                <Route path="/nationalism-islam" element={<NationalismIslam />} />
                <Route path="/environment-islam" element={<EnvironmentIslam />} />
                <Route path="/animal-rights" element={<AnimalRights />} />
                <Route path="/vegetarianism-islam" element={<VegetarianismIslam />} />
                <Route path="/halal-travel" element={<HalalTravel />} />
                <Route path="/shared-economy" element={<SharedEconomy />} />
                <Route path="/ethical-investing" element={<EthicalInvesting />} />
                <Route path="/sukuk" element={<Sukuk />} />
                <Route path="/takaful" element={<Takaful />} />
                <Route path="/murabaha-finance" element={<MurabahaFinance />} />
                <Route path="/ijarah" element={<Ijarah />} />
                <Route path="/musharakah" element={<Musharakah />} />
                <Route path="/mudarabah" element={<Mudarabah />} />
                <Route path="/qard-hasan" element={<QardHasan />} />
                <Route path="/waqf-modern" element={<WaqfModern />} />
                <Route path="/zakat-calculators" element={<ZakatCalculators />} />

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
