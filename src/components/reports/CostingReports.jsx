import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { downloadAsPdf, downloadAsCsv } from '@/lib/exportUtils';
import { FileDown, Calendar as CalendarIcon, PanelTop as TableIcon, BarChart as BarChartIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MultiSelect } from '@/components/ui/multi-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const reportTypes = [
    { value: 'detailed_entries', label: 'Detailed Costing Entries' },
    { value: 'sales_by_rep', label: 'Summary: Sales by Rep' },
    { value: 'profit_by_rep', label: 'Summary: Profit by Rep' },
    { value: 'sales_by_customer', label: 'Summary: Sales by Customer' },
    { value: 'profit_by_customer', label: 'Summary: Profit by Customer' },
    { value: 'profit_by_item', label: 'Summary: Profit by Item' },
];

const CostingReports = () => {
  const [allEntries, setAllEntries] = useState([]);
  const [reps, setReps] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [jobDescriptions, setJobDescriptions] = useState([]);
  const [expenseItems, setExpenseItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState('table');
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 90), to: new Date() });
  const [selectedReport, setSelectedReport] = useState('detailed_entries');
  const [selectedReps, setSelectedReps] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedJobDescriptions, setSelectedJobDescriptions] = useState([]);
  const [selectedExpenseItems, setSelectedExpenseItems] = useState([]);
  const [jobNumberFilter, setJobNumberFilter] = useState('');
  const [marginRange, setMarginRange] = useState([0, 100]);

  const repOptions = useMemo(() => reps.map(r => ({ value: r, label: r })), [reps]);
  const customerOptions = useMemo(() => customers.map(c => ({ value: c, label: c })), [customers]);
  const jobDescriptionOptions = useMemo(() => jobDescriptions.map(jd => ({ value: jd, label: jd })), [jobDescriptions]);
  const expenseItemOptions = useMemo(() => expenseItems.map(item => ({ value: item, label: item })), [expenseItems]);


  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('costing_entries').select('*');
    if (error) {
      toast({ variant: 'destructive', title: 'Error fetching data', description: error.message });
      setLoading(false);
      return;
    }
    
    setAllEntries(data);
    const uniqueReps = [...new Set(data.map(item => item.rep).filter(Boolean))];
    const uniqueCustomers = [...new Set(data.map(item => item.customer).filter(Boolean))];
    const uniqueJobDescriptions = [...new Set(data.map(item => item.job_description).filter(Boolean))];
    const allItems = data.flatMap(entry => entry.expense_items?.map(item => item.name) || []);
    const uniqueExpenseItems = [...new Set(allItems.filter(Boolean))];

    setReps(uniqueReps);
    setCustomers(uniqueCustomers);
    setJobDescriptions(uniqueJobDescriptions);
    setExpenseItems(uniqueExpenseItems);
    
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    return allEntries.filter(entry => {
      const entryDate = new Date(entry.created_at);
      const inDateRange = (!dateRange.from || entryDate >= dateRange.from) && (!dateRange.to || entryDate <= dateRange.to);
      const isRepSelected = selectedReps.length === 0 || selectedReps.includes(entry.rep);
      const isCustomerSelected = selectedCustomers.length === 0 || selectedCustomers.includes(entry.customer);
      const isJobDescriptionSelected = selectedJobDescriptions.length === 0 || selectedJobDescriptions.includes(entry.job_description);
      const hasSelectedExpenseItem = selectedExpenseItems.length === 0 || entry.expense_items?.some(item => selectedExpenseItems.includes(item.name));
      const matchesJobNumber = jobNumberFilter === '' || (entry.job_number && entry.job_number.toLowerCase().includes(jobNumberFilter.toLowerCase()));
      const inMarginRange = entry.margin >= marginRange[0] && entry.margin <= marginRange[1];

      return inDateRange && isRepSelected && isCustomerSelected && isJobDescriptionSelected && matchesJobNumber && inMarginRange && hasSelectedExpenseItem;
    });
  }, [allEntries, dateRange, selectedReps, selectedCustomers, selectedJobDescriptions, jobNumberFilter, marginRange, selectedExpenseItems]);

  const processedData = useMemo(() => {
    let data = [];
    let headers = [];
    let graphDataKey = 'value';
    let graphNameKey = 'group';

    const getSummary = (key, valueKey, dataSrc) => {
        const summary = {};
        dataSrc.forEach(entry => {
            const groupKey = entry[key] || `Unknown ${key}`;
            summary[groupKey] = (summary[groupKey] || 0) + Number(entry[valueKey] || 0);
        });
        return Object.entries(summary).map(([group, value]) => ({ group, value: parseFloat(value.toFixed(2)) }));
    };

    switch (selectedReport) {
        case 'sales_by_rep':
            data = getSummary('rep', 'total_customer', filteredData);
            headers = [{ key: 'group', label: 'Rep' }, { key: 'value', label: 'Total Sales (R)' }];
            break;
        case 'profit_by_rep':
            data = getSummary('rep', 'profit', filteredData);
            headers = [{ key: 'group', label: 'Rep' }, { key: 'value', label: 'Total Profit (R)' }];
            break;
        case 'sales_by_customer':
            data = getSummary('customer', 'total_customer', filteredData);
            headers = [{ key: 'group', label: 'Customer' }, { key: 'value', label: 'Total Sales (R)' }];
            break;
        case 'profit_by_customer':
             data = getSummary('customer', 'profit', filteredData);
            headers = [{ key: 'group', label: 'Customer' }, { key: 'value', label: 'Total Profit (R)' }];
            break;
        case 'profit_by_item': {
            const profitByItem = {};
            filteredData.forEach(entry => {
                (entry.expense_items || []).forEach(item => {
                    const itemName = item.name || 'Unknown Item';
                    const itemProfit = (Number(item.customer_price) || 0) - (Number(item.price) || 0);
                    profitByItem[itemName] = (profitByItem[itemName] || 0) + itemProfit * (Number(item.quantity) || 1);
                });
            });
            data = Object.entries(profitByItem).map(([item, profit]) => ({ item, profit: parseFloat(profit.toFixed(2)) }));
            headers = [{ key: 'item', label: 'Item' }, { key: 'profit', label: 'Total Profit (R)' }];
            graphDataKey = 'profit';
            graphNameKey = 'item';
            break;
        }
        case 'detailed_entries':
        default:
            data = filteredData.map(e => ({
                date: format(new Date(e.created_at), 'yyyy-MM-dd'),
                job_number: e.job_number,
                customer: e.customer,
                rep: e.rep,
                total_customer: Number(e.total_customer).toFixed(2),
                total_expenses: Number(e.total_expenses).toFixed(2),
                profit: Number(e.profit).toFixed(2),
                margin: `${Number(e.margin).toFixed(2)}%`,
            }));
            headers = [
                { key: 'date', label: 'Date' },
                { key: 'job_number', label: 'Job No.' },
                { key: 'customer', label: 'Customer' },
                { key: 'rep', label: 'Rep' },
                { key: 'total_customer', label: 'Sales (R)' },
                { key: 'total_expenses', label: 'Expenses (R)' },
                { key: 'profit', label: 'Profit (R)' },
                { key: 'margin', label: 'Margin' },
            ];
            break;
    }
    return { data, headers, graphDataKey, graphNameKey };
  }, [selectedReport, filteredData]);
  
  useEffect(() => {
    if (selectedReport === 'detailed_entries' && viewMode === 'graph') {
      setViewMode('table');
      toast({
        description: "Graph view is not available for Detailed Entries report. Switched to table view.",
      })
    }
  }, [selectedReport, viewMode, toast]);


  const handleExport = (format) => {
    const title = reportTypes.find(r => r.value === selectedReport)?.label || 'Costing Report';
    let exportData = processedData.data;
    let exportHeaders = processedData.headers;
    
    if (selectedReport.includes('summary') || selectedReport.includes('profit_by_item')) {
        exportData = processedData.data.map(d => {
            const row = {};
            exportHeaders.forEach(h => {
                row[h.label] = d[h.key];
            });
            return row;
        });
    }

    if (format === 'pdf') {
      downloadAsPdf(title, processedData.headers, processedData.data.map(item => processedData.headers.map(h => item[h.key])));
    } else if (format === 'csv') {
      downloadAsCsv(`${title}.csv`, exportData);
    }
  };
  
  const renderContent = () => {
    if (loading) return <p>Loading report...</p>;

    if (viewMode === 'graph' && selectedReport !== 'detailed_entries') {
      return (
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <BarChart data={processedData.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={processedData.graphNameKey} interval={0} angle={-30} textAnchor="end" height={80}/>
              <YAxis />
              <Tooltip formatter={(value) => `R ${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey={processedData.graphDataKey} fill="#8884d8" name={processedData.headers[1]?.label || 'Value'} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {processedData.headers.map(header => <TableHead key={header.key}>{header.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedData.data.length > 0 ? (
              processedData.data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {processedData.headers.map(header => <TableCell key={header.key}>{row[header.key]}</TableCell>)}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={processedData.headers.length} className="text-center">No data available for the selected filters.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Options & Filters</CardTitle>
          <CardDescription>Use the filters below to refine your report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger><SelectValue placeholder="Select a report type" /></SelectTrigger>
                <SelectContent>
                  {reportTypes.map(report => (
                    <SelectItem key={report.value} value={report.value}>{report.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Filter by Job Number..." value={jobNumberFilter} onChange={e => setJobNumberFilter(e.target.value)} />
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</> : format(dateRange.from, "LLL dd, y")) : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
               <div className="space-y-2 lg:col-span-1">
                <Label htmlFor="margin-range">Filter by Margin (%): {marginRange[0]}% - {marginRange[1]}%</Label>
                <Slider id="margin-range" value={marginRange} onValueChange={setMarginRange} min={0} max={100} step={1} />
            </div>
              <MultiSelect options={repOptions} selected={selectedReps} onChange={setSelectedReps} placeholder="Filter by Rep..." />
              <MultiSelect options={customerOptions} selected={selectedCustomers} onChange={setSelectedCustomers} placeholder="Filter by Customer..." />
              <MultiSelect options={jobDescriptionOptions} selected={selectedJobDescriptions} onChange={setSelectedJobDescriptions} placeholder="Filter by Job Type..." />
              <MultiSelect options={expenseItemOptions} selected={selectedExpenseItems} onChange={setSelectedExpenseItems} placeholder="Filter by Expense Item..." />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{reportTypes.find(r => r.value === selectedReport)?.label}</CardTitle>
              <CardDescription>Viewing as {viewMode}</CardDescription>
            </div>
          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'table' ? 'secondary' : 'outline'} size="sm" onClick={() => setViewMode('table')}><TableIcon className="h-4 w-4 mr-2" />Table</Button>
            <Button variant={viewMode === 'graph' ? 'secondary' : 'outline'} size="sm" onClick={() => setViewMode('graph')} disabled={selectedReport === 'detailed_entries'}><BarChartIcon className="h-4 w-4 mr-2" />Graph</Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}><FileDown className="h-4 w-4 mr-2" />CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default CostingReports;