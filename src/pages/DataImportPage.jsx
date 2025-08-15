import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import Papa from 'papaparse';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Download, UploadCloud } from 'lucide-react';

const importConfigs = {
  vehicle_expenses: {
    label: 'Vehicle Expenses',
    template: [
      { registration_number: 'CA12345', category: 'Fuel', supplier: 'Shell', amount: 500.50, date: '2023-10-26', description: 'Monthly fuel', litres: 40.5, odometer: 150000 }
    ],
    requiredFields: ['registration_number', 'category', 'amount', 'date'],
    tableName: 'vehicle_expenses',
    foreignKeys: {
        vehicle_id: { from: 'vehicles', select: 'id', where: 'registration_number' }
    }
  },
  workshop_jobs: {
    label: 'Workshop Jobs',
    template: [
      { job_number: 'WJ001', equipment_detail: 'Engine Repair', customer_name: 'Cash Sale', cash_customer_name: 'John Doe', quote_date: '2023-10-26', po_date: '2023-10-27', quote_amount: 1500.00, status: 'Completed', technician_name: 'Tech Guy' }
    ],
    requiredFields: ['job_number', 'customer_name', 'status'],
    tableName: 'workshop_jobs',
    foreignKeys: {
        customer_id: { from: 'customers', select: 'id', where: 'name' },
        technician_id: { from: 'technicians', select: 'id', where: 'name' }
    }
  },
  rental_incomes: {
    label: 'Rental Income',
    template: [
        { plant_no: 'PLANT-001', customer_name: 'Big Construction Co', invoice_number: 'INV-001', date: '2023-10-26', amount: 25000.00, notes: 'Monthly rental' }
    ],
    requiredFields: ['plant_no', 'customer_name', 'date', 'amount'],
    tableName: 'rental_incomes',
    foreignKeys: {
        rental_equipment_id: { from: 'rental_equipment', select: 'id', where: 'plant_no' },
        customer_id: { from: 'customers', select: 'id', where: 'name' }
    }
  },
  rental_expenses: {
    label: 'Rental Expenses',
        template: [
      {
        plant_no: 'PLANT-001',
        supplier_name: 'Parts Supplier',
        date: '2023-10-25',
        current_hours: 3034,  // ✅ Add this line
        item_description: 'Oil Filter',
        quantity: 2,
        unit_price: 150.00
      }
    ],

    requiredFields: ['plant_no', 'date', 'item_description', 'quantity', 'unit_price'],
    tableName: 'rental_expenses',
    isGrouped: true, // Special handling for grouped items
    foreignKeys: {
        rental_equipment_id: { from: 'rental_equipment', select: 'id', where: 'plant_no' },
        supplier_id: { from: 'suppliers', select: 'id', where: 'name' }
    }
  },
};

