import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVehicleContext } from '@/contexts/VehicleContext';
import { useToast } from '@/hooks/use-toast';

const AddVehicleForm: React.FC = () => {
  const { addVehicle } = useVehicleContext();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    regNumber: '',
    fleetNumber: '',
    make: '',
    model: '',
    currentOdometer: '0',
    nextService: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.regNumber) {
      toast({ title: 'Error', description: 'Registration number is required', variant: 'destructive' });
      return;
    }

    try {
      await addVehicle({
        name: formData.regNumber,
        registrationNumber: formData.regNumber,
        fleetNumber: formData.fleetNumber,
        make: formData.make,
        model: formData.model,
        odometer: parseInt(formData.currentOdometer) || 0,
        nextServiceOdometer: parseInt(formData.nextService) || null
      });
      clearForm();
    } catch (error) {
      // Error handled in context
    }
  };

  const clearForm = () => {
    setFormData({
      regNumber: '',
      fleetNumber: '',
      make: '',
      model: '',
      currentOdometer: '0',
      nextService: ''
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Add Vehicle</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="regNumber">Registration Number *</Label>
          <Input
            id="regNumber"
            value={formData.regNumber}
            onChange={(e) => setFormData({...formData, regNumber: e.target.value})}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="fleetNumber">Fleet Number</Label>
          <Input
            id="fleetNumber"
            value={formData.fleetNumber}
            onChange={(e) => setFormData({...formData, fleetNumber: e.target.value})}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="make">Make</Label>
            <Input
              id="make"
              value={formData.make}
              onChange={(e) => setFormData({...formData, make: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="currentOdometer">Current Odometer</Label>
          <Input
            id="currentOdometer"
            type="number"
            value={formData.currentOdometer}
            onChange={(e) => setFormData({...formData, currentOdometer: e.target.value})}
          />
        </div>
        
        <div>
          <Label htmlFor="nextService">Next Service Odometer</Label>
          <Input
            id="nextService"
            type="number"
            value={formData.nextService}
            onChange={(e) => setFormData({...formData, nextService: e.target.value})}
            placeholder="Enter odometer value for next service"
          />
        </div>
        
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Save Vehicle
          </Button>
          <Button type="button" variant="outline" onClick={clearForm}>
            Clear
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddVehicleForm;