// src/App.tsx
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { VehicleProvider } from "@/contexts/VehicleContext";
import { supabase } from "@/lib/supabase";
import { Auth } from "@/components/Auth";
import Watermark from "@/components/Watermark";
import AppLayout from "@/components/ui/AppLayout";

import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import Costing from "@/pages/Costing";
import VehicleExpenses from "@/pages/VehicleExpenses";
import WorkshopExpenses from "@/pages/WorkshopExpenses";
import RentalUnitExpenses from "@/pages/RentalUnitExpenses";
import SalesPlanner from "@/pages/SalesPlanner";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";

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

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
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
                  <Route path="/" element={<AppLayout />}>
                    <Route index element={<Index />} />
                    <Route path="costing" element={<Costing />} />
                    <Route path="vehicle-expenses" element={<VehicleExpenses />} />
                    <Route path="workshop-expenses" element={<WorkshopExpenses />} />
                    <Route path="rental-unit-expenses" element={<RentalUnitExpenses />} />
                    <Route path="sales-planner" element={<SalesPlanner />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
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
