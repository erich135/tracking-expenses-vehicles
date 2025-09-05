
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { FileDown, Calendar as CalendarIcon, PanelTop as TableIcon, BarChart as BarChartIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MultiSelect } from '@/components/ui/multi-select.jsx';
import { downloadAsCsv } from '@/lib/exportUtils';
import { jobStatuses } from '@/pages/AddWorkshopJobPage';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const WorkshopReports = () => {
    const [allJobs, setAllJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const [viewMode, setViewMode] = useState('table');
    const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 3650), to: new Date() });
    const [selectedTechnicians, setSelectedTechnicians] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('workshop_jobs')
            .select('*, technician:technicians(name), customer:customers(name)');
        
        if (error) {
            toast({ variant: 'destructive', title: 'Error fetching jobs', description: error.message });
        } else {
            setAllJobs(data);
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const technicianOptions = useMemo(() => {
        const uniqueTechnicians = [...new Map(allJobs.filter(j => j.technician).map(item => [item.technician.name, item.technician])).values()];
        return uniqueTechnicians.map(t => ({ value: t.name, label: t.name }));
    }, [allJobs]);

    const customerOptions = useMemo(() => {
        const uniqueCustomers = [...new Map(allJobs.map(item => [item.customer?.name || item.cash_customer_name, item])).values()];
        return uniqueCustomers
            .map(c => ({ value: c.customer?.name || c.cash_customer_name, label: c.customer?.name || c.cash_customer_name }))
            .filter(opt => opt.value);
    }, [allJobs]);

    const statusOptions = useMemo(() => jobStatuses.map(s => ({ value: s, label: s })), []);

    const filteredData = useMemo(() => {
        return allJobs.filter(job => {
            const jobDate = new Date(job.quote_date || job.created_at);
            const inDateRange = (!dateRange.from || jobDate >= dateRange.from) && (!dateRange.to || jobDate <= dateRange.to);
            const isTechnicianSelected = selectedTechnicians.length === 0 || selectedTechnicians.includes(job.technician?.name);
            const isCustomerSelected = selectedCustomers.length === 0 || selectedCustomers.includes(job.customer?.name || job.cash_customer_name);
            const isStatusSelected = selectedStatuses.length === 0 || selectedStatuses.includes(job.status);
            
            return inDateRange && isTechnicianSelected && isCustomerSelected && isStatusSelected;
        });
    }, [allJobs, dateRange, selectedTechnicians, selectedCustomers, selectedStatuses]);
    
    const handleExport = (format) => {
        const title = 'Workshop Jobs Report';
        const head = [["Job No.", "Technician", "Equipment", "Customer", "PO Date", "Quote Amt.", "Status"]];
        const body = filteredData.map(j => [
            j.job_number,
            j.technician?.name,
            j.equipment_detail,
            j.customer?.name || j.cash_customer_name,
            j.po_date ? format(new Date(j.po_date), 'yyyy-MM-dd') : 'N/A',
            `R ${Number(j.quote_amount || 0).toFixed(2)}`,
            j.status,
        ]);

        if (format === 'pdf') {
            const doc = new jsPDF();
            doc.text(title, 14, 16);
            doc.autoTable({ head, body, startY: 20 });
            doc.save(`${title}.pdf`);
        } else if (format === 'csv') {
            const csvData = body.map(row => ({
                'Job No.': row[0],
                'Technician': row[1],
                'Equipment': row[2],
                'Customer': row[3],
                'PO Date': row[4],
                'Quote Amt.': row[5],
                'Status': row[6],
            }));
            downloadAsCsv(`${title}.csv`, csvData);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Report Filters</CardTitle>
                    <CardDescription>Filter the workshop job data for your report.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</> : format(dateRange.from, "LLL dd, y")) : <span>Pick a date range</span>}</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /></PopoverContent>
                    </Popover>
                    <MultiSelect options={technicianOptions} selected={selectedTechnicians} onChange={setSelectedTechnicians} placeholder="Filter by Technician..." />
                    <MultiSelect options={customerOptions} selected={selectedCustomers} onChange={setSelectedCustomers} placeholder="Filter by Customer..." />
                    <MultiSelect options={statusOptions} selected={selectedStatuses} onChange={setSelectedStatuses} placeholder="Filter by Status..." />
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Workshop Report</CardTitle>
                        <CardDescription>View report as a table or chart.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')}><TableIcon className="h-4 w-4 mr-2" />Table</Button>
                        <Button variant={viewMode === 'chart' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('chart')}><BarChartIcon className="h-4 w-4 mr-2" />Chart</Button>
                        <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
                        <Button variant="outline" size="sm" onClick={() => handleExport('csv')}><FileDown className="h-4 w-4 mr-2" />CSV</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <p>Loading report...</p> : (
                        viewMode === 'table' ? (
                            <Table>
                                <TableHeader><TableRow><TableHead className="table-head-bold">
Job No.</TableHead><TableHead className="table-head-bold">
Technician</TableHead><TableHead className="table-head-bold">
Equipment</TableHead><TableHead className="table-head-bold">
Customer</TableHead><TableHead className="table-head-bold">
PO Date</TableHead><TableHead className="table-head-bold">
Quote Amt.</TableHead><TableHead className="table-head-bold">
Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredData.length > 0 ? filteredData.map(job => (
                                        <TableRow key={job.id}>
                                            <TableCell>{job.job_number}</TableCell>
                                            <TableCell>{job.technician?.name}</TableCell>
                                            <TableCell>{job.equipment_detail}</TableCell>
                                            <TableCell>{job.customers?.name || job.cash_customer_name || 'Unknown'}</TableCell>
                                            <TableCell>{job.po_date ? format(new Date(job.po_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                                            <TableCell>R {Number(job.quote_amount || 0).toFixed(2)}</TableCell>
                                            <TableCell>
                                            <span className={`status-label ${job.status?.toLowerCase().replace(/\s+/g, '-') || 'default'}`}>
                                                {job.status || 'N/A'}
                                            </span>
                                            </TableCell>

                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={7} className="text-center">No data available for the selected filters.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        ) : (
                            <div style={{ width: '100%', height: 400 }}>
                                <ResponsiveContainer>
                                    <BarChart data={Object.entries(filteredData.reduce((acc, job) => {
                                        const status = job.status || 'Uncategorized';
                                        acc[status] = (acc[status] || 0) + 1;
                                        return acc;
                                    }, {})).map(([name, value]) => ({name, value}))}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" height={80}/>
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="value" fill="#8884d8" name="Job Count" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default WorkshopReports;
