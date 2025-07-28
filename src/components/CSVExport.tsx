import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useVehicleContext } from '@/contexts/VehicleContext';

const CSVExport: React.FC = () => {
  const { expenses, vehicles, suppliers } = useVehicleContext();

  const exportCSV = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyExpenses = expenses.filter(expense => 
      expense.date.startsWith(currentMonth)
    );

    const csvData = monthlyExpenses.map(expense => {
      const vehicle = vehicles.find(v => v.id === expense.vehicleId);
      const supplier = suppliers.find(s => s.id === expense.supplierId);
      
      return {
        Date: expense.date,
        Vehicle: vehicle?.registrationNumber || 'Unknown',
        Category: expense.category,
        Supplier: supplier?.name || 'Unknown',
        'Previous Odometer': expense.previousOdometer,
        'Current Odometer': expense.currentOdometer,
        'Distance': expense.currentOdometer - expense.previousOdometer,
        'Quantity (L)': expense.quantity || '',
        'Price (R)': expense.price
      };
    });

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vehicle-expenses-${currentMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={exportCSV} className="mb-4">
      <Download className="mr-2 h-4 w-4" />
      Export Current Month CSV
    </Button>
  );
};

export default CSVExport;