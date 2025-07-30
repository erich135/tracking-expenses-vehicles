import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CostingLandingPage from './pages/Costing/Index'; // ✅ Your actual file
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

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CostingLandingPage />} /> {/* Use this as default landing */}
        
        {/* Costing Section */}
        <Route path="/costing" element={<CostingLandingPage />} />
        <Route path="/costing/add" element={<AddCosting />} />
        <Route path="/costing/list" element={<CostingList />} />
        <Route path="/costing/reports" element={<CostingReports />} />

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
    </Router>
  );
}
