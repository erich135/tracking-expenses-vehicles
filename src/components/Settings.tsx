import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CategoryManager from './CategoryManager';
import SupplierManager from './SupplierManager';
import DataUpload from './DataUpload';

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="upload">Data Upload</TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories" className="space-y-4">
          <CategoryManager />
        </TabsContent>
        
        <TabsContent value="suppliers" className="space-y-4">
          <SupplierManager />
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-4">
          <DataUpload />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;