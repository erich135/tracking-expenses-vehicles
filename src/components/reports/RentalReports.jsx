import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { FileDown, Calendar as CalendarIcon, BarChart, Table as TableIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MultiSelect } from '@/components/ui/multi-select.jsx';
import { downloadAsCsv } from '@/lib/exportUtils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { BarChart as RechartsBarChart, Bar as RechartsBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ReportTable = ({ columns, data, loading, emptyText = "No data found." }) => (
    <div className="overflow-x-auto">
        <Table>
            <TableHeader>
                <TableRow>
                    {columns.map(col => <TableHead key={col.key}>{col.label}</TableHead>)}
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow><TableCell colSpan={columns.length} className="text-center">Loading report...</TableCell></TableRow>
                ) : data.length === 0 ? (
                    <TableRow><TableCell colSpan={columns.length} className="text-center">{emptyText}</TableCell></TableRow>
                ) : (
                    data.map((row, rowIndex) => (
                        <TableRow key={rowIndex} className={row.rowClass}>
                            {columns.map(col => <TableCell key={col.key}>{row[col.key]}</TableCell>)}
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    </div>
);

const RentalReports = () => {
    const [rawData, setRawData] = useState({ equipment: [], incomes: [], expenses: [], expenseItems: [], customers: [] });
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Filters
    const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 90), to: new Date() });
    const [selectedMachines, setSelectedMachines] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [attributeFilter, setAttributeFilter] = useState({ key: 'all', value: '' });

    // View state
    const [viewMode, setViewMode] = useState('table');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [equipmentRes, incomesRes, expensesRes, expenseItemsRes, customersRes] = await Promise.all([
            supabase.from('rental_equipment').select('*, customer:customers(name)'),
            supabase.from('rental_incomes').select('*'),
            supabase.from('rental_expenses').select('*'),
            supabase.from('rental_expense_items').select('*'),
            supabase.from('customers').select('*')
        ]);

        if (equipmentRes.error || incomesRes.error || expensesRes.error || expenseItemsRes.error || customersRes.error) {
            toast({ variant: 'destructive', title: 'Error fetching rental data', description: 'Could not load all required data for reports.' });
        } else {
            setRawData({
                equipment: equipmentRes.data,
                incomes: incomesRes.data,
                expenses: expensesRes.data,
                expenseItems: expenseItemsRes.data,
                customers: customersRes.data,
            });
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const machineOptions = useMemo(() => rawData.equipment.map(m => ({ value: m.id, label: `${m.plant_no} - ${m.make} ${m.model}` })), [rawData.equipment]);
    const customerOptions = useMemo(() => rawData.customers.map(c => ({ value: c.id, label: c.name })), [rawData.customers]);

    const filteredEquipment = useMemo(() => {
        return rawData.equipment.filter(machine => {
            const customerMatch = selectedCustomers.length === 0 || (machine.customer_id && selectedCustomers.includes(machine.customer_id));
            const machineMatch = selectedMachines.length === 0 || selectedMachines.includes(machine.id);
            const attributeMatch = attributeFilter.key === 'all' || !attributeFilter.value ||
                String(machine[attributeFilter.key] || '').toLowerCase().includes(attributeFilter.value.toLowerCase());
            return customerMatch && machineMatch && attributeMatch;
        });
    }, [rawData.equipment, selectedCustomers, selectedMachines, attributeFilter]);

    const profitabilityData = useMemo(() => {
        const machineTotals = {};

        rawData.incomes.forEach(inc => {
            const incDate = new Date(inc.date);
            if ((!dateRange.from || incDate >= dateRange.from) && (!dateRange.to || incDate <= dateRange.to)) {
                if (!machineTotals[inc.rental_equipment_id]) machineTotals[inc.rental_equipment_id] = { income: 0, expense: 0 };
                machineTotals[inc.rental_equipment_id].income += Number(inc.amount);
            }
        });

        const expenseIdToMachineId = rawData.expenses.reduce((acc, exp) => {
            acc[exp.id] = exp.rental_equipment_id;
            return acc;
        }, {});

        rawData.expenseItems.forEach(item => {
            const machineId = expenseIdToMachineId[item.rental_expense_id];
            if (machineId) {
                if (!machineTotals[machineId]) machineTotals[machineId] = { income: 0, expense: 0 };
                machineTotals[machineId].expense += Number(item.total);
            }
        });
        
        return filteredEquipment.map(machine => {
            const totals = machineTotals[machine.id] || { income: 0, expense: 0 };
            const profit = totals.income - totals.expense;
            return {
                id: machine.id,
                name: `${machine.plant_no} - ${machine.make}`,
                Income: totals.income,
                Expense: totals.expense,
                Profit: profit,
            };
        });
    }, [filteredEquipment, rawData.incomes, rawData.expenses, rawData.expenseItems, dateRange]);

    const serviceData = useMemo(() => {
        return filteredEquipment.map(m => {
            const hours_to_service = (m.next_service_hours || 0) - (m.current_hours || 0);
            let rowClass = '';
            if (hours_to_service <= 500) rowClass = 'bg-red-100 dark:bg-red-900/40';
            else if (hours_to_service <= 1000) rowClass = 'bg-orange-100 dark:bg-orange-900/40';

            return {
                plant_no: m.plant_no,
                make: m.make,
                model: m.model,
                current_hours: m.current_hours,
                last_service_hours: m.last_service_hours,
                next_service_hours: m.next_service_hours,
                hours_to_service: hours_to_service > 0 ? hours_to_service : 'SERVICE DUE',
                rowClass: rowClass
            };
        }).sort((a,b) => (typeof a.hours_to_service === 'number' ? a.hours_to_service : -1) - (typeof b.hours_to_service === 'number' ? b.hours_to_service : -1));
    }, [filteredEquipment]);

    const expenseDetailsData = useMemo(() => {
        const machineIds = filteredEquipment.map(m => m.id);
        const filteredExpenses = rawData.expenses.filter(e => machineIds.includes(e.rental_equipment_id));
        const expenseIds = filteredExpenses.map(e => e.id);

        return rawData.expenseItems
            .filter(item => expenseIds.includes(item.rental_expense_id))
            .map(item => {
                const expense = filteredExpenses.find(e => e.id === item.rental_expense_id);
                const machine = rawData.equipment.find(m => m.id === expense.rental_equipment_id);
                return {
                    date: format(new Date(expense.date), 'yyyy-MM-dd'),
                    machine: machine ? `${machine.plant_no} - ${machine.make}` : 'N/A',
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: `R ${Number(item.unit_price).toFixed(2)}`,
                    total: `R ${Number(item.total).toFixed(2)}`
                };
            });
    }, [filteredEquipment, rawData.expenses, rawData.expenseItems, rawData.equipment]);
    
    const machineDirectoryData = useMemo(() => {
        return filteredEquipment.map(m => ({
            plant_no: m.plant_no,
            customer: m.customer?.name || 'N/A',
            make: m.make,
            model: m.model,
            serial_number: m.serial_number,
            kw: m.kw,
            bar: m.bar,
            volt: m.volt,
        }));
    }, [filteredEquipment]);

    const handleExport = (format, data, columns, title) => {
        const head = [columns.map(c => c.label)];
        const body = format === 'pdf' ? data : data.map(row => columns.map(col => row[col.key]));

        if (format === 'pdf') {
            const doc = new jsPDF();
            doc.text(title, 14, 16);
            doc.autoTable({ head, body, startY: 20 });
            doc.save(`${title}.pdf`);
        } else if (format === 'csv') {
            const csvData = data.map(row => {
                const newRow = {};
                columns.forEach(col => newRow[col.label] = row[col.key]);
                return newRow;
            })
            downloadAsCsv(`${title}.csv`, csvData);
        }
    };
    
    const attributeOptions = [
        { value: 'all', label: 'All Attributes' }, { value: 'make', label: 'Make' },
        { value: 'model', label: 'Model' }, { value: 'kw', label: 'KW' },
        { value: 'bar', label: 'Bar' }, { value: 'volt', label: 'Volt' }
    ];

    const profitCols = [
        { key: 'name', label: 'Machine' }, { key: 'Income', label: 'Income (R)' },
        { key: 'Expense', label: 'Expense (R)' }, { key: 'Profit', label: 'Profit (R)' }
    ];
    const serviceCols = [
        { key: 'plant_no', label: 'Plant No' }, { key: 'make', label: 'Make' }, { key: 'model', label: 'Model' },
        { key: 'current_hours', label: 'Current Hours' }, { key: 'last_service_hours', label: 'Last Service' },
        { key: 'next_service_hours', label: 'Next Service' }, { key: 'hours_to_service', label: 'Hours to Service' }
    ];
    const expenseCols = [
        { key: 'date', label: 'Date' }, { key: 'machine', label: 'Machine' }, { key: 'description', label: 'Description' },
        { key: 'quantity', label: 'Qty' }, { key: 'unit_price', label: 'Unit Price' }, { key: 'total', label: 'Total' }
    ];
    const directoryCols = [
        { key: 'plant_no', label: 'Plant No' }, { key: 'customer', label: 'Customer' }, { key: 'make', label: 'Make' },
        { key: 'model', label: 'Model' }, { key: 'serial_number', label: 'Serial No' }, { key: 'kw', label: 'KW' },
        { key: 'bar', label: 'Bar' }, { key: 'volt', label: 'Volt' }
    ];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Report Filters</CardTitle>
                    <CardDescription>Filter rental data for your report.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Popover>
                        <PopoverTrigger asChild><Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</> : format(dateRange.from, "LLL dd, y")) : <span>Pick a date range</span>}</Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /></PopoverContent>
                    </Popover>
                    <MultiSelect options={machineOptions} selected={selectedMachines} onChange={setSelectedMachines} placeholder="Filter by Machine..." />
                    <MultiSelect options={customerOptions} selected={selectedCustomers} onChange={setSelectedCustomers} placeholder="Filter by Customer..." />
                    <div className="lg:col-span-2 flex gap-2">
                        <Select value={attributeFilter.key} onValueChange={(v) => setAttributeFilter(p => ({...p, key: v}))}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Attribute" /></SelectTrigger>
                            <SelectContent>{attributeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input placeholder="Filter by attribute value..." value={attributeFilter.value} onChange={(e) => setAttributeFilter(p => ({...p, value: e.target.value}))} disabled={attributeFilter.key === 'all'} />
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="profitability" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="profitability">Profitability</TabsTrigger>
                    <TabsTrigger value="service">Service Schedule</TabsTrigger>
                    <TabsTrigger value="expenses">Expense Details</TabsTrigger>
                    <TabsTrigger value="directory">Machine Directory</TabsTrigger>
                </TabsList>

                <TabsContent value="profitability">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div><CardTitle>Profitability Report</CardTitle><CardDescription>Income, Expense, and Profit per machine.</CardDescription></div>
                            <div className="flex items-center gap-2">
                                <Button variant={viewMode === 'table' ? 'secondary' : 'outline'} size="sm" onClick={() => setViewMode('table')}><TableIcon className="h-4 w-4"/></Button>
                                <Button variant={viewMode === 'chart' ? 'secondary' : 'outline'} size="sm" onClick={() => setViewMode('chart')}><BarChart className="h-4 w-4"/></Button>
                                <Button variant="outline" size="sm" onClick={() => handleExport('pdf', profitabilityData.map(d=>[d.name, `R ${d.Income.toFixed(2)}`, `R ${d.Expense.toFixed(2)}`, `R ${d.Profit.toFixed(2)}`]), profitCols, 'Profitability Report')}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
                                <Button variant="outline" size="sm" onClick={() => handleExport('csv', profitabilityData, profitCols, 'Profitability Report')}><FileDown className="h-4 w-4 mr-2" />CSV</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {viewMode === 'table' ? (
                                <ReportTable columns={profitCols} data={profitabilityData.map(d=>({...d, Income: d.Income.toFixed(2), Expense: d.Expense.toFixed(2), Profit: d.Profit.toFixed(2)}))} loading={loading} />
                            ) : (
                                <div style={{ width: '100%', height: 400 }}>
                                    <ResponsiveContainer>
                                        <RechartsBarChart data={profitabilityData}>
                                            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(value) => `R ${Number(value).toFixed(2)}`} /><Legend />
                                            <RechartsBar dataKey="Income" fill="#82ca9d" /><RechartsBar dataKey="Expense" fill="#ff6b6b" /><RechartsBar dataKey="Profit" fill="#8884d8" />
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="service">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div><CardTitle>Service Schedule</CardTitle><CardDescription>Machines due for service.</CardDescription></div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleExport('pdf', serviceData.map(r=>serviceCols.map(c=>r[c.key])), serviceCols, 'Service Schedule')}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
                                <Button variant="outline" size="sm" onClick={() => handleExport('csv', serviceData, serviceCols, 'Service Schedule')}><FileDown className="h-4 w-4 mr-2" />CSV</Button>
                            </div>
                        </CardHeader>
                        <CardContent><ReportTable columns={serviceCols} data={serviceData} loading={loading} /></CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="expenses">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div><CardTitle>Expense Details</CardTitle><CardDescription>A detailed list of all expenses.</CardDescription></div>
                             <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleExport('pdf', expenseDetailsData.map(r=>expenseCols.map(c=>r[c.key])), expenseCols, 'Expense Details')}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
                                <Button variant="outline" size="sm" onClick={() => handleExport('csv', expenseDetailsData, expenseCols, 'Expense Details')}><FileDown className="h-4 w-4 mr-2" />CSV</Button>
                            </div>
                        </CardHeader>
                        <CardContent><ReportTable columns={expenseCols} data={expenseDetailsData} loading={loading} /></CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="directory">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div><CardTitle>Machine Directory</CardTitle><CardDescription>A complete list of machines based on your filters.</CardDescription></div>
                             <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleExport('pdf', machineDirectoryData.map(r=>directoryCols.map(c=>r[c.key])), directoryCols, 'Machine Directory')}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
                                <Button variant="outline" size="sm" onClick={() => handleExport('csv', machineDirectoryData, directoryCols, 'Machine Directory')}><FileDown className="h-4 w-4 mr-2" />CSV</Button>
                            </div>
                        </CardHeader>
                        <CardContent><ReportTable columns={directoryCols} data={machineDirectoryData} loading={loading} /></CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default RentalReports;