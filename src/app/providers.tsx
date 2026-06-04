"use client";

import { useState, useEffect } from "react";
import { BrowserRouter, useNavigate as useRRNavigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RegionProvider } from "@/hooks/useRegion";
import { AuthProvider } from "@/hooks/useAuth";
import { AudioPlayerProvider } from "@/hooks/useAudioPlayer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { MascotTour } from "@/components/mascot/MascotTour";
import { FeatureWalkthrough } from "@/components/onboarding/FeatureWalkthrough";

const queryClient = new QueryClient();

/**
 * Intercept react-router navigations and turn them into full page loads
 * so that Next.js App Router handles routing properly.
 */
function NavigationInterceptor({ children }: { children: React.ReactNode }) {
  const rrNavigate = useRRNavigate();

  useEffect(() => {
    // Monkey-patch the history methods so any react-router navigate()
    // triggers a full page load instead of a client-side transition
    const origPush = window.history.pushState.bind(window.history);
    const origReplace = window.history.replaceState.bind(window.history);
    let intercepting = true;

    window.history.pushState = function (data, unused, url) {
      if (intercepting && url && typeof url === "string" && url.startsWith("/")) {
        window.location.href = url;
        return;
      }
      return origPush(data, unused, url);
    };

    window.history.replaceState = function (data, unused, url) {
      if (intercepting && url && typeof url === "string" && url.startsWith("/")) {
        window.location.replace(url);
        return;
      }
      return origReplace(data, unused, url);
    };

    return () => {
      intercepting = false;
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, []);

  return <>{children}</>;
}

export function NextProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NavigationInterceptor>
          <AuthProvider>
            <ThemeProvider>
              <RegionProvider>
                <AudioPlayerProvider>
                  <TooltipProvider>
                    {children}
                    <MascotTour />
                    <FeatureWalkthrough />
                    <Toaster />
                    <Sonner />
                  </TooltipProvider>
                </AudioPlayerProvider>
              </RegionProvider>
            </ThemeProvider>
          </AuthProvider>
        </NavigationInterceptor>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
