import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { Expense, Vehicle, EXPENSE_CATEGORIES } from '@/types';
import { ArrowUpDown, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import EditExpenseForm from './EditExpenseForm';

interface ExpenseWithVehicle extends Expense {
  vehicle?: Vehicle;
}

type SortField = 'date' | 'registration_number' | 'make' | 'model' | 'amount';
type SortDirection = 'asc' | 'desc';

const ViewExpenses: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseWithVehicle[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseWithVehicle[]>([]);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithVehicle | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { toast } = useToast();

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    filterAndSortExpenses();
  }, [expenses, startDate, endDate, sortField, sortDirection]);

  const fetchExpenses = async () => {
    try {
      const { data: expensesData, error } = await supabase
        .from('expenses')
        .select(`
          *,
          vehicles (
            id,
            registration_number,
            make,
            model
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      const expensesWithVehicles = expensesData.map(expense => ({
        ...expense,
        vehicle: expense.vehicles
      }));

      setExpenses(expensesWithVehicles);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch expenses',
        variant: 'destructive'
      });
    }
  };

  const filterAndSortExpenses = () => {
    let filtered = [...expenses];

    if (startDate) {
      filtered = filtered.filter(expense => expense.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(expense => expense.date <= endDate);
    }

    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'registration_number':
          aValue = a.vehicle?.registration_number || '';
          bValue = b.vehicle?.registration_number || '';
          break;
        case 'make':
          aValue = a.vehicle?.make || '';
          bValue = b.vehicle?.make || '';
          break;
        case 'model':
          aValue = a.vehicle?.model || '';
          bValue = b.vehicle?.model || '';
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredExpenses(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEdit = (expense: ExpenseWithVehicle) => {
    setEditingExpense(expense);
  };

  const handleDelete = async (expense: ExpenseWithVehicle) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expense.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Expense deleted successfully'
      });

      await fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete expense',
        variant: 'destructive'
      });
    }
  };

  const closeEditDialog = () => {
    setEditingExpense(null);
  };

  const formatAmount = (amount: number) => {
    return `R ${amount.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>View Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('date')}
                    className="h-auto p-0 font-semibold"
                  >
                    Date <ArrowUpDown className="ml-1 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('registration_number')}
                    className="h-auto p-0 font-semibold"
                  >
                    Reg Number <ArrowUpDown className="ml-1 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('make')}
                    className="h-auto p-0 font-semibold"
                  >
                    Make <ArrowUpDown className="ml-1 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('model')}
                    className="h-auto p-0 font-semibold"
                  >
                    Model <ArrowUpDown className="ml-1 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('amount')}
                    className="h-auto p-0 font-semibold"
                  >
                    Amount <ArrowUpDown className="ml-1 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(expense.date)}</TableCell>
                  <TableCell>{expense.vehicle?.registration_number || 'N/A'}</TableCell>
                  <TableCell>{expense.vehicle?.make || 'N/A'}</TableCell>
                  <TableCell>{expense.vehicle?.model || 'N/A'}</TableCell>
                  <TableCell>{formatAmount(expense.amount)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(expense)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(expense)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredExpenses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No expenses found.
            </div>
          )}
        </CardContent>
      </Card>

      {editingExpense && (
        <Dialog open={!!editingExpense} onOpenChange={closeEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
            </DialogHeader>
            <EditExpenseForm
              expense={editingExpense}
              onClose={closeEditDialog}
              onSave={fetchExpenses}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ViewExpenses;