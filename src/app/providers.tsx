"use client";

import { useState, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RegionProvider } from "@/hooks/useRegion";

const queryClient = new QueryClient();

export function NextProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RegionProvider>
            {children}
          </RegionProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <RegionProvider>
            {children}
          </RegionProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
