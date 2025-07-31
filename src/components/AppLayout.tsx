import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import AddExpenseForm from '@/components/AddExpenseForm';
import ViewExpenses from '@/components/ViewExpenses';
import VehicleManagement from '@/components/VehicleManagement';
import DataUpload from '@/components/DataUpload';
import Reports from '@/components/Reports';
import Settings from '@/components/Settings';
import CostingModule from '@/components/CostingModule';

type ApprovedUser = {
  id: string;
  email: string;
  is_admin?: boolean;
};

const AdminPanelComponent = () => {
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    fetchApprovedUsers();
  }, []);

  const fetchApprovedUsers = async () => {
    const { data } = await supabase.from('approved_users').select('*');
    setApprovedUsers(data || []);
  };

  const addUser = async () => {
    if (!newEmail) return;
    await supabase.from('approved_users').insert({ email: newEmail });
    setNewEmail('');
    fetchApprovedUsers();
  };

  const removeUser = async (id: string) => {
    await supabase.from('approved_users').delete().eq('id', id);
    fetchApprovedUsers();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="Email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 px-3 py-2 border rounded"
          />
          <button onClick={addUser} className="px-4 py-2 bg-blue-500 text-white rounded">
            Add User
          </button>
        </div>
        <div className="space-y-2">
          {approvedUsers.map((user) => (
            <div key={user.id} className="flex justify-between items-center p-2 border rounded">
              <span>{user.email} {user.is_admin && '(Admin)'}</span>
              {!user.is_admin && (
                <button
                  onClick={() => removeUser(user.id)}
                  className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user?.email === 'erich.oberholzer@gmail.com') {
      setIsAdmin(true);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isAdmin={isAdmin}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
        />
        <main className="flex-1 overflow-auto p-4">
          <Routes>
            <Route path="/" element={<AddExpenseForm />} />
            <Route path="/vehicle-expenses" element={<AddExpenseForm />} />
            <Route path="/view-expenses" element={<ViewExpenses />} />
            <Route path="/vehicles" element={<VehicleManagement />} />
            <Route path="/upload" element={<DataUpload />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/costing" element={<CostingModule />} />
            <Route path="/admin" element={isAdmin ? <AdminPanelComponent /> : <div>Access Denied</div>} />
            <Route path="*" element={<div>Page not found</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
