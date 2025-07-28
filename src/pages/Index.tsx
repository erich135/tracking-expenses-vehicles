import React from 'react';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';
import { VehicleProvider } from '@/contexts/VehicleContext';

const Index: React.FC = () => {
  return (
    <AppProvider>
      <VehicleProvider>
        <AppLayout />
      </VehicleProvider>
    </AppProvider>
  );
};

export default Index;