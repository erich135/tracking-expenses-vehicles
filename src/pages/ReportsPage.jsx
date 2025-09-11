import React, { useContext } from 'react';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VehicleReports from '@/components/reports/VehicleReports';
import CostingReports from '@/components/reports/CostingReports';
import WorkshopReports from '@/components/reports/WorkshopReports';
import RentalReports from '@/components/reports/RentalReports';
import SlaReportsSection from '@/components/reports/SlaReportsSection';
import { AuthContext } from '@/contexts/SupabaseAuthContext'; // ✅ Fixed import here

const ReportsPage = () => {
  const { userProfile } = useContext(AuthContext);
  const permissions = userProfile?.permissions || [];

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
          <TabsList className="grid w-full grid-cols-5">
            {permissions.includes('vehicle_expenses') && <TabsTrigger value="vehicles">Vehicles</TabsTrigger>}
            {permissions.includes('costing') && <TabsTrigger value="costing">Costing</TabsTrigger>}
            {permissions.includes('workshop_jobs') && <TabsTrigger value="workshop">Workshop</TabsTrigger>}
            {permissions.includes('rental') && <TabsTrigger value="rental">Rental</TabsTrigger>}
            {permissions.includes('sla') && <TabsTrigger value="sla">SLA</TabsTrigger>}
          </TabsList>

          {permissions.includes('vehicle_expenses') && (
            <TabsContent value="vehicles">
              <VehicleReports />
            </TabsContent>
          )}

          {permissions.includes('costing') && (
            <TabsContent value="costing">
              <CostingReports />
            </TabsContent>
          )}

          {permissions.includes('workshop_jobs') && (
            <TabsContent value="workshop">
              <WorkshopReports />
            </TabsContent>
          )}

          {permissions.includes('rental') && (
            <TabsContent value="rental">
              <RentalReports />
            </TabsContent>
          )}

          {permissions.includes('sla') && (
            <TabsContent value="sla">
              <SlaReportsSection />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </>
  );
};

export default ReportsPage;
