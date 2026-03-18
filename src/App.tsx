import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import Index from "./pages/Index";
import Article from "./pages/Article";
import Team from "./pages/Team";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Idrett from "./pages/Idrett";
import KlubbProfil from "./pages/KlubbProfil";
import Sammenlign from "./pages/Sammenlign";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import Login from "./pages/Login";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/article/:id" element={<Article />} />
            <Route path="/team" element={<Team />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/idrett" element={<Idrett />} />
            <Route path="/idrett/klubb/:id" element={<KlubbProfil />} />
            <Route path="/idrett/sammenlign" element={<Sammenlign />} />
            <Route path="/grupper" element={<Groups />} />
            <Route path="/grupper/:id" element={<GroupDetail />} />
            <Route path="/login" element={<Login />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
