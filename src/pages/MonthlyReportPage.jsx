import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { format } from 'date-fns';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, Download, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#4285F4', '#FBBC05', '#34A853', '#EA4335', '#9C27B0', '#03A9F4', '#8BC34A', '#FF7043', '#9575CD', '#4DB6AC', '#FFCA28', '#E91E63', '#795548', '#607D8B'];

const MonthlyReportPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [costingData, setCostingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const reportRef = useRef(null);

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
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0);

    const { data, error } = await supabase
      .from('costing_entries')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (!error && data) {
      setCostingData(data);
    }
    setLoading(false);
  };

  // Calculate summaries
  const jobTypeSummary = {};
  costingData.forEach(entry => {
    const jobType = entry.job_description || 'Other';
    if (!jobTypeSummary[jobType]) {
      jobTypeSummary[jobType] = { sales: 0, cost: 0, profit: 0, count: 0 };
    }
    jobTypeSummary[jobType].sales += parseFloat(entry.total_customer || 0);
    jobTypeSummary[jobType].cost += parseFloat(entry.total_cost || 0);
    jobTypeSummary[jobType].profit += parseFloat(entry.profit || 0);
    jobTypeSummary[jobType].count += 1;
  });

  const repSummary = {};
  costingData.forEach(entry => {
    const rep = entry.rep || 'Unknown';
    if (!repSummary[rep]) {
      repSummary[rep] = { sales: 0, cost: 0, profit: 0, count: 0, jobTypes: {} };
    }
    repSummary[rep].sales += parseFloat(entry.total_customer || 0);
    repSummary[rep].cost += parseFloat(entry.total_cost || 0);
    repSummary[rep].profit += parseFloat(entry.profit || 0);
    repSummary[rep].count += 1;
    
    const jt = entry.job_description || 'Other';
    repSummary[rep].jobTypes[jt] = (repSummary[rep].jobTypes[jt] || 0) + parseFloat(entry.total_customer || 0);
  });

  const totalSales = Object.values(jobTypeSummary).reduce((sum, v) => sum + v.sales, 0);
  const totalCost = Object.values(jobTypeSummary).reduce((sum, v) => sum + v.cost, 0);
  const totalProfit = Object.values(jobTypeSummary).reduce((sum, v) => sum + v.profit, 0);
  const totalJobs = costingData.length;

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

  const pages = [
    { title: 'Cover', component: <CoverPage /> },
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
