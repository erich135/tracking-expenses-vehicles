import logo from './Assets/LMWLogo.png';

import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import NotFound from "@/pages/NotFound";

// Public Pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";

// Core Pages
import AddExpenseForm from "@/components/AddExpenseForm";
import ViewExpenses from "@/components/ViewExpenses";
import VehicleManagement from "@/components/VehicleManagement";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import AdminPanel from "@/components/AdminPanel";

// Sidebar Pages
import VehicleExpenses from "@/pages/VehicleExpenses";
import WorkshopExpenses from "@/pages/WorkshopExpenses";
import WorkshopAdd from "@/pages/WorkshopExpenses/WorkshopAdd";
import WorkshopEdit from "@/pages/WorkshopExpenses/WorkshopEdit"; // 👈 ADDED
import RentalUnitExpenses from "@/pages/RentalUnitExpenses";
import SalesPlanner from "@/pages/SalesPlanner";

// Costing Pages
import CostingModule from "@/pages/CostingModule";
import CostingAdd from "@/pages/CostingAdd";
import CostingList from "@/pages/CostingList";
import CostingReports from "@/pages/CostingReports";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes (still here but unused) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Home */}
        <Route
          path="/"
          element={
            <AppLayout>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <img src={logo} alt="Company Logo" style={{ maxWidth: '300px', maxHeight: '300px' }} />
              </div>
            </AppLayout>
          }
        />

        {/* App Pages */}
        <Route
          path="/view-expenses"
          element={
            <AppLayout>
              <ViewExpenses />
            </AppLayout>
          }
        />

        <Route
          path="/vehicles"
          element={
            <AppLayout>
              <VehicleManagement />
            </AppLayout>
          }
        />

        <Route
          path="/vehicle-expenses"
          element={
            <AppLayout>
              <VehicleExpenses />
            </AppLayout>
          }
        />

        <Route
          path="/workshop-expenses"
          element={
            <AppLayout>
              <WorkshopExpenses />
            </AppLayout>
          }
        />

        <Route
          path="/workshop-expenses/add"
          element={
            <AppLayout>
              <WorkshopAdd />
            </AppLayout>
          }
        />

        <Route
          path="/workshop-expenses/edit/:id" // 👈 NEW EDIT ROUTE
          element={
            <AppLayout>
              <WorkshopEdit />
            </AppLayout>
          }
        />

        <Route
          path="/rental-unit-expenses"
          element={
            <AppLayout>
              <RentalUnitExpenses />
            </AppLayout>
          }
        />

        <Route
          path="/sales-planner"
          element={
            <AppLayout>
              <SalesPlanner />
            </AppLayout>
          }
        />

        <Route
          path="/reports"
          element={
            <AppLayout>
              <Reports />
            </AppLayout>
          }
        />

        <Route
          path="/settings"
          element={
            <AppLayout>
              <Settings />
            </AppLayout>
          }
        />

        <Route
          path="/admin"
          element={
            <AppLayout>
              <AdminPanel />
            </AppLayout>
          }
        />

        {/* Costing Section */}
        <Route
          path="/costing"
          element={
            <AppLayout>
              <CostingModule />
            </AppLayout>
          }
        />

        <Route
          path="/costing/add"
          element={
            <AppLayout>
              <CostingAdd />
            </AppLayout>
          }
        />

        <Route
          path="/costing/list"
          element={
            <AppLayout>
              <CostingList />
            </AppLayout>
          }
        />

        <Route
          path="/costing/reports"
          element={
            <AppLayout>
              <CostingReports />
            </AppLayout>
          }
        />

        {/* 404 fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
