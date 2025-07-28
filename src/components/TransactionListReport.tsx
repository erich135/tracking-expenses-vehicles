import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVehicleContext } from '@/contexts/VehicleContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const TransactionListReport: React.FC = () => {
  const { expenses, vehicles } = useVehicleContext();
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [showReport, setShowReport] = useState(false);

  const generateReport = () => {
    if (!selectedVehicle || !startDate || !endDate) {
      alert('Please select vehicle and date range');
      return;
    }

    const filteredExpenses = expenses?.filter(expense => {
      const expenseDate = new Date(expense.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return expenseDate >= start && expenseDate <= end && expense.vehicle_id === selectedVehicle;
    }) || [];

    const sortedExpenses = filteredExpenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setReportData(sortedExpenses);
    setShowReport(true);
  };

  const exportToCSV = () => {
    if (reportData.length === 0) return;
    
    const headers = ['Date', 'Supplier', 'Type of Expense', 'Description', 'Amount'];
    const csvData = reportData.map(expense => [
      formatDate(expense.date),
      expense.supplier || 'N/A',
      expense.category,
      expense.description || 'N/A',
      expense.amount.toFixed(2)
    ]);
    
    const totalAmount = reportData.reduce((sum, expense) => sum + expense.amount, 0);
    csvData.push(['', '', '', 'Total', totalAmount.toFixed(2)]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transaction_list_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearForm = () => {
    setSelectedVehicle('');
    setStartDate('');
    setEndDate('');
    setShowReport(false);
    setReportData([]);
  };

  const selectedVehicleData = vehicles?.find(v => v.id === selectedVehicle);
  const totalAmount = reportData.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Transaction List Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Vehicle</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles?.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} - {vehicle.registrationNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Begin Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={generateReport}>Generate Report</Button>
            <Button variant="outline" onClick={clearForm}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      {showReport && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Transaction List for {selectedVehicleData?.name} ({selectedVehicleData?.registrationNumber})
                <br />
                <span className="text-sm font-normal">Period: {formatDate(startDate)} to {formatDate(endDate)}</span>
              </CardTitle>
              <Button onClick={exportToCSV} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Type of Expense</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((expense, index) => (
                  <TableRow key={index}>
                    <TableCell>{formatDate(expense.date)}</TableCell>
                    <TableCell>{expense.supplier || 'N/A'}</TableCell>
                    <TableCell className="capitalize">{expense.category}</TableCell>
                    <TableCell>{expense.description || 'N/A'}</TableCell>
                    <TableCell>R{expense.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-gray-50">
                  <TableCell colSpan={4}>Total</TableCell>
                  <TableCell>R{totalAmount.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TransactionListReport;