import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Edit, Trash2, Search, X } from 'lucide-react';
import { format } from 'date-fns';

const ViewSLAExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sla_expenses')
      .select(`
        *,
        sla_unit:sla_units(unit_number, make, model),
        supplier:suppliers(name),
        sla_expense_items(*)
      `)
      .order('date', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error fetching expenses', description: error.message });
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredExpenses = expenses.filter(expense => {
    if (!activeFilter) return true;
    const searchTerm = activeFilter.toLowerCase();
    return (
      (expense.sla_unit?.unit_number || '').toLowerCase().includes(searchTerm) ||
      (expense.sla_unit?.make || '').toLowerCase().includes(searchTerm) ||
      (expense.sla_unit?.model || '').toLowerCase().includes(searchTerm) ||
      (expense.supplier?.name || '').toLowerCase().includes(searchTerm)
    );
  });

  const handleApplyFilter = () => {
    setActiveFilter(filterText);
  };

  const handleClearFilter = () => {
    setFilterText('');
    setActiveFilter('');
  };

  const handleDeleteClick = (expense) => {
    setSelectedExpense(expense);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;

    // Delete expense items first, then the main expense
    const { error: itemsError } = await supabase
      .from('sla_expense_items')
      .delete()
      .eq('sla_expense_id', selectedExpense.id);

    if (itemsError) {
      toast({ variant: 'destructive', title: 'Error deleting expense items', description: itemsError.message });
      return;
    }

    const { error: expenseError } = await supabase
      .from('sla_expenses')
      .delete()
      .eq('id', selectedExpense.id);

    if (expenseError) {
      toast({ variant: 'destructive', title: 'Error deleting expense', description: expenseError.message });
    } else {
      toast({ title: 'Success', description: 'SLA expense deleted successfully' });
      fetchData();
    }

    setIsDeleteDialogOpen(false);
    setSelectedExpense(null);
  };

  const getTotalAmount = (expense) => {
    return expense.sla_expense_items?.reduce((total, item) => 
      total + (item.quantity * item.unit_price), 0
    ) || 0;
  };

  return (
    <>
      <Helmet>
        <title>View SLA Expenses</title>
      </Helmet>

      <Card>
        <CardHeader>
          <CardTitle>SLA Expenses</CardTitle>
          <CardDescription>View and manage all SLA expense entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Input
              placeholder="Filter by unit or supplier..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleApplyFilter}>
              <Search className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="ghost" onClick={handleClearFilter}>
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>SLA Unit</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No expenses found.</TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {format(new Date(expense.date), 'yyyy/MM/dd')}
                    </TableCell>
                    <TableCell>
                      {expense.sla_unit ? 
                        `${expense.sla_unit.unit_number} - ${expense.sla_unit.make} ${expense.sla_unit.model}` 
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{expense.supplier?.name || 'N/A'}</TableCell>
                    <TableCell>{expense.sla_expense_items?.length || 0} items</TableCell>
                    <TableCell>R {getTotalAmount(expense).toFixed(2)}</TableCell>
                    <TableCell className="space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Delete"
                        onClick={() => handleDeleteClick(expense)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete SLA Expense</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this SLA expense? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ViewSLAExpensesPage;