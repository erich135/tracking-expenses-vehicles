import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { VehicleProvider } from "@/contexts/VehicleContext";
import { supabase } from '@/lib/supabase';
import { Auth } from '@/components/Auth';
import Watermark from '@/components/Watermark';
import AppLayout from '@/components/ui/AppLayout';

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    const handleBeforeUnload = () => {
      supabase.auth.signOut();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Watermark showOnLogin={true} />
        <div className="text-lg relative z-10">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <ThemeProvider defaultTheme="light">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <div className="relative">
              <Watermark showOnLogin={true} />
              <Toaster />
              <Sonner />
              <Auth />
            </div>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <VehicleProvider>
          <TooltipProvider>
            <div className="relative">
              <Watermark />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="*" element={<AppLayout />} />
                </Routes>
              </BrowserRouter>
            </div>
          </TooltipProvider>
        </VehicleProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
