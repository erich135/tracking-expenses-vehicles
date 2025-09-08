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
    const [selectedTechnicians, setSelectedTechnicians] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const [selectedJobNumbers, setSelectedJobNumbers] = useState([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('workshop_jobs')
            .select('*, technician:technicians(name), customer:customers(name)')
            .order('created_at', { ascending: false });

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
    const jobNumberOptions = useMemo(() => [...new Set(allJobs.map(j => j.job_number))].map(jn => ({ value: jn, label: jn })), [allJobs]);

    const filteredData = useMemo(() => {
        return allJobs.filter(job => {
            const isTechnicianSelected = selectedTechnicians.length === 0 || selectedTechnicians.includes(job.technician?.name);
            const isCustomerSelected = selectedCustomers.length === 0 || selectedCustomers.includes(job.customer?.name || job.cash_customer_name);
            const isStatusSelected = selectedStatuses.length === 0 || selectedStatuses.includes(job.status);
            const isJobNumberSelected = selectedJobNumbers.length === 0 || selectedJobNumbers.includes(job.job_number);

            return isTechnicianSelected && isCustomerSelected && isStatusSelected && isJobNumberSelected;
        });
    }, [allJobs, selectedTechnicians, selectedCustomers, selectedStatuses, selectedJobNumbers]);

const handleExport = (exportFormat) => {
  console.log("Exporting data:", filteredData); // ✅ Add this line here
  console.log('filteredData:', filteredData);
  console.log('typeof format:', typeof exportFormat);

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

  // 🧾 EXPORT LOGIC GOES HERE:
  if (exportFormat === 'pdf') {
    const doc = new jsPDF();
    doc.text(title, 14, 16);
    doc.autoTable({
      head: head,
      body: body,
      startY: 20,
    });
    doc.save('workshop-report.pdf');
  } else if (exportFormat === 'csv') {
    const csvContent = [head[0], ...body]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'workshop-report.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                    <MultiSelect
                        options={jobNumberOptions}
                        selected={selectedJobNumbers}
                        onChange={setSelectedJobNumbers}
                        placeholder="Filter by Job No..."
                    />
                    <MultiSelect
                        options={technicianOptions}
                        selected={selectedTechnicians}
                        onChange={setSelectedTechnicians}
                        placeholder="Filter by Technician..."
                    />
                    <MultiSelect
                        options={customerOptions}
                        selected={selectedCustomers}
                        onChange={setSelectedCustomers}
                        placeholder="Filter by Customer..."
                    />
                    <MultiSelect
                        options={statusOptions}
                        selected={selectedStatuses}
                        onChange={setSelectedStatuses}
                        placeholder="Filter by Status..."
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Workshop Report</CardTitle>
                        <CardDescription>View report as a table or chart.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')}>
                            <TableIcon className="h-4 w-4 mr-2" />
                            Table
                        </Button>
                        <Button variant={viewMode === 'chart' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('chart')}>
                            <BarChartIcon className="h-4 w-4 mr-2" />
                            Chart
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                            <FileDown className="h-4 w-4 mr-2" />
                            PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                            <FileDown className="h-4 w-4 mr-2" />
                            CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <p>Loading report...</p> : (
                        viewMode === 'table' ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="table-head-bold">Job No.</TableHead>
                                        <TableHead className="table-head-bold">Technician</TableHead>
                                        <TableHead className="table-head-bold">Equipment</TableHead>
                                        <TableHead className="table-head-bold">Customer</TableHead>
                                        <TableHead className="table-head-bold">PO Date</TableHead>
                                        <TableHead className="table-head-bold">Quote Amt.</TableHead>
                                        <TableHead className="table-head-bold">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.length > 0 ? filteredData.map(job => (
                                        <TableRow key={job.id}>
                                            <TableCell>{job.job_number}</TableCell>
                                            <TableCell>{job.technician?.name}</TableCell>
                                            <TableCell>{job.equipment_detail}</TableCell>
                                            <TableCell>{job.customer?.name || job.cash_customer_name || 'Unknown'}</TableCell>
                                            <TableCell>{job.po_date ? format(new Date(job.po_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                                            <TableCell>R {Number(job.quote_amount || 0).toFixed(2)}</TableCell>
                                            <TableCell>
                                                <span className={`status-label ${job.status?.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-') || 'default'}`}>
                                                    {job.status || 'N/A'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center">
                                                No data available for the selected filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        ) : (
                            <div style={{ width: '100%', height: 400 }}>
                                <ResponsiveContainer>
                                    <BarChart data={Object.entries(filteredData.reduce((acc, job) => {
                                        const status = job.status || 'Uncategorized';
                                        acc[status] = (acc[status] || 0) + 1;
                                        return acc;
                                    }, {})).map(([name, value]) => ({ name, value }))}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" height={80} />
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
