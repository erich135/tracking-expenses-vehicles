// src/components/ui/AppLayout.tsx
import React from 'react';
import Sidebar from '../Sidebar';
import { Outlet } from 'react-router-dom';

const AppLayout: React.FC = () => {
  return (
    <div className="app-layout" style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
