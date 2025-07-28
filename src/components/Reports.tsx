import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SingleVehicleReport from './SingleVehicleReport';
import CompareVehiclesReport from './CompareVehiclesReport';
import TransactionListReport from './TransactionListReport';
import { FileText } from 'lucide-react';

const Reports: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Reports</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="single">Single Vehicle</TabsTrigger>
              <TabsTrigger value="compare">Compare Vehicles</TabsTrigger>
              <TabsTrigger value="transactions">Transaction List</TabsTrigger>
            </TabsList>
            
            <TabsContent value="single" className="mt-6">
              <SingleVehicleReport />
            </TabsContent>
            
            <TabsContent value="compare" className="mt-6">
              <CompareVehiclesReport />
            </TabsContent>
            
            <TabsContent value="transactions" className="mt-6">
              <TransactionListReport />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;