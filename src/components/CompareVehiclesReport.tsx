import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVehicleContext } from '@/contexts/VehicleContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const CompareVehiclesReport: React.FC = () => {
  const { expenses, vehicles } = useVehicleContext();
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showReport, setShowReport] = useState(false);

  const generateReport = () => {
    if (selectedVehicles.length === 0 || !startDate || !endDate) {
      alert('Please select vehicles and date range');
      return;
    }
    setShowReport(true);
  };

  const clearForm = () => {
    setSelectedVehicles([]);
    setStartDate('');
    setEndDate('');
    setShowReport(false);
  };

  const toggleVehicleSelection = (vehicleId: string) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  // Calculate metrics for each selected vehicle
  const vehicleMetrics = selectedVehicles.map(vehicleId => {
    const vehicle = vehicles?.find(v => v.id === vehicleId);
    
    const filteredExpenses = expenses?.filter(expense => {
      const expenseDate = new Date(expense.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Match by vehicle_id OR by registration number (for imported data)
      const vehicleMatch = expense.vehicle_id === vehicleId || 
        (expense.registration_number && vehicle && 
          (vehicle.registration_number === expense.registration_number || vehicle.name === expense.registration_number)
        );
      
      return expenseDate >= start && expenseDate <= end && vehicleMatch;
    }) || [];

    const totalCost = filteredExpenses.reduce((sum, expense) => {
      const amount = parseFloat(expense.amount?.toString() || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    // Fix fuel category matching - use case-insensitive comparison
    const fuelExpenses = filteredExpenses.filter(e => 
      e.category && e.category.toLowerCase() === 'fuel'
    );
    
    const totalFuelCost = fuelExpenses.reduce((sum, expense) => {
      const amount = parseFloat(expense.amount?.toString() || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const totalLitres = fuelExpenses.reduce((sum, expense) => {
      const litres = parseFloat(expense.litres?.toString() || '0');
      return sum + (isNaN(litres) ? 0 : litres);
    }, 0);
    
    const expensesWithOdometer = filteredExpenses.filter(e => {
      const odometer = parseFloat(e.odometer?.toString() || '0');
      return !isNaN(odometer) && odometer > 0;
    });
    
    const sortedOdometerExpenses = expensesWithOdometer.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    let distanceTraveled = 0;
    if (sortedOdometerExpenses.length >= 2) {
      const firstReading = parseFloat(sortedOdometerExpenses[0].odometer?.toString() || '0');
      const lastReading = parseFloat(sortedOdometerExpenses[sortedOdometerExpenses.length - 1].odometer?.toString() || '0');
      if (!isNaN(firstReading) && !isNaN(lastReading)) {
        distanceTraveled = lastReading - firstReading;
      }
    }

    const fuelEfficiency = totalLitres > 0 && distanceTraveled > 0 ? distanceTraveled / totalLitres : 0;
    const costPerKm = distanceTraveled > 0 ? totalCost / distanceTraveled : 0;

    return {
      vehicle,
      totalCost,
      totalFuelCost,
      totalLitres,
      distanceTraveled,
      fuelEfficiency,
      costPerKm,
      expenseCount: filteredExpenses.length
    };
  });

  const exportToCSV = () => {
    const headers = ['Vehicle', 'Registration', 'Total Cost', 'Fuel Cost', 'Litres', 'Distance (km)', 'Efficiency (km/l)', 'Cost/km'];
    const csvData = vehicleMetrics.map(metric => [
      metric.vehicle?.name || 'N/A',
      metric.vehicle?.registration_number || 'N/A',
      metric.totalCost.toFixed(2),
      metric.totalFuelCost.toFixed(2),
      metric.totalLitres.toFixed(2),
      metric.distanceTraveled.toFixed(0),
      metric.fuelEfficiency.toFixed(2),
      metric.costPerKm.toFixed(2)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `compare_vehicles_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compare Vehicles Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Vehicles</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded p-2">
              {vehicles?.map(vehicle => (
                <label key={vehicle.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedVehicles.includes(vehicle.id)}
                    onChange={() => toggleVehicleSelection(vehicle.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{vehicle.name} - {vehicle.registration_number}</span>
                </label>
              ))}
            </div>
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
                Vehicle Comparison Report
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
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Fuel Cost</TableHead>
                  <TableHead>Litres</TableHead>
                  <TableHead>Distance (km)</TableHead>
                  <TableHead>Efficiency (km/l)</TableHead>
                  <TableHead>Cost/km</TableHead>
                  <TableHead>Expenses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleMetrics.map((metric, index) => (
                  <TableRow key={index}>
                    <TableCell>{metric.vehicle?.name || 'N/A'}</TableCell>
                    <TableCell>{metric.vehicle?.registration_number || 'N/A'}</TableCell>
                    <TableCell>R{metric.totalCost.toFixed(2)}</TableCell>
                    <TableCell>R{metric.totalFuelCost.toFixed(2)}</TableCell>
                    <TableCell>{metric.totalLitres.toFixed(2)}L</TableCell>
                    <TableCell>{metric.distanceTraveled.toFixed(0)}</TableCell>
                    <TableCell>{metric.fuelEfficiency.toFixed(2)}</TableCell>
                    <TableCell>R{metric.costPerKm.toFixed(2)}</TableCell>
                    <TableCell>{metric.expenseCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CompareVehiclesReport;