import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Vehicle, Supplier, Expense } from '@/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface VehicleContextType {
  vehicles: Vehicle[];
  suppliers: Supplier[];
  expenses: Expense[];
  loading: boolean;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  getVehicleById: (id: string) => Vehicle | undefined;
  getSupplierById: (id: string) => Supplier | undefined;
  loadData: () => Promise<void>;
  fetchVehicles: () => Promise<void>;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export const useVehicleContext = () => {
  const context = useContext(VehicleContext);
  if (!context) {
    throw new Error('useVehicleContext must be used within VehicleProvider');
  }
  return context;
};

export const VehicleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchVehicles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      if (data) setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [vehiclesRes, expensesRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('user_id', user.id),
        supabase.from('expenses').select('*').eq('user_id', user.id)
      ]);

      if (vehiclesRes.data) setVehicles(vehiclesRes.data);
      if (expensesRes.data) setExpenses(expensesRes.data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addVehicle = async (vehicle: Omit<Vehicle, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const vehicleData = {
        name: vehicle.name,
        registration_number: vehicle.registrationNumber,
        fleet_number: vehicle.fleetNumber,
        make: vehicle.make,
        model: vehicle.model,
        odometer: vehicle.odometer,
        next_service_odometer: vehicle.nextServiceOdometer,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('vehicles')
        .insert([vehicleData])
        .select()
        .single();

      if (error) throw error;
      setVehicles(prev => [...prev, data]);
      toast({ title: 'Success', description: 'Vehicle added successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
      toast({ title: 'Success', description: 'Vehicle updated successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setVehicles(prev => prev.filter(v => v.id !== id));
      setExpenses(prev => prev.filter(e => e.vehicle_id !== id));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    const newSupplier: Supplier = { ...supplier, id: Date.now().toString() };
    setSuppliers(prev => [...prev, newSupplier]);
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSupplier = async (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const expenseData = { ...expense, user_id: user.id };
      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single();

      if (error) throw error;
      setExpenses(prev => [...prev, data]);
      
      // Update vehicle odometer if provided
      if (expense.odometer && expense.vehicle_id) {
        await updateVehicle(expense.vehicle_id, { odometer: expense.odometer });
      }
      
      toast({ title: 'Success', description: 'Expense added successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getVehicleById = (id: string) => vehicles.find(v => v.id === id);
  const getSupplierById = (id: string) => suppliers.find(s => s.id === id);

  return (
    <VehicleContext.Provider value={{
      vehicles,
      suppliers,
      expenses,
      loading,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      addExpense,
      getVehicleById,
      getSupplierById,
      loadData,
      fetchVehicles
    }}>
      {children}
    </VehicleContext.Provider>
  );
};