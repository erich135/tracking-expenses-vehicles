import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVehicleContext } from '@/contexts/VehicleContext';
import { useToast } from '@/hooks/use-toast';
import { formatDate, toInputDate } from '@/lib/utils';

const AddExpenseForm: React.FC = () => {
  const { vehicles, addExpense } = useVehicleContext();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    vehicle_id: '',
    category: '',
    supplier: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    litres: '',
    odometer: ''
  });

  const selectedVehicle = vehicles.find(v => v.id === formData.vehicle_id);
  const lastOdometer = selectedVehicle?.odometer || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vehicle_id || !formData.category || !formData.amount) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    try {
      await addExpense({
        vehicle_id: formData.vehicle_id,
        category: formData.category,
        supplier: formData.supplier,
        amount: parseFloat(formData.amount),
        date: formData.date,
        description: formData.description,
        litres: formData.litres ? parseFloat(formData.litres) : undefined,
        odometer: formData.odometer ? parseFloat(formData.odometer) : undefined
      });
      clearForm();
    } catch (error) {
      // Error handled in context
    }
  };

  const clearForm = () => {
    setFormData({
      vehicle_id: '',
      category: '',
      supplier: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      litres: '',
      odometer: ''
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Add Expense</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="vehicle">Vehicle *</Label>
          <Select value={formData.vehicle_id} onValueChange={(value) => setFormData({...formData, vehicle_id: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedVehicle && (
            <p className="text-sm text-gray-600 mt-1">Last odometer: {lastOdometer} km</p>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fuel">Fuel</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="repairs">Repairs</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({...formData, supplier: e.target.value})}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
            />
            <div className="text-xs text-muted-foreground mt-1">
              Format: {formatDate(new Date(formData.date || new Date()))}
            </div>
          </div>
        </div>
        
        {formData.category === 'fuel' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="litres">Litres</Label>
              <Input
                id="litres"
                type="number"
                step="0.01"
                value={formData.litres}
                onChange={(e) => setFormData({...formData, litres: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="odometer">Odometer</Label>
              <Input
                id="odometer"
                type="number"
                value={formData.odometer}
                onChange={(e) => setFormData({...formData, odometer: e.target.value})}
              />
            </div>
          </div>
        )}
        
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>
        
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Save Expense
          </Button>
          <Button type="button" variant="outline" onClick={clearForm}>
            Clear
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddExpenseForm;