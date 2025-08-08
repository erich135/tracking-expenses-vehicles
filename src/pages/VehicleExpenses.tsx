import React from 'react';
import AddExpenseForm from '@/components/AddExpenseForm';

const VehicleExpenses: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Add Vehicle Expense</h2>
      <AddExpenseForm />
    </div>
  );
};

export default VehicleExpenses;