const DataImporter = ({ configKey }) => {
    const config = importConfigs[configKey];
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const downloadTemplate = () => {
        const csv = Papa.unparse(config.template);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${configKey}_template.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const processForeignKey = async (data, keyMaps) => {
        const processedData = [];
        for (const row of data) {
            let valid = true;
            const newRow = { ...row, user_id: user.id };

            for (const fk of Object.keys(config.foreignKeys)) {
                const fkConfig = config.foreignKeys[fk];
                const lookupValue = row[fkConfig.where];
                if(lookupValue && fkConfig.where.endsWith('_name')) {
                    const baseKey = fkConfig.where.replace('_name', '');
                     if(lookupValue.toLowerCase() === 'cash sale') {
                        newRow[fk] = null;
                        if(baseKey === 'customer') {
                            newRow['cash_customer_name'] = row['cash_customer_name'];
                        }
                    } else {
                        const id = keyMaps[baseKey][lookupValue];
                        if (id === undefined) {
                            toast({ variant: 'destructive', title: `Data Error in row`, description: `Could not find ${baseKey} '${lookupValue}'. Please ensure it exists in the '${fkConfig.from}' table.` });
                            valid = false;
                            break;
                        }
                        newRow[fk] = id;
                    }
                } else if (lookupValue) {
                    const id = keyMaps[fk.replace('_id', '')][lookupValue];
                     if (id === undefined) {
                        toast({ variant: 'destructive', title: `Data Error in row`, description: `Could not find ${fk.replace('_id', '')} '${lookupValue}'. Please ensure it exists in the '${fkConfig.from}' table.` });
                        valid = false;
                        break;
                    }
                    newRow[fk] = id;
                }
                delete newRow[fkConfig.where];
            }
            if (valid) {
                processedData.push(newRow);
            }
        }
        return processedData;
    }

    const handleUpload = async () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'No file selected', description: 'Please select a CSV file to upload.' });
            return;
        }
        setLoading(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                let data = results.data;
                const headers = results.meta.fields;
                
                for (const field of config.requiredFields) {
                    if (!headers.includes(field)) {
                        toast({ variant: 'destructive', title: 'Invalid CSV', description: `Missing required column: ${field}` });
                        setLoading(false);
                        return;
                    }
                }

                // Fetch foreign key data to create maps
                const keyMaps = {};
                for (const fk of Object.keys(config.foreignKeys)) {
                    const fkConfig = config.foreignKeys[fk];
                    const keyName = fk.replace('_id', '');
                    keyMaps[keyName] = {};
                    const { data: fkData, error: fkError } = await supabase.from(fkConfig.from).select(`${fkConfig.select}, ${fkConfig.where}`);
                    if (fkError) {
                        toast({ variant: "destructive", title: "DB Error", description: `Could not fetch from ${fkConfig.from}` });
                        setLoading(false);
                        return;
                    }
                    fkData.forEach(item => {
                        keyMaps[keyName][item[fkConfig.where]] = item[fkConfig.select];
                    });
                }
                
                data = await processForeignKey(data, keyMaps);
                if (data.length === 0) {
                     toast({ variant: 'destructive', title: 'Upload Failed', description: 'No valid rows to import after processing.' });
                     setLoading(false);
                     return;
                }

                if (config.isGrouped) {
                     // Special handling for rental_expenses
                    const expenseGroups = data.reduce((acc, row) => {
                        const key = `${row.rental_equipment_id}-${row.supplier_id}-${row.date}`;
                        if (!acc[key]) {
                            acc[key] = {
                                rental_equipment_id: row.rental_equipment_id,
                                supplier_id: row.supplier_id,
                                date: row.date,
                                user_id: row.user_id,
                                items: []
                            };
                        }
                        acc[key].items.push({ description: row.item_description, quantity: row.quantity, unit_price: row.unit_price });
                        return acc;
                    }, {});

                    const expenseList = Object.values(expenseGroups);
                    for (const expense of expenseList) {
                        const { items, ...expenseHeader } = expense;
                        const { data: insertedExpense, error: expenseError } = await supabase.from('rental_expenses').insert(expenseHeader).select().single();
                        if (expenseError) continue;
                        
                        const itemsToInsert = items.map(item => ({...item, rental_expense_id: insertedExpense.id}));
                        await supabase.from('rental_expense_items').insert(itemsToInsert);
                    }
                    toast({ title: 'Success!', description: `${expenseList.length} expense records imported.` });

                } else {
                    const { error } = await supabase.from(config.tableName).insert(data);
                    if (error) {
                        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
                    } else {
                        toast({ title: 'Success!', description: `${data.length} records imported successfully.` });
                    }
                }

                setLoading(false);
                setFile(null);
                document.getElementById(`file-input-${configKey}`).value = '';
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{config.label}</CardTitle>
                <CardDescription>Upload a CSV file with your historical {config.label.toLowerCase()}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor={`file-input-${configKey}`}>CSV File</Label>
                    <Input id={`file-input-${configKey}`} type="file" accept=".csv" onChange={handleFileChange} />
                </div>
                <div className="flex items-center gap-4">
                    <Button onClick={handleUpload} disabled={loading}>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        {loading ? 'Uploading...' : 'Upload'}
                    </Button>
                    <Button variant="outline" onClick={downloadTemplate}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Template
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

const DataImportPage = () => {
    return (
        <>
            <Helmet>
                <title>Data Import - FleetFlow</title>
                <meta name="description" content="Import historical data into your application." />
            </Helmet>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold">Data Import Center</h1>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.keys(importConfigs).map(key => (
                        <DataImporter key={key} configKey={key} />
                    ))}
                </div>
            </div>
        </>
    );
};

export default DataImportPage;
