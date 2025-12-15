import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';

// Pages
import UpdatePasswordPage from '@/pages/UpdatePasswordPage';
import HomePage from '@/pages/HomePage';
import AddCostingPage from '@/pages/AddCostingPage';
import ViewCostingsPage from '@/pages/ViewCostingsPage';
import AddVehicleExpensePage from '@/pages/AddVehicleExpensePage';
import ViewVehicleExpensesPage from '@/pages/ViewVehicleExpensesPage';
import ManageVehiclesPage from '@/pages/ManageVehiclesPage';
import ReportsPage from '@/pages/ReportsPage';
import MonthlyReportPage from '@/pages/MonthlyReportPage';
import SettingsPage from '@/pages/SettingsPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import AddWorkshopJobPage from '@/pages/AddWorkshopJobPage';
import ViewWorkshopJobsPage from '@/pages/ViewWorkshopJobsPage';
import MaintenancePage from '@/pages/MaintenancePage';
import ViewRentalEquipmentPage from '@/pages/rental/ViewRentalEquipmentPage';
import AddRentalIncomePage from '@/pages/rental/AddRentalIncomePage';
import ViewRentalIncomes from '@/pages/rental/ViewRentalIncomes';
import EditRentalIncomePage from '@/pages/rental/EditRentalIncomePage';
import AddRentalExpensePage from '@/pages/rental/AddRentalExpensePage';
import ViewRentalExpenses from '@/pages/rental/ViewRentalExpenses';
import EditRentalExpensePage from './pages/rental/EditRentalExpensePage';
import DataImportPage from '@/pages/DataImportPage';
import AddSLAExpensePage from '@/pages/sla/AddSLAExpensePage';
import AddSLAIncomePage from '@/pages/sla/AddSLAIncomePage';
import ViewSLAEquipmentPage from '@/pages/sla/ViewSLAEquipmentPage';
import ViewSLAExpensesPage from '@/pages/sla/ViewSLAExpensesPage';
import ViewSLAIncomesPage from '@/pages/sla/ViewSLAIncomesPage';
import AuditTrailPage from '@/pages/AuditTrailPage';
import AdminPage from '@/pages/AdminPage';



// ---------- Route Guards ----------

const ProtectedRoute = ({ element, requiredPermission }) => {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  // ✅ Super admin bypass OR required permission
  const hasPermission =
    userProfile?.is_admin ||
    (userProfile?.permissions || []).includes(requiredPermission);

  if (!hasPermission) {
    return <Navigate to="/" replace />;
  }

  return element;
};

