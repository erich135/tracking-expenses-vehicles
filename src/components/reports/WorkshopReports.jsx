import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { FileDown, Calendar as CalendarIcon, PanelTop as TableIcon, BarChart as BarChartIcon, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MultiSelect } from '@/components/ui/multi-select.jsx';
import { downloadAsCsv } from '@/lib/exportUtils';
import { jobStatuses } from '@/pages/AddWorkshopJobPage';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    const [sortField, setSortField] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    const tableContainerRef = useRef(null);
    const topScrollRef = useRef(null);

    const handleTopScroll = (e) => {
        if (tableContainerRef.current && tableContainerRef.current.scrollLeft !== e.target.scrollLeft) {
            tableContainerRef.current.scrollLeft = e.target.scrollLeft;
        }
    };

    const handleTableScroll = (e) => {
        if (topScrollRef.current && topScrollRef.current.scrollLeft !== e.target.scrollLeft) {
            topScrollRef.current.scrollLeft = e.target.scrollLeft;
        }
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ChevronsUpDown className="inline ml-1 h-3 w-3 opacity-40" />;
        return sortDirection === 'asc' ? <ChevronUp className="inline ml-1 h-3 w-3" /> : <ChevronDown className="inline ml-1 h-3 w-3" />;
    };

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

    const sortedFilteredData = useMemo(() => {
        if (!sortField) return filteredData;
        return [...filteredData].sort((a, b) => {
            let aVal, bVal;
            if (sortField === 'technician') { aVal = a.technician?.name || ''; bVal = b.technician?.name || ''; }
            else if (sortField === 'customer') { aVal = a.customer?.name || a.cash_customer_name || ''; bVal = b.customer?.name || b.cash_customer_name || ''; }
            else { aVal = a[sortField]; bVal = b[sortField]; }
            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            return sortDirection === 'asc'
                ? String(aVal).localeCompare(String(bVal))
                : String(bVal).localeCompare(String(aVal));
        });
    }, [filteredData, sortField, sortDirection]);

