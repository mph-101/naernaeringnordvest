import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Article from "./pages/Article";
import Team from "./pages/Team";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Idrett from "./pages/Idrett";
import Tall from "./pages/Tall";
import KlubbProfil from "./pages/KlubbProfil";
import Sammenlign from "./pages/Sammenlign";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import MineDelteNotater from "./pages/MineDelteNotater";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Hjernetrim from "./pages/Hjernetrim";
import Hjernevelvet from "./pages/Hjernevelvet";
import HjernevelvPanel from "./pages/HjernevelvPanel";
import HjernevelvWriter from "./pages/HjernevelvWriter";
import HjernevelvEssay from "./pages/HjernevelvEssay";
import Tag from "./pages/Tag";
import Subscribe from "./pages/Subscribe";
import SubscribeReturn from "./pages/SubscribeReturn";
import BusinessPanel from "./pages/BusinessPanel";
import Stillinger from "./pages/Stillinger";
import StillingDetail from "./pages/StillingDetail";
import StillingNy from "./pages/StillingNy";
import StillingNyTakk from "./pages/StillingNyTakk";
import Info from "./pages/Info";
import Arrangementer from "./pages/Arrangementer";
import { MascotTour } from "./components/mascot/MascotTour";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
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
              <Route path="/idrett" element={<Tall />} />
              <Route path="/tall" element={<Tall />} />
              <Route path="/idrett/klubb/:id" element={<KlubbProfil />} />
              <Route path="/idrett/sammenlign" element={<Sammenlign />} />
              <Route path="/grupper" element={<Groups />} />
              <Route path="/grupper/:id" element={<GroupDetail />} />
              <Route path="/mine-delte-notater" element={<MineDelteNotater />} />
              <Route path="/arrangementer" element={<Arrangementer />} />
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
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
