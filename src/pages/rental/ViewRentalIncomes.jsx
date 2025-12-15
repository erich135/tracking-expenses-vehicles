import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const ViewRentalIncomes = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = [2023, 2024, 2025, 2026];

  useEffect(() => {
    const fetchEntries = async () => {
      // Build date range for selected month/year
      const year = selectedYear;
      const month = selectedMonth + 1;
      const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('rental_incomes')
        .select(`
          id,
          invoice_number,
          date,
          amount,
          rep_code,
          account_number,
          notes,
          customers (name),
          rental_equipment (plant_no)
        `)
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: false });

      if (error) {
        toast({ variant: 'destructive', title: 'Error loading entries', description: error.message });
      } else {
        setEntries(data || []);
      }
    };

    fetchEntries();
  }, [toast, selectedMonth, selectedYear]);

  // Calculate total
  const totalAmount = useMemo(() => {
    return entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [entries]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rental income entry?')) return;

    const { error } = await supabase.from('rental_incomes').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Failed to delete entry', description: error.message });
    } else {
      toast({ title: 'Deleted', description: 'Entry was removed.' });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleExportXlsx = () => {
    const exportData = entries.map(entry => ({
      'Date': entry.date?.split('T')[0] || '',
      'Machine': entry.rental_equipment?.plant_no || '',
      'Customer': entry.customers?.name || '',
      'Rep': entry.rep_code || '',
      'Invoice': entry.invoice_number || '',
      'Amount': Number(entry.amount || 0),
      'Notes': entry.notes || ''
    }));

    // Add total row
    exportData.push({
      'Date': '',
      'Machine': '',
      'Customer': '',
      'Rep': '',
      'Invoice': 'TOTAL',
      'Amount': totalAmount,
      'Notes': ''
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rental Incomes');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Date
      { wch: 15 }, // Machine
      { wch: 35 }, // Customer
      { wch: 10 }, // Rep
      { wch: 12 }, // Invoice
      { wch: 15 }, // Amount
      { wch: 30 }, // Notes
    ];

    const filename = `Rental_Incomes_${months[selectedMonth]}_${selectedYear}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast({ title: 'Exported', description: `Downloaded ${filename}` });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>All Rental Income Entries</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportXlsx}>
              <Download className="h-4 w-4 mr-2" />
              Export XLSX
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-right">
          <span className="text-lg font-semibold">
            Total: R {totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-sm text-gray-500 ml-2">({entries.length} entries)</span>
        </div>
        <table className="min-w-full table-auto text-sm border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Machine</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Rep</th>
              <th className="p-2 text-left">Invoice</th>
              <th className="p-2 text-left">Amount</th>
              <th className="p-2 text-left">Notes</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t">
                <td className="p-2">{entry.date?.split('T')[0]}</td>
                <td className="p-2">{entry.rental_equipment?.plant_no}</td>
                <td className="p-2">{entry.customers?.name}</td>
                <td className="p-2">{entry.rep_code}</td>
                <td className="p-2">{entry.invoice_number || ''}</td>
                <td className="p-2">R {Number(entry.amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-2">{entry.notes}</td>
                <td className="p-2 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/rental/income/edit/${entry.id}`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(entry.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}

            {entries.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={8}>
                  No entries found for {months[selectedMonth]} {selectedYear}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default ViewRentalIncomes;
