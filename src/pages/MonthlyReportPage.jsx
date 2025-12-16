import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { format } from 'date-fns';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MultiSelect from '@/components/ui/multi-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Printer, Download, ChevronLeft, ChevronRight, FileText, CalendarIcon, TableIcon, BarChartIcon, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { downloadAsCsv, downloadAsPdf } from '@/lib/exportUtils';

const COLORS = ['#4285F4', '#FBBC05', '#34A853', '#EA4335', '#9C27B0', '#03A9F4', '#8BC34A', '#FF7043', '#9575CD', '#4DB6AC', '#FFCA28', '#E91E63', '#795548', '#607D8B'];

const MonthlyReportPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [costingData, setCostingData] = useState([]);
  const [rentalData, setRentalData] = useState([]);
  const [slaData, setSlaData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJobTypes, setSelectedJobTypes] = useState([]);
  const reportRef = useRef(null);

  // Detailed Costing Entries filters state
  const [detailedFromDate, setDetailedFromDate] = useState();
  const [detailedToDate, setDetailedToDate] = useState();
  const [detailedMarginRange, setDetailedMarginRange] = useState([0, 100]);
  const [detailedSelectedReps, setDetailedSelectedReps] = useState([]);
  const [detailedSelectedCustomers, setDetailedSelectedCustomers] = useState([]);
  const [detailedSelectedJobDescriptions, setDetailedSelectedJobDescriptions] = useState([]);
  const [detailedJobNumberFilter, setDetailedJobNumberFilter] = useState("");
  const [detailedSortOption, setDetailedSortOption] = useState("rep_asc");
  const [detailedTableSortColumn, setDetailedTableSortColumn] = useState(null);
  const [detailedTableSortDirection, setDetailedTableSortDirection] = useState("asc");
  const [detailedViewMode, setDetailedViewMode] = useState("table");

  // Job type filter state - computed from data
  const allJobTypes = Array.from(new Set([
    ...costingData.map(e => e.job_description || 'Other'),
    'Rental',
    'SLA',
  ])).filter(Boolean);
  const jobTypeOptions = allJobTypes.map(jt => ({ value: jt, label: jt }));

  // Select all job types by default whenever data changes
  useEffect(() => {
    setSelectedJobTypes(allJobTypes);
  }, [allJobTypes.join(',')]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [2023, 2024, 2025, 2026];


  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    // Format dates without timezone conversion to avoid UTC shift issues
    const year = selectedYear;
    const month = selectedMonth + 1; // Convert 0-indexed to 1-indexed
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate(); // Last day of the month
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    try {
      if (session?.access_token) {
        const res = await fetch('/api/reports-monthly', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ startDate: startStr, endDate: endStr }),
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error || 'Failed to load monthly report');

        setCostingData(Array.isArray(payload.costing) ? payload.costing : []);
        setRentalData(Array.isArray(payload.rental) ? payload.rental : []);
        setSlaData(Array.isArray(payload.sla) ? payload.sla : []);
      } else {
        // Fallback to client-side queries if no session token is present
        const [costingRes, rentalRes, slaRes] = await Promise.all([
          supabase
            .from('costing_entries')
            .select('*')
            .gte('date', startStr)
            .lte('date', endStr)
            .order('date', { ascending: false }),
          supabase
            .from('rental_incomes')
            .select('*')
            .gte('date', startStr)
            .lte('date', endStr)
            .order('date', { ascending: false }),
          supabase
            .from('sla_incomes')
            .select('*')
            .gte('date', startStr)
            .lte('date', endStr)
            .order('date', { ascending: false }),
        ]);

        const costing = costingRes.data;
        const rental = rentalRes.data;
        const sla = slaRes.data;
        const costingError = costingRes.error;
        const rentalError = rentalRes.error;
        const slaError = slaRes.error;

        if (costingError || rentalError || slaError) {
          const errMsg =
            costingError?.message ||
            rentalError?.message ||
            slaError?.message ||
            'Failed to fetch monthly data';
          throw new Error(errMsg);
        }

        setCostingData(costing || []);
        setRentalData(rental || []);
        setSlaData(sla || []);
      }
    } catch (err) {
      console.error('Monthly report fetch error:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to load monthly report',
        description: err.message || 'Please try again.',
      });
      setCostingData([]);
      setRentalData([]);
      setSlaData([]);
    } finally {
      setLoading(false);
    }
  };


  // Merge all data for unified reporting
  const allEntriesRaw = [
    ...costingData.map(e => ({
      ...e,
      source: 'Costing',
      sales: parseFloat(e.total_customer || 0),
      cost: parseFloat(e.total_expenses || 0),
      profit: parseFloat(e.profit || 0),
      job_type: e.job_description || 'Other',
      rep: e.rep || 'Unknown',
    })),
    ...rentalData.map(e => ({
      ...e,
      source: 'Rental',
      sales: parseFloat(e.amount || 0),
      cost: 0,
      profit: parseFloat(e.amount || 0),
      job_type: 'Rental',
      rep: e.rep || 'SLA/Rental',
    })),
    ...slaData.map(e => ({
      ...e,
      source: 'SLA',
      sales: parseFloat(e.amount || 0),
      cost: 0,
      profit: parseFloat(e.amount || 0),
      job_type: 'SLA',
      rep: e.rep || 'SLA/Rental',
    })),
  ];

  // Filter by selected job types
  const allEntries = allEntriesRaw.filter(e => selectedJobTypes.includes(e.job_type));

  // Calculate summaries
  const jobTypeSummary = {};
  allEntries.forEach(entry => {
    const jobType = entry.job_type || 'Other';
    if (!jobTypeSummary[jobType]) {
      jobTypeSummary[jobType] = { sales: 0, cost: 0, profit: 0, count: 0 };
    }
    jobTypeSummary[jobType].sales += entry.sales;
    jobTypeSummary[jobType].cost += entry.cost;
    jobTypeSummary[jobType].profit += entry.profit;
    jobTypeSummary[jobType].count += 1;
  });

  const repSummary = {};
  allEntries.forEach(entry => {
    const rep = entry.rep || 'Unknown';
    if (!repSummary[rep]) {
      repSummary[rep] = { sales: 0, cost: 0, profit: 0, count: 0, jobTypes: {} };
    }
    repSummary[rep].sales += entry.sales;
    repSummary[rep].cost += entry.cost;
    repSummary[rep].profit += entry.profit;
    repSummary[rep].count += 1;
    const jt = entry.job_type || 'Other';
    repSummary[rep].jobTypes[jt] = (repSummary[rep].jobTypes[jt] || 0) + entry.sales;
  });

  const totalSales = Object.values(jobTypeSummary).reduce((sum, v) => sum + v.sales, 0);
  const totalCost = Object.values(jobTypeSummary).reduce((sum, v) => sum + v.cost, 0);
  const totalProfit = Object.values(jobTypeSummary).reduce((sum, v) => sum + v.profit, 0);
  const totalJobs = costingData.length;

  // -------- Detailed Costing Entries Report Logic --------
  // Use the same allEntries data (already filtered by selectedJobTypes) for consistency
  // Map allEntries to include fields needed for detailed view
  const detailedAllEntries = useMemo(() => {
    return allEntries.map(entry => ({
      ...entry,
      // Normalize fields for detailed table display
      job_description: entry.job_type || 'Other',
      total_customer: entry.sales || 0,
      total_expenses: entry.cost || 0,
      profit: entry.profit || 0,
      margin: entry.sales > 0 ? ((entry.profit / entry.sales) * 100) : 0,
      customer: entry.customer || entry.equipment_name || entry.unit_name || '-',
      job_number: entry.job_number || '-',
      invoice_number: entry.invoice_number || '-',
    }));
  }, [allEntries]);

  // Filter dropdown options for detailed entries (from combined data)
  const detailedRepOptions = useMemo(() => {
    const unique = [...new Set(detailedAllEntries.map((e) => e.rep))].filter(Boolean);
    return unique.map((v) => ({ label: v, value: v }));
  }, [detailedAllEntries]);

  const detailedCustomerOptions = useMemo(() => {
    const unique = [...new Set(detailedAllEntries.map((e) => e.customer))].filter(Boolean);
    return unique.map((v) => ({ label: v, value: v }));
  }, [detailedAllEntries]);

  const detailedJobDescriptionOptions = useMemo(() => {
    const unique = [...new Set(detailedAllEntries.map((e) => e.job_description))].filter(Boolean);
    return unique.map((v) => ({ label: v, value: v }));
  }, [detailedAllEntries]);

  // Apply filters to detailed combined data
  const detailedFilteredData = useMemo(() => {
    const result = detailedAllEntries.filter((entry) => {
      // Date filter - only apply if dates are selected
      // Use string comparison for dates to avoid timezone issues
      let inDateRange = true;
      if (detailedFromDate || detailedToDate) {
        const entryDateStr = entry.date ? String(entry.date).split('T')[0] : '';
        const startDateStr = detailedFromDate ? format(detailedFromDate, 'yyyy-MM-dd') : null;
        const endDateStr = detailedToDate ? format(detailedToDate, 'yyyy-MM-dd') : null;
        
        inDateRange =
          (!startDateStr || entryDateStr >= startDateStr) &&
          (!endDateStr || entryDateStr <= endDateStr);
      }

      // Margin filter - allow full range, only filter if slider is not at default
      const entryMargin = parseFloat(entry.margin || 0);
      const inMarginRange =
        (detailedMarginRange[0] === 0 && detailedMarginRange[1] === 100) || // Default = no filter
        (entryMargin >= detailedMarginRange[0] && entryMargin <= detailedMarginRange[1]);

      const jobMatch =
        detailedJobNumberFilter === "" ||
        (entry.job_number && entry.job_number.toLowerCase().includes(detailedJobNumberFilter.toLowerCase()));

      const repMatch = detailedSelectedReps.length === 0 || detailedSelectedReps.includes(entry.rep);
      const customerMatch =
        detailedSelectedCustomers.length === 0 || detailedSelectedCustomers.includes(entry.customer);
      const jobDescMatch =
        detailedSelectedJobDescriptions.length === 0 ||
        detailedSelectedJobDescriptions.includes(entry.job_description);

      return (
        inDateRange &&
        inMarginRange &&
        jobMatch &&
        repMatch &&
        customerMatch &&
        jobDescMatch
      );
    });
    
    return result;
  }, [
    detailedAllEntries,
    detailedFromDate,
    detailedToDate,
    detailedMarginRange,
    detailedJobNumberFilter,
    detailedSelectedReps,
    detailedSelectedCustomers,
    detailedSelectedJobDescriptions,
  ]);

  // Calculate totals for detailed entries
  const detailedTotals = useMemo(() => {
    const totals = detailedFilteredData.reduce(
      (acc, entry) => {
        const s = parseFloat(entry.total_customer || 0);
        const c = parseFloat(entry.total_expenses || 0);
        const p = parseFloat(entry.profit || 0);
        acc.sales += s;
        acc.cost += c;
        acc.profit += p;
        if (s > 0) {
          acc.marginSum += (p / s) * 100;
          acc.marginCount += 1;
        }
        return acc;
      },
      { sales: 0, cost: 0, profit: 0, marginSum: 0, marginCount: 0 }
    );

    return {
      sales: totals.sales,
      cost: totals.cost,
      profit: totals.profit,
      margin: totals.marginCount > 0 ? parseFloat((totals.marginSum / totals.marginCount).toFixed(2)) : 0,
    };
  }, [detailedFilteredData]);

  // Process and sort detailed data
  const detailedProcessedData = useMemo(() => {
    let sortedData = [...detailedFilteredData];
    
    // Apply sort option
    if (detailedSortOption === "rep_asc") sortedData.sort((a, b) => (a.rep || '').localeCompare(b.rep || ''));
    else if (detailedSortOption === "rep_desc") sortedData.sort((a, b) => (b.rep || '').localeCompare(a.rep || ''));
    else if (detailedSortOption === "profit_asc") sortedData.sort((a, b) => parseFloat(a.profit || 0) - parseFloat(b.profit || 0));
    else if (detailedSortOption === "profit_desc") sortedData.sort((a, b) => parseFloat(b.profit || 0) - parseFloat(a.profit || 0));

    if (detailedTableSortColumn) {
      sortedData.sort((a, b) => {
        let aVal = a[detailedTableSortColumn];
        let bVal = b[detailedTableSortColumn];
        
        if (['total_customer', 'total_expenses', 'profit', 'margin'].includes(detailedTableSortColumn)) {
          aVal = parseFloat(aVal) || 0;
          bVal = parseFloat(bVal) || 0;
        }
        
        if (detailedTableSortColumn === 'date') {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }
        
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal || '').toLowerCase();
        }
        
        if (detailedTableSortDirection === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    }

    return sortedData;
  }, [detailedFilteredData, detailedSortOption, detailedTableSortColumn, detailedTableSortDirection]);

  const handleDetailedColumnSort = (columnKey) => {
    if (detailedTableSortColumn === columnKey) {
      setDetailedTableSortDirection(detailedTableSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setDetailedTableSortColumn(columnKey);
      setDetailedTableSortDirection('asc');
    }
  };

  const getDetailedMarginColor = (margin) => {
    if (margin >= 60) return "text-green-600";
    if (margin >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  // Prepare chart data
  const jobTypePieData = Object.entries(jobTypeSummary)
    .map(([name, data]) => ({ name, value: data.sales }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const repPieData = Object.entries(repSummary)
    .map(([name, data]) => ({ name, value: data.sales }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const repBarData = Object.entries(repSummary)
    .map(([name, data]) => ({
      name,
      sales: data.sales,
      profit: data.profit,
      margin: data.sales > 0 ? (data.profit / data.sales) * 100 : 0
    }))
    .sort((a, b) => b.sales - a.sales);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value);
  };

  const formatPercent = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const getMarginColor = (margin) => {
    if (margin < 30) return 'text-red-600';
    if (margin < 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handlePrint = () => {
    window.print();
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-blue-600">{formatCurrency(payload[0].value)}</p>
          <p className="text-gray-500">{((payload[0].value / totalSales) * 100).toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    if (percent < 0.03) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="#333" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10}>
        {`${name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Page components
  const CoverPage = () => (
    <div className="report-page bg-gradient-to-br from-blue-900 to-blue-700 text-white flex flex-col justify-center items-center min-h-[800px] rounded-lg shadow-2xl">
      <div className="text-center space-y-6">
        <div className="text-6xl mb-8">📊</div>
        <h1 className="text-5xl font-bold tracking-tight">Monthly Costing Report</h1>
        <h2 className="text-3xl font-light">{months[selectedMonth]} {selectedYear}</h2>
        <div className="mt-12 pt-12 border-t border-blue-500">
          <p className="text-xl opacity-80">FleetFlow Management System</p>
          <p className="text-sm opacity-60 mt-2">Generated: {format(new Date(), 'dd MMMM yyyy, HH:mm')}</p>
        </div>
        <div className="mt-12 grid grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-4xl font-bold">{totalJobs}</p>
            <p className="text-sm opacity-70">Total Jobs</p>
          </div>
          <div>
            <p className="text-4xl font-bold">{formatCurrency(totalSales).replace('ZAR', 'R')}</p>
            <p className="text-sm opacity-70">Total Sales</p>
          </div>
          <div>
            <p className="text-4xl font-bold">{formatCurrency(totalProfit).replace('ZAR', 'R')}</p>
            <p className="text-sm opacity-70">Total Profit</p>
          </div>
          <div>
            <p className="text-4xl font-bold">{totalSales > 0 ? formatPercent((totalProfit / totalSales) * 100) : '0%'}</p>
            <p className="text-sm opacity-70">Margin</p>
          </div>
        </div>
      </div>
    </div>
  );

  const SummaryByJobTypePage = () => (
    <div className="report-page bg-white min-h-[800px] p-8 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Summary by Job Type</h2>
        <span className="text-sm text-gray-500">{months[selectedMonth]} {selectedYear}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-8">
        <div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th style={{ backgroundColor: '#1e3a5f', color: 'white', fontWeight: 'bold', padding: '12px 16px', textAlign: 'left', border: '1px solid #ccc' }}>Job Type</th>
                <th style={{ backgroundColor: '#1e3a5f', color: 'white', fontWeight: 'bold', padding: '12px 16px', textAlign: 'right', border: '1px solid #ccc' }}>Sales (R)</th>
                <th style={{ backgroundColor: '#1e3a5f', color: 'white', fontWeight: 'bold', padding: '12px 16px', textAlign: 'right', border: '1px solid #ccc' }}>Cost (R)</th>
                <th style={{ backgroundColor: '#1e3a5f', color: 'white', fontWeight: 'bold', padding: '12px 16px', textAlign: 'right', border: '1px solid #ccc' }}>Profit (R)</th>
                <th style={{ backgroundColor: '#1e3a5f', color: 'white', fontWeight: 'bold', padding: '12px 16px', textAlign: 'right', border: '1px solid #ccc' }}>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(jobTypeSummary)
                .sort((a, b) => b[1].sales - a[1].sales)
                .map(([jobType, data], idx) => {
                  const margin = data.sales > 0 ? (data.profit / data.sales) * 100 : 0;
                  return (
                    <tr key={jobType} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="font-medium py-2 px-4 border">{jobType}</td>
                      <td className="text-right py-2 px-4 border">{formatCurrency(data.sales)}</td>
                      <td className="text-right py-2 px-4 border">{formatCurrency(data.cost)}</td>
                      <td className="text-right py-2 px-4 border">{formatCurrency(data.profit)}</td>
                      <td className={cn('text-right font-bold py-2 px-4 border', getMarginColor(margin))}>
                        {formatPercent(margin)}
                      </td>
                    </tr>
                  );
                })}
              <tr className="bg-blue-100 font-bold">
                <td className="py-2 px-4 border">TOTAL</td>
                <td className="text-right py-2 px-4 border">{formatCurrency(totalSales)}</td>
                <td className="text-right py-2 px-4 border">{formatCurrency(totalCost)}</td>
                <td className="text-right py-2 px-4 border">{formatCurrency(totalProfit)}</td>
                <td className={cn('text-right py-2 px-4 border', getMarginColor(totalSales > 0 ? (totalProfit / totalSales) * 100 : 0))}>
                  {totalSales > 0 ? formatPercent((totalProfit / totalSales) * 100) : '0%'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Sales Distribution by Job Type</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={jobTypePieData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={renderCustomizedLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {jobTypePieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const SalesByRepPage = () => (
    <div className="report-page bg-white min-h-[800px] p-8 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Sales by Representative</h2>
        <span className="text-sm text-gray-500">{months[selectedMonth]} {selectedYear}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-8">
        <div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th style={{ backgroundColor: '#1e3a5f', color: 'white', fontWeight: 'bold', padding: '12px 16px', textAlign: 'left', border: '1px solid #ccc' }}>Rep</th>
                <th style={{ backgroundColor: '#1e3a5f', color: 'white', fontWeight: 'bold', padding: '12px 16px', textAlign: 'right', border: '1px solid #ccc' }}>Sales (R)</th>
                <th style={{ backgroundColor: '#1e3a5f', color: 'white', fontWeight: 'bold', padding: '12px 16px', textAlign: 'right', border: '1px solid #ccc' }}>Cost (R)</th>
                <th style={{ backgroundColor: '#1e3a5f', color: 'white', fontWeight: 'bold', padding: '12px 16px', textAlign: 'right', border: '1px solid #ccc' }}>Profit (R)</th>
                <th style={{ backgroundColor: '#1e3a5f', color: 'white', fontWeight: 'bold', padding: '12px 16px', textAlign: 'right', border: '1px solid #ccc' }}>Margin %</th>
                <th style={{ backgroundColor: '#1e3a5f', color: 'white', fontWeight: 'bold', padding: '12px 16px', textAlign: 'right', border: '1px solid #ccc' }}>Jobs</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(repSummary)
                .sort((a, b) => b[1].sales - a[1].sales)
                .map(([rep, data], idx) => {
                  const margin = data.sales > 0 ? (data.profit / data.sales) * 100 : 0;
                  return (
                    <tr key={rep} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="font-medium py-2 px-4 border">{rep}</td>
                      <td className="text-right py-2 px-4 border">{formatCurrency(data.sales)}</td>
                      <td className="text-right py-2 px-4 border">{formatCurrency(data.cost)}</td>
                      <td className="text-right py-2 px-4 border">{formatCurrency(data.profit)}</td>
                      <td className={cn('text-right font-bold py-2 px-4 border', getMarginColor(margin))}>
                        {formatPercent(margin)}
                      </td>
                      <td className="text-right py-2 px-4 border">{data.count}</td>
                    </tr>
                  );
                })}
              <tr className="bg-blue-100 font-bold">
                <td className="py-2 px-4 border">TOTAL</td>
                <td className="text-right py-2 px-4 border">{formatCurrency(totalSales)}</td>
                <td className="text-right py-2 px-4 border">{formatCurrency(totalCost)}</td>
                <td className="text-right py-2 px-4 border">{formatCurrency(totalProfit)}</td>
                <td className={cn('text-right py-2 px-4 border', getMarginColor(totalSales > 0 ? (totalProfit / totalSales) * 100 : 0))}>
                  {totalSales > 0 ? formatPercent((totalProfit / totalSales) * 100) : '0%'}
                </td>
                <td className="text-right py-2 px-4 border">{totalJobs}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Sales Distribution by Rep</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={repPieData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={renderCustomizedLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {repPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const RepPieChartsPage = () => {
    const repsWithData = Object.entries(repSummary).filter(([, data]) => data.sales > 0);
    
    return (
      <div className="report-page bg-white min-h-[800px] p-8 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800">Rep Performance Breakdown</h2>
          <span className="text-sm text-gray-500">{months[selectedMonth]} {selectedYear}</span>
        </div>
        
        <div className="grid grid-cols-3 gap-6">
          {repsWithData.sort((a, b) => b[1].sales - a[1].sales).slice(0, 9).map(([rep, data], idx) => {
            const pieData = Object.entries(data.jobTypes)
              .map(([name, value]) => ({ name, value }))
              .filter(d => d.value > 0)
              .sort((a, b) => b.value - a.value);
            
            const margin = data.sales > 0 ? (data.profit / data.sales) * 100 : 0;
            
            return (
              <Card key={rep} className="shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between items-center">
                    <span>{rep}</span>
                    <span className={cn('text-sm', getMarginColor(margin))}>{formatPercent(margin)}</span>
                  </CardTitle>
                  <p className="text-sm text-gray-500">{formatCurrency(data.sales)}</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-xs space-y-1">
                    {pieData.slice(0, 4).map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        <span className="truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const PerformanceComparisonPage = () => (
    <div className="report-page bg-white min-h-[800px] p-8 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Performance Comparison</h2>
        <span className="text-sm text-gray-500">{months[selectedMonth]} {selectedYear}</span>
      </div>
      
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Sales & Profit by Representative</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={repBarData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={11} />
              <YAxis tickFormatter={(value) => `R${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="sales" name="Sales" fill="#4285F4" />
              <Bar dataKey="profit" name="Profit" fill="#34A853" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-6">
          <Card className="bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg">Top Performer</CardTitle>
            </CardHeader>
            <CardContent>
              {repBarData[0] && (
                <>
                  <p className="text-2xl font-bold text-blue-700">{repBarData[0].name}</p>
                  <p className="text-lg">{formatCurrency(repBarData[0].sales)}</p>
                  <p className={cn('font-semibold', getMarginColor(repBarData[0].margin))}>
                    Margin: {formatPercent(repBarData[0].margin)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg">Highest Margin</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const highestMargin = [...repBarData].sort((a, b) => b.margin - a.margin)[0];
                return highestMargin && (
                  <>
                    <p className="text-2xl font-bold text-green-700">{highestMargin.name}</p>
                    <p className="text-lg">{formatPercent(highestMargin.margin)}</p>
                    <p className="text-gray-600">{formatCurrency(highestMargin.profit)} profit</p>
                  </>
                );
              })()}
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50">
            <CardHeader>
              <CardTitle className="text-lg">Most Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const mostJobs = Object.entries(repSummary).sort((a, b) => b[1].count - a[1].count)[0];
                return mostJobs && (
                  <>
                    <p className="text-2xl font-bold text-purple-700">{mostJobs[0]}</p>
                    <p className="text-lg">{mostJobs[1].count} jobs</p>
                    <p className="text-gray-600">{formatCurrency(mostJobs[1].sales)} total</p>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // Detailed Costing Entries Page Component
  const DetailedCostingEntriesPage = () => {
    const detailedHeaders = [
      { key: "date", label: "Date" },
      { key: "rep", label: "Rep" },
      { key: "customer", label: "Customer" },
      { key: "job_number", label: "Job #" },
      { key: "invoice_number", label: "Invoice #" },
      { key: "job_description", label: "Job Type" },
      { key: "total_customer", label: "Sales (R)" },
      { key: "total_expenses", label: "Cost (R)" },
      { key: "profit", label: "Profit (R)" },
      { key: "margin", label: "Profit %" },
    ];

    return (
      <div className="report-page bg-white min-h-[800px] p-8 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Detailed Costing Entries</h2>
          </div>
          <span className="text-sm text-gray-500">{months[selectedMonth]} {selectedYear}</span>
        </div>

        {/* Filters Section */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <Select value={detailedSortOption} onValueChange={setDetailedSortOption}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rep_asc">Rep Code A-Z</SelectItem>
                <SelectItem value="rep_desc">Rep Code Z-A</SelectItem>
                <SelectItem value="profit_asc">Profit (Lowest First)</SelectItem>
                <SelectItem value="profit_desc">Profit (Highest First)</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Filter by Job Number..."
              value={detailedJobNumberFilter}
              onChange={(e) => setDetailedJobNumberFilter(e.target.value)}
            />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !detailedFromDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {detailedFromDate ? (
                    format(detailedFromDate, "LLL dd, y")
                  ) : (
                    <span>From date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={detailedFromDate}
                  onSelect={setDetailedFromDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !detailedToDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {detailedToDate ? (
                    format(detailedToDate, "LLL dd, y")
                  ) : (
                    <span>To date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={detailedToDate}
                  onSelect={setDetailedToDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <div className="space-y-2 lg:col-span-1">
              <Label>
                Filter by Margin (%): {detailedMarginRange[0]}% - {detailedMarginRange[1]}%
              </Label>
              <Slider
                value={detailedMarginRange}
                onValueChange={setDetailedMarginRange}
                min={0}
                max={100}
                step={1}
              />
            </div>

            <MultiSelect
              options={detailedRepOptions}
              selected={detailedSelectedReps}
              onChange={setDetailedSelectedReps}
              placeholder="Filter by Rep..."
            />
            <MultiSelect
              options={detailedCustomerOptions}
              selected={detailedSelectedCustomers}
              onChange={setDetailedSelectedCustomers}
              placeholder="Filter by Customer..."
            />
            <MultiSelect
              options={detailedJobDescriptionOptions}
              selected={detailedSelectedJobDescriptions}
              onChange={setDetailedSelectedJobDescriptions}
              placeholder="Filter by Job Type..."
            />
          </div>
        </Card>

        {/* Summary Totals */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">Detailed Costing Entries</CardTitle>
                <p className="text-sm text-muted-foreground">Viewing as {detailedViewMode}</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant={detailedViewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDetailedViewMode("table")}
                >
                  <TableIcon className="w-4 h-4 mr-2" />
                  Table
                </Button>
                <Button
                  variant={detailedViewMode === "graph" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDetailedViewMode("graph")}
                >
                  <BarChartIcon className="w-4 h-4 mr-2" />
                  Graph
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (detailedProcessedData.length === 0) {
                      alert("No data available to export to PDF.");
                      return;
                    }
                    const headers = detailedHeaders.map((h) => h.label);
                    const dataRows = detailedProcessedData.map((row) =>
                      detailedHeaders.map((h) => row[h.key])
                    );
                    downloadAsPdf("Detailed Costing Entries", headers, dataRows);
                  }}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (detailedProcessedData.length === 0) {
                      alert("No data available to export to CSV.");
                      return;
                    }
                    const headers = detailedHeaders.map((h) => h.label);
                    const dataRows = detailedProcessedData.map((row) =>
                      detailedHeaders.map((h) => {
                        const value = row[h.key];
                        if (value === null || value === undefined) return '';
                        if (typeof value === 'number') return value.toFixed(2);
                        return String(value);
                      })
                    );
                    downloadAsCsv("Detailed Costing Entries", headers, dataRows);
                  }}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div>
                <Label className="text-muted-foreground text-sm">Sales (R)</Label>
                <div className="text-base font-medium">
                  {new Intl.NumberFormat("en-ZA", {
                    style: "currency",
                    currency: "ZAR",
                  }).format(detailedTotals.sales)}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Cost (R)</Label>
                <div className="text-base font-medium">
                  {new Intl.NumberFormat("en-ZA", {
                    style: "currency",
                    currency: "ZAR",
                  }).format(detailedTotals.cost)}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Profit (R)</Label>
                <div className="text-base font-medium">
                  {new Intl.NumberFormat("en-ZA", {
                    style: "currency",
                    currency: "ZAR",
                  }).format(detailedTotals.profit)}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Profit %</Label>
                <div className={`text-base font-medium ${getDetailedMarginColor(detailedTotals.margin)}`}>
                  {detailedTotals.margin.toFixed(2)}%
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Data Table or Graph */}
        {detailedViewMode === "table" ? (
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {detailedHeaders.map((h) => (
                    <TableHead
                      key={h.key}
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleDetailedColumnSort(h.key)}
                    >
                      <div className="flex items-center gap-1">
                        {h.label}
                        {detailedTableSortColumn === h.key && (
                          <span className="text-xs">
                            {detailedTableSortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedProcessedData.map((row, index) => (
                  <TableRow key={index}>
                    {detailedHeaders.map((h) => (
                      <TableCell
                        key={h.key}
                        className={cn(
                          h.key === "margin" && getDetailedMarginColor(parseFloat(row[h.key]))
                        )}
                      >
                        {["total_customer", "total_expenses", "profit"].includes(h.key)
                          ? new Intl.NumberFormat("en-ZA", {
                              style: "currency",
                              currency: "ZAR",
                            }).format(row[h.key])
                          : h.key === "margin"
                          ? `${parseFloat(row[h.key]).toFixed(2)}%`
                          : row[h.key] === null || row[h.key] === undefined
                          ? "-"
                          : row[h.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.entries(
                    detailedProcessedData.reduce((acc, entry) => {
                      const jobType = entry.job_description || 'Other';
                      if (!acc[jobType]) acc[jobType] = 0;
                      acc[jobType] += parseFloat(entry.total_customer || 0);
                      return acc;
                    }, {})
                  ).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => percent > 0.03 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={true}
                >
                  {Object.keys(
                    detailedProcessedData.reduce((acc, entry) => {
                      const jobType = entry.job_description || 'Other';
                      acc[jobType] = true;
                      return acc;
                    }, {})
                  ).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  const pages = [
    { title: 'Cover', component: <CoverPage /> },
    { title: 'Detailed Entries', component: <DetailedCostingEntriesPage /> },
    { title: 'Summary by Job Type', component: <SummaryByJobTypePage /> },
    { title: 'Sales by Rep', component: <SalesByRepPage /> },
    { title: 'Rep Breakdown', component: <RepPieChartsPage /> },
    { title: 'Performance', component: <PerformanceComparisonPage /> },
  ];

  return (
    <>
      <Helmet>
        <title>Monthly Report - FleetFlow</title>
      </Helmet>
      
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .report-page { 
            page-break-after: always; 
            margin: 0; 
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="container mx-auto p-4">
        {/* Controls - hidden when printing */}
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Monthly Report Generator</h1>
              <p className="text-gray-500">Generate professional reports for management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="min-w-[220px]">
              <MultiSelect
                options={jobTypeOptions}
                selected={selectedJobTypes}
                onChange={setSelectedJobTypes}
                placeholder="Filter job types..."
              />
            </div>
            <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700">
              <Printer className="w-4 h-4 mr-2" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Page Navigation - hidden when printing */}
        <div className="no-print mb-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          {pages.map((page, idx) => (
            <Button
              key={idx}
              variant={currentPage === idx + 1 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentPage(idx + 1)}
            >
              {idx + 1}
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(pages.length, currentPage + 1))}
            disabled={currentPage === pages.length}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <span className="ml-4 text-sm text-gray-500">
            Page {currentPage} of {pages.length}: {pages[currentPage - 1]?.title}
          </span>
        </div>

        {/* Report Content */}
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : costingData.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <p className="text-xl text-gray-500">No data available for {months[selectedMonth]} {selectedYear}</p>
          </div>
        ) : (
          <>
            {/* Single page view for screen */}
            <div className="no-print">
              {pages[currentPage - 1]?.component}
            </div>
            
            {/* All pages for printing */}
            <div className="hidden print-area">
              {pages.map((page, idx) => (
                <div key={idx}>{page.component}</div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default MonthlyReportPage;