const handleExport = (exportFormat) => {
  console.log("Exporting data:", filteredData); // ✅ Add this line here
  console.log('filteredData:', filteredData);
  console.log('typeof format:', typeof exportFormat);

  const title = 'Workshop Jobs Report';
  const head = [["Job No.", "Technician", "Equipment", "Customer", "PO Date", "Quote Amt.", "Status", "Type", "Model", "Received", "Start Date", "ETA", "Completion", "Lead Time (days)", "Comment / Reason for Hold Up"]];
  const body = filteredData.map(j => {
    const leadTime = j.received_date
      ? differenceInDays(
          j.completion_date ? new Date(j.completion_date) : new Date(),
          new Date(j.received_date)
        )
      : 'N/A';
    return [
      j.job_number,
      j.technician?.name || '',
      j.equipment_detail || '',
      j.customer?.name || j.cash_customer_name || '',
      j.po_date ? format(new Date(j.po_date), 'yyyy-MM-dd') : 'N/A',
      `R ${Number(j.quote_amount || 0).toFixed(2)}`,
      j.status || '',
      j.job_type || '',
      j.model || '',
      j.received_date ? format(new Date(j.received_date), 'yyyy-MM-dd') : 'N/A',
      j.start_date ? format(new Date(j.start_date), 'yyyy-MM-dd') : 'N/A',
      j.eta_date ? format(new Date(j.eta_date), 'yyyy-MM-dd') : 'N/A',
      j.completion_date ? format(new Date(j.completion_date), 'yyyy-MM-dd') : 'N/A',
      String(leadTime),
      j.reason_for_hold_up || '',
    ];
  });

  // 🧾 EXPORT LOGIC GOES HERE:
  if (exportFormat === 'pdf') {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text(title, 14, 16);
    autoTable(doc, {
      head: head,
      body: body,
      startY: 20,
      styles: { fontSize: 7 },
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
                            <>
                            <div
                                ref={topScrollRef}
                                className="w-full overflow-x-auto border border-b-0 rounded-t-md bg-gray-50 dark:bg-gray-900 custom-scrollbar flex-none"
                                onScroll={handleTopScroll}
                            >
                                <div style={{ width: '1700px', height: '1px' }}></div>
                            </div>
                            <Table 
                                containerRef={tableContainerRef}
                                onScroll={handleTableScroll}
                                containerClassName="flex-1 min-h-0 border rounded-b-md [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" 
                                className="min-w-[1700px]"
                            >
                                <TableHeader className="sticky top-0 z-20 bg-white dark:bg-background">
                                    <TableRow>
                                        <TableHead className="table-head-bold cursor-pointer select-none" onClick={() => handleSort('job_number')}>Job No.<SortIcon field="job_number" /></TableHead>
                                        <TableHead className="table-head-bold cursor-pointer select-none" onClick={() => handleSort('technician')}>Technician<SortIcon field="technician" /></TableHead>
                                        <TableHead className="table-head-bold cursor-pointer select-none min-w-[200px]" onClick={() => handleSort('equipment_detail')}>Equipment<SortIcon field="equipment_detail" /></TableHead>
                                        <TableHead className="table-head-bold cursor-pointer select-none" onClick={() => handleSort('customer')}>Customer<SortIcon field="customer" /></TableHead>
                                        <TableHead className="table-head-bold cursor-pointer select-none" onClick={() => handleSort('po_date')}>PO Date<SortIcon field="po_date" /></TableHead>
                                        <TableHead className="table-head-bold cursor-pointer select-none" onClick={() => handleSort('quote_amount')}>Quote Amt.<SortIcon field="quote_amount" /></TableHead>
                                        <TableHead className="table-head-bold cursor-pointer select-none" onClick={() => handleSort('status')}>Status<SortIcon field="status" /></TableHead>
                                        <TableHead className="table-head-bold cursor-pointer select-none" onClick={() => handleSort('job_type')}>Type<SortIcon field="job_type" /></TableHead>
                                        <TableHead className="table-head-bold cursor-pointer select-none" onClick={() => handleSort('model')}>Model<SortIcon field="model" /></TableHead>
                                        <TableHead className="table-head-bold cursor-pointer select-none" onClick={() => handleSort('received_date')}>Received<SortIcon field="received_date" /></TableHead>
                                        <TableHead className="table-head-bold cursor-pointer select-none" onClick={() => handleSort('start_date')}>Start Date<SortIcon field="start_date" /></TableHead>
                                        <TableHead className="table-head-bold cursor-pointer select-none" onClick={() => handleSort('eta_date')}>ETA<SortIcon field="eta_date" /></TableHead>
                                        <TableHead className="table-head-bold cursor-pointer select-none" onClick={() => handleSort('completion_date')}>Completion<SortIcon field="completion_date" /></TableHead>
                                        <TableHead className="table-head-bold">Lead Time</TableHead>
                                        <TableHead className="table-head-bold cursor-pointer select-none min-w-[150px]" onClick={() => handleSort('reason_for_hold_up')}>Hold Up Reason<SortIcon field="reason_for_hold_up" /></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.length > 0 ? sortedFilteredData.map(job => (
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
                                            <TableCell>{job.job_type || 'N/A'}</TableCell>
                                            <TableCell>{job.model || 'N/A'}</TableCell>
                                            <TableCell>{job.received_date ? format(new Date(job.received_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                                            <TableCell>{job.start_date ? format(new Date(job.start_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                                            <TableCell>{job.eta_date ? format(new Date(job.eta_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                                            <TableCell>{job.completion_date ? format(new Date(job.completion_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                                            <TableCell>{
                                                job.received_date
                                                  ? differenceInDays(
                                                      job.completion_date ? new Date(job.completion_date) : new Date(),
                                                      new Date(job.received_date)
                                                    )
                                                  : 'N/A'
                                            }</TableCell>
                                            <TableCell>{job.reason_for_hold_up || 'N/A'}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={15} className="text-center">
                                                No data available for the selected filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            </>
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
