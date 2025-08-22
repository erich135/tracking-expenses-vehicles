import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home as HomeIcon, BarChart2, Settings, Car, Wrench, FileText,
  LogOut, Database, Building, Menu, X
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const navItems = [
  { name: 'Home', icon: HomeIcon, path: '/', exact: true },
  { name: 'Costing', icon: FileText, sublinks: [{ name: 'Add New', path: '/costing/add' }, { name: 'View Entries', path: '/costing/view' }], permission: 'costing' },
  { name: 'Vehicle Expenses', icon: Car, sublinks: [{ name: 'Add Expense', path: '/vehicle-expenses/add' }, { name: 'View Expenses', path: '/vehicle-expenses/view' }, { name: 'Manage Vehicles', path: '/vehicles/manage' }], permission: 'vehicle_expenses' },
  { name: 'Workshop', icon: Wrench, sublinks: [{ name: 'Add New Job', path: '/workshop-jobs/add' }, { name: 'View Jobs', path: '/workshop-jobs/view' }], permission: 'workshop_jobs' },
  {
    name: 'Rental',
    icon: Building,
    sublinks: [
      { name: 'View Machines', path: '/rental/view' },
      { name: 'Add Income', path: '/rental/income/add' },
      { name: 'Add Expense', path: '/rental/expense/add' },
      { name: 'View Income', path: '/rental/income/view' },
      { name: 'View Expenses', path: '/rental/expense/view' },
    ],
    permission: 'rental'
  },
  {
    name: 'SLA',
    icon: Building,
    sublinks: [
      { name: 'View SLA Equipment', path: '/sla/equipment' },
      { name: 'Add SLA Expense', path: '/sla/add-expense' },
      { name: 'Add SLA Income', path: '/sla/add-income' },
    ],
    permission: 'sla'
  },
  { name: 'Reports', icon: BarChart2, path: '/reports', permission: 'reports' },
  {
    name: 'Maintenance', icon: Database, sublinks: [
      { name: 'Customers', path: '/maintenance/customers' },
      { name: 'Suppliers', path: '/maintenance/suppliers' },
      { name: 'Technicians', path: '/maintenance/technicians' },
      { name: 'Parts', path: '/maintenance/parts' },
    ], permission: 'maintenance'
  },
  { name: 'Settings', icon: Settings, path: '/settings', adminOnly: true },
];

const Sidebar = ({ isCollapsed, toggleCollapse }) => {
  const { signOut, userProfile } = useAuth();
  const location = useLocation();

  const hasPermission = (item) => {
    if (item.adminOnly) return userProfile?.is_admin;
    if (!item.permission) return true;
    if (userProfile?.is_admin) return true;
    return (userProfile?.permissions || []).includes(item.permission);
  };

  const visibleNavItems = navItems
    .filter(hasPermission)
    .map(item => ({
      ...item,
      sublinks: item.sublinks
        ? item.sublinks.filter(hasPermission)
        : undefined,
    }));

  return (
    <div className={`bg-gray-900 text-white flex flex-col h-screen fixed top-0 left-0 z-40 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo + Toggle Button */}
      <div className="p-4 flex justify-between items-center border-b border-gray-700">
        {!isCollapsed && (
          <img
  src="/company-logo.png"
  alt="Company Logo"
  className="h-20 mx-auto"
/>

        )}
        <button onClick={toggleCollapse} className="text-white ml-auto">
          {isCollapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        <ul>
          {visibleNavItems.map((item) => (
            <li key={item.name} className="mb-2">
              {item.sublinks ? (
                <AccordionItem item={item} location={location} isCollapsed={isCollapsed} />
              ) : (
                <Link
                  to={item.path}
                  className={`flex items-center p-2 rounded-md hover:bg-gray-700 ${location.pathname === item.path ? 'bg-gray-700' : ''}`}
                >
                  <item.icon className="mr-3" />
                  {!isCollapsed && item.name}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-2 border-t border-gray-700">
        <button onClick={signOut} className="w-full flex items-center p-2 rounded-md text-red-400 hover:bg-red-500 hover:text-white">
          <LogOut className="mr-3" />
          {!isCollapsed && 'Logout'}
        </button>
      </div>
    </div>
  );
};

const AccordionItem = ({ item, location, isCollapsed }) => {
  const isActiveParent = item.sublinks.some(sublink => location.pathname.startsWith(sublink.path.split('/').slice(0, 2).join('/')));
  const [isOpen, setIsOpen] = React.useState(isActiveParent);

  React.useEffect(() => {
    if (isActiveParent) {
      setIsOpen(true);
    }
  }, [location.pathname, isActiveParent]);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex justify-between items-center p-2 rounded-md hover:bg-gray-700 ${isActiveParent ? 'bg-gray-800' : ''}`}
      >
        <div className="flex items-center">
          <item.icon className="mr-3" />
          {!isCollapsed && item.name}
        </div>
        {!isCollapsed && (
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        )}
      </button>
      {!isCollapsed && (
        <motion.div
          initial={false}
          animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
          className="overflow-hidden"
        >
          <ul className="pl-8 pt-2">
            {item.sublinks.map((sublink) => (
              <li key={sublink.name} className="mb-2">
                <Link to={sublink.path} className={`block p-2 rounded-md hover:bg-gray-700 ${location.pathname === sublink.path ? 'bg-gray-600' : ''}`}>
                  {sublink.name}
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
};

const DashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <div className="flex bg-gray-100 dark:bg-slate-950/95">
      <Sidebar isCollapsed={isCollapsed} toggleCollapse={toggleCollapse} />
      <main
        className={`flex-1 p-8 overflow-auto h-screen transition-all duration-300`}
        style={{ marginLeft: isCollapsed ? '4rem' : '16rem' }}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
