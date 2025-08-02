// src/pages/CostingReports.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { CSVLink } from 'react-csv';

type Entry = {
  id: number;
  jobNumber: string;
  invoiceNumber: string;
  jobDescription: string;
  customer: string;
  rep: string;
  profit: number;
  margin: number;
  created_at: string;
};

export default function CostingReports() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filtered, setFiltered] = useState<Entry[]>([]);

  const [repFilter, setRepFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [jobNumberFilter, setJobNumberFilter] = useState('');
  const [marginFilter, setMarginFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('costing_entries_view').select('*');
      if (error) {
        console.error(error);
      } else {
        setEntries(data);
        setFiltered(data);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let temp = [...entries];

    if (repFilter) temp = temp.filter((e) => e.rep === repFilter);
    if (customerFilter) temp = temp.filter((e) => e.customer === customerFilter);
    if (jobFilter) temp = temp.filter((e) => e.jobDescription === jobFilter);
    if (jobNumberFilter) temp = temp.filter((e) => e.jobNumber.includes(jobNumberFilter));
    if (dateFilter) temp = temp.filter((e) => e.created_at.startsWith(dateFilter));
    if (marginFilter) {
      temp = temp.filter((e) => {
        if (marginFilter === 'high') return e.margin >= 40;
        if (marginFilter === 'medium') return e.margin >= 31 && e.margin < 40;
        return e.margin < 31;
      });
    }

    setFiltered(temp);
  }, [repFilter, customerFilter, jobFilter, jobNumberFilter, marginFilter, dateFilter, entries]);

  const printPage = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printableHtml = `
      <html>
        <head>
          <title>Costing Report</title>
          <style>
            body { font-family: sans-serif; padding: 2rem; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            .low { background: #fecaca; }
            .medium { background: #fde68a; }
            .high { background: #bbf7d0; }
          </style>
        </head>
        <body>
          <h2>Costing Report</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Job Number</th>
                <th>Invoice</th>
                <th>Description</th>
                <th>Customer</th>
                <th>Rep</th>
                <th>Profit</th>
                <th>Margin (%)</th>
              </tr>
            </thead>
            <tbody>
              ${filtered
                .map(
                  (e) => `
                  <tr class="${
                    e.margin >= 40 ? 'high' : e.margin >= 31 ? 'medium' : 'low'
                  }">
                    <td>${format(new Date(e.created_at), 'yyyy-MM-dd')}</td>
                    <td>${e.jobNumber}</td>
                    <td>${e.invoiceNumber}</td>
                    <td>${e.jobDescription}</td>
                    <td>${e.customer}</td>
                    <td>${e.rep}</td>
                    <td>R${e.profit.toFixed(2)}</td>
                    <td>${e.margin.toFixed(1)}%</td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printableHtml);
    printWindow.document.close();
    printWindow.print();
  };

  const totalProfit = filtered.reduce((sum, e) => sum + e.profit, 0);
  const avgMargin = filtered.length ? filtered.reduce((sum, e) => sum + e.margin, 0) / filtered.length : 0;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Costing Reports</h2>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Input placeholder="Filter by Job Number" value={jobNumberFilter} onChange={(e) => setJobNumberFilter(e.target.value)} />
        <Input placeholder="Filter by Date (YYYY-MM-DD)" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        <Input placeholder="Filter by Rep" value={repFilter} onChange={(e) => setRepFilter(e.target.value)} />
        <Input placeholder="Filter by Customer" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} />
        <Input placeholder="Filter by Job Type" value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} />
        <Select onValueChange={setMarginFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Margin Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">Above 40%</SelectItem>
            <SelectItem value="medium">31–39%</SelectItem>
            <SelectItem value="low">Below 30%</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="text-sm bg-gray-100 p-4 rounded-md flex justify-between items-center">
        <span><strong>Total Profit:</strong> R{totalProfit.toFixed(2)}</span>
        <span><strong>Average Margin:</strong> {avgMargin.toFixed(1)}%</span>
        <span><strong>Entries:</strong> {filtered.length}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={printPage}>Print</Button>
        <CSVLink data={filtered} filename={`costing-report-${Date.now()}.csv`}>
          <Button variant="outline">Export CSV</Button>
        </CSVLink>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm border border-gray-300 mt-4">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Date</th>
                <th className="border p-2">Job No</th>
                <th className="border p-2">Invoice</th>
                <th className="border p-2">Description</th>
                <th className="border p-2">Customer</th>
                <th className="border p-2">Rep</th>
                <th className="border p-2">Profit</th>
                <th className="border p-2">Margin (%)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className={
                  e.margin >= 40 ? 'bg-green-100' :
                  e.margin >= 31 ? 'bg-yellow-100' : 'bg-red-100'
                }>
                  <td className="border p-2">{format(new Date(e.created_at), 'yyyy-MM-dd')}</td>
                  <td className="border p-2">{e.jobNumber}</td>
                  <td className="border p-2">{e.invoiceNumber}</td>
                  <td className="border p-2">{e.jobDescription}</td>
                  <td className="border p-2">{e.customer}</td>
                  <td className="border p-2">{e.rep}</td>
                  <td className="border p-2">R{e.profit.toFixed(2)}</td>
                  <td className="border p-2">{e.margin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
