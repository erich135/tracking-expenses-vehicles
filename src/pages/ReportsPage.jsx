import React from 'react';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VehicleReports from '@/components/reports/VehicleReports';
import CostingReports from '@/components/reports/CostingReports';
import WorkshopReports from '@/components/reports/WorkshopReports';
import RentalReports from '@/components/reports/RentalReports';

const ReportsPage = () => {
  return (
    <>
      <Helmet>
        <title>Reports - FleetFlow</title>
        <meta name="description" content="View various reports for your fleet and operations." />
        <meta property="og:title" content="Reports - FleetFlow" />
        <meta property="og:description" content="View various reports for your fleet and operations." />
      </Helmet>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Reports</h1>
        <Tabs defaultValue="vehicles" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="costing">Costing</TabsTrigger>
            <TabsTrigger value="workshop">Workshop</TabsTrigger>
            <TabsTrigger value="rental">Rental</TabsTrigger>
          </TabsList>
          <TabsContent value="vehicles">
            <VehicleReports />
          </TabsContent>
          <TabsContent value="costing">
            <CostingReports />
          </TabsContent>
          <TabsContent value="workshop">
            <WorkshopReports />
          </TabsContent>
          <TabsContent value="rental">
            <RentalReports />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default ReportsPage;