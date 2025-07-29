// src/components/Sidebar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  const links = [
    { label: 'Dashboard', path: '/' },
    { label: 'Costing', path: '/costing' },
    { label: 'Vehicle Expenses', path: '/vehicle-expenses' },
    { label: 'Workshop Expenses', path: '/workshop-expenses' },
    { label: 'Rental Unit Expenses', path: '/rental-unit-expenses' },
    { label: 'Sales Planner', path: '/sales-planner' },
    { label: 'Reports', path: '/reports' },
    { label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="w-64 h-full bg-white border-r shadow-md p-4">
      <h2 className="text-xl font-bold mb-6">Nikita Dashboard</h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.path}>
            <Link
              to={link.path}
              className={`block px-4 py-2 rounded-md ${
                location.pathname === link.path
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-800 hover:bg-gray-100'
              }`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
