import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import AddExpenseForm from '@/components/AddExpenseForm';
import ViewExpenses from '@/components/ViewExpenses';
import VehicleManagement from '@/components/VehicleManagement';
import DataUpload from '@/components/DataUpload';
import Reports from '@/components/Reports';
import Settings from '@/components/Settings';
import AdminPanel from '@/components/AdminPanel';
import CostingModule from '@/components/CostingModule'; // ✅ NEW

const AdminPanelComponent = () => {
  const [approvedUsers, setApprovedUsers] = useState([]);
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
          {approvedUsers.map((user: any) => (
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
  const [activeTab, setActiveTab] = useState('add-expense');
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

  const renderContent = () => {
    switch (activeTab) {
      case 'add-expense':
        return <AddExpenseForm />;
      case 'view-expenses':
        return <ViewExpenses />;
      case 'vehicles':
        return <VehicleManagement />;
      case 'upload':
        return <DataUpload />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'admin':
        return isAdmin ? <AdminPanelComponent /> : <div>Access denied</div>;
      case 'costing':
        return <CostingModule />;
      default:
        return <AddExpenseForm />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAdmin={isAdmin}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
        />
        <main className="flex-1 overflow-auto p-4">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
