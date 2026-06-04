import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import { RegionProvider } from "@/hooks/useRegion";
import { AudioPlayerProvider } from "./hooks/useAudioPlayer";
import { MiniPlayer } from "./components/audio/MiniPlayer";
import { MascotTour } from "./components/mascot/MascotTour";
import { FeatureWalkthrough } from "./components/onboarding/FeatureWalkthrough";
import { FEATURES } from "@/lib/features";

// Critical path — loaded eagerly
import Index from "./views/Index";
import NotFound from "./views/NotFound";

// Everything else — lazy loaded
const Article = lazy(() => import("./views/Article"));
const Team = lazy(() => import("./views/Team"));
const Admin = lazy(() => import("./views/Admin"));
const Tall = lazy(() => import("./views/Tall"));
const KlubbProfil = lazy(() => import("./views/KlubbProfil"));
const Sammenlign = lazy(() => import("./views/Sammenlign"));
const Groups = lazy(() => import("./views/Groups"));
const GroupDetail = lazy(() => import("./views/GroupDetail"));
const MineDelteNotater = lazy(() => import("./views/MineDelteNotater"));
const Login = lazy(() => import("./views/Login"));
const Profile = lazy(() => import("./views/Profile"));
const ResetPassword = lazy(() => import("./views/ResetPassword"));
const Onboarding = lazy(() => import("./views/Onboarding"));
const Varsler = lazy(() => import("./views/Varsler"));
const JournalistProfileWrapper = lazy(() => import("./views/JournalistProfileWrapper"));
const StreamControl = lazy(() => import("./views/StreamControl"));
const Hjernetrim = lazy(() => import("./views/Hjernetrim"));
const Hjernevelvet = lazy(() => import("./views/Hjernevelvet"));
const HjernevelvPanel = lazy(() => import("./views/HjernevelvPanel"));
const HjernevelvWriter = lazy(() => import("./views/HjernevelvWriter"));
const HjernevelvEssay = lazy(() => import("./views/HjernevelvEssay"));
const Tag = lazy(() => import("./views/Tag"));
const Subscribe = lazy(() => import("./views/Subscribe"));
const SubscribeReturn = lazy(() => import("./views/SubscribeReturn"));
const BusinessPanel = lazy(() => import("./views/BusinessPanel"));
const Stillinger = lazy(() => import("./views/Stillinger"));
const StillingDetail = lazy(() => import("./views/StillingDetail"));
const StillingNy = lazy(() => import("./views/StillingNy"));
const StillingNyTakk = lazy(() => import("./views/StillingNyTakk"));
const Info = lazy(() => import("./views/Info"));
const Arrangementer = lazy(() => import("./views/Arrangementer"));
const ArrangementDetalj = lazy(() => import("./views/ArrangementDetalj"));
const Newsletter = lazy(() => import("./views/Newsletter"));
const Unsubscribe = lazy(() => import("./views/Unsubscribe"));
const Lytt = lazy(() => import("./views/Lytt"));
const ComingSoon = lazy(() => import("./views/ComingSoon"));
const Naeringspuls = lazy(() => import("./views/Naeringspuls"));

// Idrett is only used for redirects — no need to lazy-load a redirect
const Idrett = lazy(() => import("./views/Idrett"));

const queryClient = new QueryClient();

/** Minimal full-screen spinner shown while a lazy chunk loads */
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <RegionProvider>
        <AudioPlayerProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <MascotTour />
              <FeatureWalkthrough />
              <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/article/:id" element={<Article />} />
              <Route path="/team" element={<Team />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/tall" element={<Tall />} />
              <Route path="/tall/klubb/:id" element={<KlubbProfil />} />
              <Route path="/tall/sammenlign" element={<Sammenlign />} />
              {/* Legacy redirects */}
              <Route path="/idrett" element={<Navigate to="/tall" replace />} />
              <Route path="/idrett/klubb/:id" element={<Navigate to="/tall" replace />} />
              <Route path="/idrett/sammenlign" element={<Navigate to="/tall/sammenlign" replace />} />
              <Route path="/grupper" element={<Groups />} />
              <Route path="/grupper/:id" element={<GroupDetail />} />
              <Route path="/mine-delte-notater" element={<MineDelteNotater />} />
              <Route path="/arrangementer" element={<Arrangementer />} />
              <Route path="/arrangementer/:id" element={<ArrangementDetalj />} />
              <Route path="/nyhetsbrev" element={<Newsletter />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/lytt" element={<Lytt />} />
              <Route path="/login" element={<Login />} />
              <Route path="/profil" element={<Profile />} />
              <Route path="/varsler" element={<Varsler />} />
              <Route path="/journalist/:username" element={<JournalistProfileWrapper />} />
              <Route path="/profil/stream" element={<StreamControl />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/velkommen" element={<Onboarding />} />
              <Route path="/hjernetrim" element={<Hjernetrim />} />
              <Route path="/hjernevelvet" element={<Hjernevelvet />} />
              <Route path="/hjernevelvet/panel/:id" element={<HjernevelvPanel />} />
              <Route path="/hjernevelvet/skribent/:slug" element={<HjernevelvWriter />} />
              <Route path="/hjernevelvet/essay/:id" element={<HjernevelvEssay />} />
              <Route path="/tag/:slug" element={<Tag />} />
              <Route path="/abonnement" element={<Subscribe />} />
              <Route path="/abonnement/takk" element={<SubscribeReturn />} />
              <Route path="/abonnement/bedrift/:id" element={<BusinessPanel />} />
              <Route path="/stillinger" element={<Stillinger />} />
              <Route path="/stillinger/ny" element={<StillingNy />} />
              <Route path="/stillinger/ny/takk" element={<StillingNyTakk />} />
              <Route path="/stillinger/:slug" element={<StillingDetail />} />
              <Route path="/om-oss" element={<Info />} />
              <Route path="/kontakt" element={<Info />} />
              <Route path="/redaksjonelle-prinsipper" element={<Info />} />
              <Route path="/personvern" element={<Info />} />
              <Route path="/vilkar" element={<Info />} />
              <Route path="/innholdsmerking" element={<Info />} />
              <Route path="/eierskap" element={<Info />} />
              <Route path="/cookies" element={<Info />} />
              <Route path="/tilgjengelighet" element={<Info />} />
              {FEATURES.BAROMETER && (
                <>
                  <Route path="/naeringspuls" element={<Naeringspuls />} />
                  {/* /næringspuls (æ) redirecter til kanonisk ASCII-rute */}
                  <Route path="/næringspuls" element={<Navigate to="/naeringspuls" replace />} />
                </>
              )}
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="/kommer-snart" element={<ComingSoon />} />
              <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              <MiniPlayer />
            </BrowserRouter>
          </TooltipProvider>
        </AudioPlayerProvider>
        </RegionProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
