import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import  supabase  from '@/lib/supabaseClient';

import CostingImport from '@/components/ui/CostingImport';
import CostingLandingPage from './pages/Costing/Index';
import AddCosting from './pages/Costing/Add';
import CostingList from './pages/Costing/List';
import CostingReports from './pages/Costing/Reports';
import VehicleExpenses from './pages/VehicleExpenses';
import WorkshopExpenses from './pages/WorkshopExpenses';
import RentalUnitExpenses from './pages/RentalUnitExpenses';
import SalesPlanner from './pages/SalesPlanner';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import LoginPage from './pages/Login';  // Create this if you don't have one yet

function ProtectedRoutes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login'); // redirect to login if not logged in
      }
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login');
    });

    return () => subscription.subscription.unsubscribe();
  }, [navigate]);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <Routes>
      {/* Costing Section */}
      <Route path="/" element={<CostingLandingPage />} />
      <Route path="/costing" element={<CostingLandingPage />} />
      <Route path="/costing/add" element={<AddCosting />} />
      <Route path="/costing/list" element={<CostingList />} />
      <Route path="/costing/reports" element={<CostingReports />} />
      <Route path="/costing/import" element={<CostingImport />} />

      {/* Other Modules */}
      <Route path="/vehicle-expenses" element={<VehicleExpenses />} />
      <Route path="/workshop-expenses" element={<WorkshopExpenses />} />
      <Route path="/rental-unit-expenses" element={<RentalUnitExpenses />} />
      <Route path="/sales-planner" element={<SalesPlanner />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<Settings />} />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Login Route */}
        <Route path="/login" element={<LoginPage />} />
        {/* All other routes are protected */}
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </Router>
  );
}
