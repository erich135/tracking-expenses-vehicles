import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVehicleContext } from '@/contexts/VehicleContext';
import { Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const SingleVehicleReport: React.FC = () => {
  const { expenses, vehicles } = useVehicleContext();
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showReport, setShowReport] = useState(false);

  const generateReport = () => {
    if (!selectedVehicle || !startDate || !endDate) {
      alert('Please select vehicle and date range');
      return;
    }
    setShowReport(true);
  };

  const clearForm = () => {
    setSelectedVehicle('');
    setStartDate('');
    setEndDate('');
    setShowReport(false);
  };

  const filteredExpenses = expenses?.filter(expense => {
    if (!selectedVehicle || !startDate || !endDate) return false;
    const expenseDate = new Date(expense.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const vehicleMatch = expense.vehicle_id === selectedVehicle || 
      (expense.registration_number && vehicles?.find(v => 
        v.id === selectedVehicle && 
        (v.registration_number === expense.registration_number || v.name === expense.registration_number)
      ));
    
    return expenseDate >= start && expenseDate <= end && vehicleMatch;
  }) || [];

  const selectedVehicleData = vehicles?.find(v => v.id === selectedVehicle);

  const totalCost = filteredExpenses.reduce((sum, expense) => {
    const amount = parseFloat(expense.amount?.toString() || '0');
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  
  const fuelExpenses = filteredExpenses.filter(e => 
    e.category && e.category.toLowerCase() === 'fuel'
  );
  
  const nonFuelExpenses = filteredExpenses.filter(e => 
    !e.category || e.category.toLowerCase() !== 'fuel'
  );
  
  const totalFuelCost = fuelExpenses.reduce((sum, expense) => {
    const amount = parseFloat(expense.amount?.toString() || '0');
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  
  const totalNonFuelCost = nonFuelExpenses.reduce((sum, expense) => {
    const amount = parseFloat(expense.amount?.toString() || '0');
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  
  const totalLitres = fuelExpenses.reduce((sum, expense) => {
    const litres = parseFloat(expense.litres?.toString() || '0');
    return sum + (isNaN(litres) ? 0 : litres);
  }, 0);
  
  const avgCostPerLitre = totalLitres > 0 ? totalFuelCost / totalLitres : 0;
  
  const expensesWithOdometer = filteredExpenses.filter(e => {
    const odometer = parseFloat(e.odometer?.toString() || '0');
    return !isNaN(odometer) && odometer > 0;
  });
  
  const sortedOdometerExpenses = expensesWithOdometer.sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Single Vehicle Report</CardTitle>
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
                    {vehicle.name} - {vehicle.registration_number}
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
                Single Vehicle Report for {selectedVehicleData?.name} ({selectedVehicleData?.registration_number})
                <br />
                <span className="text-sm font-normal">Period: {formatDate(startDate)} to {formatDate(endDate)}</span>
              </CardTitle>
              <Button className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800">Total Cost</h3>
                <p className="text-2xl font-bold text-blue-900">R{totalCost.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <h3 className="font-semibold text-orange-800">Distance Traveled</h3>
                <p className="text-2xl font-bold text-orange-900">{distanceTraveled.toFixed(0)} km</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800">Cost per km</h3>
                <p className="text-2xl font-bold text-gray-900">R{costPerKm.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800">Total Fuel Cost</h3>
                <p className="text-2xl font-bold text-green-900">R{totalFuelCost.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <h3 className="font-semibold text-red-800">Fuel Efficiency</h3>
                <p className="text-2xl font-bold text-red-900">{fuelEfficiency.toFixed(2)} km/l</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-semibold text-yellow-800">Avg Cost per Litre</h3>
                <p className="text-2xl font-bold text-yellow-900">R{avgCostPerLitre.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-purple-800">Total Litres</h3>
                <p className="text-2xl font-bold text-purple-900">{totalLitres.toFixed(2)}L</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <h3 className="font-semibold text-indigo-800">Non-Fuel Expenses</h3>
                <p className="text-2xl font-bold text-indigo-900">R{totalNonFuelCost.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-pink-50 rounded-lg">
                <h3 className="font-semibold text-pink-800">Fuel vs Non-Fuel</h3>
                <p className="text-lg font-bold text-pink-900">{totalCost > 0 ? ((totalFuelCost / totalCost) * 100).toFixed(0) : 0}% / {totalCost > 0 ? ((totalNonFuelCost / totalCost) * 100).toFixed(0) : 0}%</p>
              </div>
            </div>
            
            <div className="mt-6 text-sm text-gray-600">
              <p>Total Expenses: {filteredExpenses.length}</p>
              <p>Fuel Transactions: {fuelExpenses.length}</p>
              <p>Non-Fuel Transactions: {nonFuelExpenses.length}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SingleVehicleReport;