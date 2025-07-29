// src/components/Sidebar.tsx
import React from 'react';
import { Link } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isAdmin }) => {
  return (
    <div className={`w-64 bg-white border-r p-4 ${isOpen ? 'block' : 'hidden'} md:block`}>
      <h2 className="text-xl font-bold mb-6">Nikita Dashboard</h2>
      <nav className="space-y-2">
        <Link to="/" className="block px-4 py-2 rounded hover:bg-blue-100">Dashboard</Link>
        <Link to="/costing" className="block px-4 py-2 rounded hover:bg-blue-100">Costing</Link>
        <Link to="/vehicle-expenses" className="block px-4 py-2 rounded hover:bg-blue-100">Vehicle Expenses</Link>
        <Link to="/workshop-expenses" className="block px-4 py-2 rounded hover:bg-blue-100">Workshop Expenses</Link>
        <Link to="/rental-unit-expenses" className="block px-4 py-2 rounded hover:bg-blue-100">Rental Unit Expenses</Link>
        <Link to="/sales-planner" className="block px-4 py-2 rounded hover:bg-blue-100">Sales Planner</Link>
        <Link to="/reports" className="block px-4 py-2 rounded hover:bg-blue-100">Reports</Link>
        <Link to="/settings" className="block px-4 py-2 rounded hover:bg-blue-100">Settings</Link>
        {isAdmin && <Link to="/admin" className="block px-4 py-2 rounded hover:bg-blue-100">Admin</Link>}
      </nav>
    </div>
  );
};

export default Sidebar;
