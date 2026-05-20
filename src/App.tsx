import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import { RegionProvider } from "@/hooks/useRegion";
import Index from "./views/Index";
import Article from "./views/Article";
import Team from "./views/Team";
import Admin from "./views/Admin";
import NotFound from "./views/NotFound";
import Idrett from "./views/Idrett";
import Tall from "./views/Tall";
import KlubbProfil from "./views/KlubbProfil";
import Sammenlign from "./views/Sammenlign";
import Groups from "./views/Groups";
import GroupDetail from "./views/GroupDetail";
import MineDelteNotater from "./views/MineDelteNotater";
import Login from "./views/Login";
import Profile from "./views/Profile";
import ResetPassword from "./views/ResetPassword";
import Onboarding from "./views/Onboarding";
import Hjernetrim from "./views/Hjernetrim";
import Hjernevelvet from "./views/Hjernevelvet";
import HjernevelvPanel from "./views/HjernevelvPanel";
import HjernevelvWriter from "./views/HjernevelvWriter";
import HjernevelvEssay from "./views/HjernevelvEssay";
import Tag from "./views/Tag";
import Subscribe from "./views/Subscribe";
import SubscribeReturn from "./views/SubscribeReturn";
import BusinessPanel from "./views/BusinessPanel";
import Stillinger from "./views/Stillinger";
import StillingDetail from "./views/StillingDetail";
import StillingNy from "./views/StillingNy";
import StillingNyTakk from "./views/StillingNyTakk";
import Info from "./views/Info";
import Arrangementer from "./views/Arrangementer";
import ArrangementDetalj from "./views/ArrangementDetalj";
import Newsletter from "./views/Newsletter";
import Unsubscribe from "./views/Unsubscribe";
import Lytt from "./views/Lytt";
import { MascotTour } from "./components/mascot/MascotTour";
import { AudioPlayerProvider } from "./hooks/useAudioPlayer";
import { MiniPlayer } from "./components/audio/MiniPlayer";

const queryClient = new QueryClient();

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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
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
