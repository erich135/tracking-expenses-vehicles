import React from 'react';
import { Helmet } from 'react-helmet';

const AdminPage = () => (
  <div className="max-w-3xl mx-auto py-8">
    <Helmet>
      <title>Admin</title>
      <meta name="description" content="Admin dashboard and tools." />
    </Helmet>
    <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
    <p className="mb-6">Welcome, admin! Here you can manage advanced settings and view system information.</p>
    {/* Add admin tools/components here */}
  </div>
);

export default AdminPage;
