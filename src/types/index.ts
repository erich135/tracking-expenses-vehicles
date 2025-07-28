export interface Vehicle {
  id: string;
  name: string;
  registrationNumber?: string;
  registration_number?: string;
  fleetNumber?: string;
  fleet_number?: string;
  make: string;
  model: string;
  odometer: number;
  lastServiceOdometer?: number;
  nextServiceOdometer?: number;
  next_service_odometer?: number;
  fuelUsedPerMonth?: number;
  fuelValuePerMonth?: number;
  averageFuelUsage?: number;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  vehicle_id: string;
  category: string;
  supplier: string;
  amount: number;
  date: string;
  description?: string;
  litres?: number;
  odometer?: number;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type ExpenseCategory = 
  | 'fuel'
  | 'maintenance'
  | 'insurance'
  | 'repairs'
  | 'other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'fuel',
  'maintenance', 
  'insurance',
  'repairs',
  'other'
];