const AdminRoute = ({ element }) => {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (!userProfile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return element;
};

// ---------- Routes ----------

function AppRoutes() {
  const { session, loading, userProfile } = useAuth();
  const location = useLocation();

  const can = (perm) =>
    userProfile?.is_admin || (userProfile?.permissions || []).includes(perm);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public auth routes */}
      <Route
        path="/login"
        element={!session ? <LoginPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/register"
        element={!session ? <RegisterPage /> : <Navigate to="/" replace />}
      />
      <Route path="/update-password" element={<UpdatePasswordPage />} />

      {/* Main app routes */}
      <Route
        path="/"
        element={
          session ? (
            <DashboardLayout />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        {/* Home */}
        <Route index element={<HomePage />} />

        {/* Costing */}
        <Route
          path="costing/add"
          element={
            <ProtectedRoute
              requiredPermission="costing"
              element={<AddCostingPage />}
            />
          }
        />
        <Route
          path="costing/view"
          element={
            <ProtectedRoute
              requiredPermission="costing"
              element={<ViewCostingsPage />}
            />
          }
        />

        {/* Vehicle expenses */}
        <Route
          path="vehicle-expenses/add"
          element={
            <ProtectedRoute
              requiredPermission="vehicle_expenses"
              element={<AddVehicleExpensePage />}
            />
          }
        />
        <Route
          path="vehicle-expenses/view"
          element={
            <ProtectedRoute
              requiredPermission="vehicle_expenses"
              element={<ViewVehicleExpensesPage />}
            />
          }
        />
        <Route
          path="vehicles/manage"
          element={
            <ProtectedRoute
              requiredPermission="vehicle_expenses"
              element={<ManageVehiclesPage />}
            />
          }
        />

        {/* Workshop */}
        <Route
          path="workshop-jobs/add"
          element={
            <ProtectedRoute
              requiredPermission="workshop_jobs"
              element={<AddWorkshopJobPage />}
            />
          }
        />
        <Route
          path="workshop-jobs/view"
          element={
            <ProtectedRoute
              requiredPermission="workshop_jobs"
              element={<ViewWorkshopJobsPage />}
            />
          }
        />

        {/* Rental */}
        <Route
          path="rental/view"
          element={
            <ProtectedRoute
              requiredPermission="rental"
              element={<ViewRentalEquipmentPage />}
            />
          }
        />
        <Route
          path="rental/income/add"
          element={
            <ProtectedRoute
              requiredPermission="rental"
              element={<AddRentalIncomePage />}
            />
          }
        />
        <Route
          path="rental/income/view"
          element={
            <ProtectedRoute
              requiredPermission="rental"
              element={<ViewRentalIncomes />}
            />
          }
        />
        <Route
          path="rental/income/edit/:id"
          element={
            <ProtectedRoute
              requiredPermission="rental"
              element={<EditRentalIncomePage />}
            />
          }
        />
        <Route
          path="rental/expense/add"
          element={
            <ProtectedRoute
              requiredPermission="rental"
              element={<AddRentalExpensePage />}
            />
          }
        />
        <Route
          path="rental/expense/view"
          element={
            <ProtectedRoute
              requiredPermission="rental"
              element={<ViewRentalExpenses />}
            />
          }
        />
        <Route
          path="rental/expense/edit/:id"
          element={
            <ProtectedRoute
              requiredPermission="rental"
              element={<EditRentalExpensePage />}
            />
          }
        />

        {/* Reports */}
        <Route
          path="reports"
          element={
            <ProtectedRoute
              requiredPermission="reports"
              element={<ReportsPage />}
            />
          }
        />
        <Route
          path="reports/monthly"
          element={
            <ProtectedRoute
              requiredPermission="costing"
              element={<MonthlyReportPage />}
            />
          }
        />

        {/* Maintenance */}
        <Route
          path="maintenance/:entity"
          element={
            <ProtectedRoute
              requiredPermission="maintenance"
              element={<MaintenancePage />}
            />
          }
        />

        {/* Settings (admin only) */}
        <Route
          path="settings"
          element={<AdminRoute element={<SettingsPage />} />}
        />
        <Route
          path="settings/import"
          element={<AdminRoute element={<DataImportPage />} />}
        />
        <Route
          path="settings/audit"
          element={<AdminRoute element={<AuditTrailPage />} />}
        />

          {/* Admin page (admin only) */}
          <Route
            path="admin"
            element={<AdminRoute element={<AdminPage />} />}
          />

        {/* SLA */}
        {can('sla') && (
          <>
            <Route path="sla/add-expense" element={<AddSLAExpensePage />} />
            <Route path="sla/add-income" element={<AddSLAIncomePage />} />
            <Route path="sla/equipment" element={<ViewSLAEquipmentPage />} />
            <Route path="sla/view-expenses" element={<ViewSLAExpensesPage />} />
            <Route path="sla/view-incomes" element={<ViewSLAIncomesPage />} />
            <Route path="sla/view" element={<ViewSLAEquipmentPage />} />
          </>
        )}
      </Route>
    </Routes>
  );
}

// ---------- App Shell ----------

function App() {
  return (
    <>
      <Helmet>
        <title>FleetFlow</title>
        <meta
          name="description"
          content="A comprehensive fleet and workshop management dashboard."
        />
        <meta property="og:title" content="FleetFlow" />
        <meta
          property="og:description"
          content="A comprehensive fleet and workshop management dashboard."
        />
      </Helmet>

      <AuthProvider>
        <AppRoutes />
      </AuthProvider>

      <Toaster />
    </>
  );
}

export default App;
