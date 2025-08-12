import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import HomePage from '@/pages/HomePage';
import AddCostingPage from '@/pages/AddCostingPage';
import ViewCostingsPage from '@/pages/ViewCostingsPage';
import AddVehicleExpensePage from '@/pages/AddVehicleExpensePage';
import ViewVehicleExpensesPage from '@/pages/ViewVehicleExpensesPage';
import ManageVehiclesPage from '@/pages/ManageVehiclesPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import AddWorkshopJobPage from '@/pages/AddWorkshopJobPage';
import ViewWorkshopJobsPage from '@/pages/ViewWorkshopJobsPage';
import MaintenancePage from '@/pages/MaintenancePage';
import ViewRentalEquipmentPage from '@/pages/rental/ViewRentalEquipmentPage';
import AddRentalIncomePage from '@/pages/rental/AddRentalIncomePage';
import AddRentalExpensePage from '@/pages/rental/AddRentalExpensePage';
import DataImportPage from '@/pages/DataImportPage';

const ProtectedRoute = ({ element, requiredPermission }) => {
    const { userProfile, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-white text-2xl">Loading...</div>
            </div>
        );
    }

    const hasPermission = userProfile?.is_admin || (userProfile?.permissions || []).includes(requiredPermission);

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
}


function AppRoutes() {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-white text-2xl">Loading...</div>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" replace />} />
            <Route path="/register" element={!session ? <RegisterPage /> : <Navigate to="/" replace />} />
            <Route 
                path="/" 
                element={
                    session ? <DashboardLayout /> : <Navigate to="/login" replace />
                }
            >
                <Route index element={<HomePage />} />
                <Route path="costing/add" element={<ProtectedRoute requiredPermission="costing" element={<AddCostingPage />} />} />
                <Route path="costing/view" element={<ProtectedRoute requiredPermission="costing" element={<ViewCostingsPage />} />} />
                <Route path="vehicle-expenses/add" element={<ProtectedRoute requiredPermission="vehicle_expenses" element={<AddVehicleExpensePage />} />} />
                <Route path="vehicle-expenses/view" element={<ProtectedRoute requiredPermission="vehicle_expenses" element={<ViewVehicleExpensesPage />} />} />
                <Route path="vehicles/manage" element={<ProtectedRoute requiredPermission="vehicle_expenses" element={<ManageVehiclesPage />} />} />
                <Route path="workshop-jobs/add" element={<ProtectedRoute requiredPermission="workshop_jobs" element={<AddWorkshopJobPage />} />} />
                <Route path="workshop-jobs/view" element={<ProtectedRoute requiredPermission="workshop_jobs" element={<ViewWorkshopJobsPage />} />} />
                <Route path="rental/view" element={<ProtectedRoute requiredPermission="rental" element={<ViewRentalEquipmentPage />} />} />
                <Route path="rental/income/add" element={<ProtectedRoute requiredPermission="rental" element={<AddRentalIncomePage />} />} />
                <Route path="rental/expense/add" element={<ProtectedRoute requiredPermission="rental" element={<AddRentalExpensePage />} />} />
                <Route path="reports" element={<ProtectedRoute requiredPermission="reports" element={<ReportsPage />} />} />
                <Route path="maintenance/:entity" element={<ProtectedRoute requiredPermission="maintenance" element={<MaintenancePage />} />} />
                <Route path="settings" element={<AdminRoute element={<SettingsPage />} />} />
                <Route path="settings/import" element={<AdminRoute element={<DataImportPage />} />} />
            </Route>
        </Routes>
    );
}

function App() {
    return (
        <>
            <Helmet>
                <title>FleetFlow</title>
                <meta name="description" content="A comprehensive fleet and workshop management dashboard." />
                <meta property="og:title" content="FleetFlow" />
                <meta property="og:description" content="A comprehensive fleet and workshop management dashboard." />
            </Helmet>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
            <Toaster />
        </>
    );
}

export default App;