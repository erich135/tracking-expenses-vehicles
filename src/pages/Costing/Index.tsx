import React from 'react';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';
import { VehicleProvider } from '@/contexts/VehicleContext';

const Index = () => {
  return (
    <div className="p-6 text-xl text-green-700">
      Welcome to the Costing Dashboard, Erich!
    </div>
  );
};

export default Index;