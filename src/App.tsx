import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import RentalUnitExpenses from "@/pages/RentalUnitExpenses";
import SalesPlanner from "@/pages/SalesPlanner";

// Costing Pages
import CostingModule from "@/pages/CostingModule"; // The main dashboard
import CostingAdd from "@/pages/CostingAdd";
import CostingList from "@/pages/CostingList";
import CostingReports from "@/pages/CostingReports";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ✅ Default Route */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AddExpenseForm />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* ✅ App Pages */}
        <Route
          path="/view-expenses"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ViewExpenses />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles"
          element={
            <ProtectedRoute>
              <AppLayout>
                <VehicleManagement />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicle-expenses"
          element={
            <ProtectedRoute>
              <AppLayout>
                <VehicleExpenses />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workshop-expenses"
          element={
            <ProtectedRoute>
              <AppLayout>
                <WorkshopExpenses />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rental-unit-expenses"
          element={
            <ProtectedRoute>
              <AppLayout>
                <RentalUnitExpenses />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales-planner"
          element={
            <ProtectedRoute>
              <AppLayout>
                <SalesPlanner />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Reports />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Settings />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AdminPanel />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* ✅ Costing Section */}
        <Route
          path="/costing"
          element={
            <ProtectedRoute>
              <AppLayout>
                <CostingModule />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/costing/add"
          element={
            <ProtectedRoute>
              <AppLayout>
                <CostingAdd />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/costing/list"
          element={
            <ProtectedRoute>
              <AppLayout>
                <CostingList />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/costing/reports"
          element={
            <ProtectedRoute>
              <AppLayout>
                <CostingReports />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* 404 fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
