import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GenericMaintenanceTable } from '@/components/maintenance/GenericMaintenanceTable';

const maintenanceConfig = {
    customers: {
        title: 'Customers',
        tableName: 'customers',
        columns: [
            { accessor: 'id', header: 'ID', isEditable: false },
            { accessor: 'name', header: 'Name', isEditable: true, isRequired: true }
        ]
    },
    suppliers: {
        title: 'Suppliers',
        tableName: 'suppliers',
        columns: [
            { accessor: 'id', header: 'ID', isEditable: false },
            { accessor: 'name', header: 'Name', isEditable: true, isRequired: true }
        ]
    },
    technicians: {
        title: 'Technicians',
        tableName: 'technicians',
        columns: [
            { accessor: 'id', header: 'ID', isEditable: false },
            { accessor: 'name', header: 'Name', isEditable: true, isRequired: true },
            { accessor: 'rate', header: 'Rate', isEditable: true, type: 'number' }
        ]
    },
    parts: {
        title: 'Parts',
        tableName: 'parts',
        columns: [
            { accessor: 'id', header: 'ID', isEditable: false },
            { accessor: 'name', header: 'Name', isEditable: true, isRequired: true },
            { accessor: 'description', header: 'Description', isEditable: true },
            { accessor: 'price', header: 'Price', isEditable: true, type: 'number' }
        ]
    }
};

const MaintenancePage = () => {
    const { entity } = useParams();
    const config = maintenanceConfig[entity];

    if (!config) {
        return <Navigate to="/" replace />;
    }

    return (
        <>
            <Helmet>
                <title>Maintenance - {config.title}</title>
                <meta name="description" content={`Manage ${config.title}`} />
            </Helmet>
            <div className="container mx-auto p-4">
                <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Maintenance</h1>
                <Tabs defaultValue={entity} className="w-full" value={entity}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="customers">Customers</TabsTrigger>
                        <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                        <TabsTrigger value="technicians">Technicians</TabsTrigger>
                        <TabsTrigger value="parts">Parts</TabsTrigger>
                    </TabsList>
                    <TabsContent value={entity}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Manage {config.title}</CardTitle>
                                <CardDescription>Add, edit, or delete {config.title.toLowerCase()}.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <GenericMaintenanceTable
                                    tableName={config.tableName}
                                    columns={config.columns}
                                    title={config.title}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
};

export default MaintenancePage;