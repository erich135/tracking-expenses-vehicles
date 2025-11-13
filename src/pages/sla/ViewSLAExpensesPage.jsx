import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Edit, Trash2, Search, X, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Autocomplete } from '@/components/ui/autocomplete';

const ViewSLAExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [editFormData, setEditFormData] = useState({});
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

  const handleEditClick = async (expense) => {
    setSelectedExpense(expense);
    
    // Fetch parts data for existing expense items
    let itemsWithParts = [];
    if (expense.sla_expense_items?.length > 0) {
      const partIds = expense.sla_expense_items
        .filter(item => item.part_id)
        .map(item => item.part_id);
      
      let partsData = [];
      if (partIds.length > 0) {
        const { data, error } = await supabase
          .from('parts')
          .select('id, name, price')
          .in('id', partIds);
        if (!error) partsData = data || [];
      }
      
      itemsWithParts = expense.sla_expense_items.map(item => {
        const partData = partsData.find(p => p.id === item.part_id);
        return {
          id: item.id,
          part: partData ? { 
            id: partData.id, 
            name: partData.name,
            price: partData.price 
          } : null,
          description: item.description || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0
        };
      });
    }
    
    setEditFormData({
      date: expense.date?.split('T')[0] || '',
      sla_unit_id: expense.sla_unit ? {
        id: expense.sla_unit_id,
        name: `${expense.sla_unit.unit_number} - ${expense.sla_unit.make} ${expense.sla_unit.model}`
      } : null,
      supplier_id: expense.supplier ? {
        id: expense.supplier_id,
        name: expense.supplier.name
      } : null,
      items: itemsWithParts
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      // Update main expense record
      const { error: expenseError } = await supabase
        .from('sla_expenses')
        .update({
          date: editFormData.date,
          sla_unit_id: editFormData.sla_unit_id?.id,
          supplier_id: editFormData.supplier_id?.id || null
        })
        .eq('id', selectedExpense.id);

      if (expenseError) throw expenseError;

      // Delete existing items
      await supabase
        .from('sla_expense_items')
        .delete()
        .eq('sla_expense_id', selectedExpense.id);

      // Insert updated items
      if (editFormData.items?.length > 0) {
        const itemsToInsert = editFormData.items.map(item => ({
          sla_expense_id: selectedExpense.id,
          part_id: item.part?.id || null,
          description: item.part?.name || item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price)
        }));

        const { error: itemsError } = await supabase
          .from('sla_expense_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      toast({ title: 'Success', description: 'SLA expense updated successfully' });
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error updating expense', description: error.message });
    }
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
                        title="Edit"
                        onClick={() => handleEditClick(expense)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit SLA Expense</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editFormData.date || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>SLA Unit</Label>
                <Autocomplete
                  value={editFormData.sla_unit_id}
                  onChange={(value) => setEditFormData(prev => ({ ...prev, sla_unit_id: value }))}
                  fetcher={async (searchTerm) => {
                    const { data, error } = await supabase
                      .from('sla_units')
                      .select('id, unit_number, make, model')
                      .or(`unit_number.ilike.%${searchTerm}%,make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`)
                      .limit(10);
                    if (error) return [];
                    return data.map(d => ({ ...d, name: `${d.unit_number} - ${d.make} ${d.model}` }));
                  }}
                  displayField="name"
                  placeholder="Select SLA unit..."
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Supplier</Label>
              <Autocomplete
                value={editFormData.supplier_id}
                onChange={(value) => setEditFormData(prev => ({ ...prev, supplier_id: value }))}
                fetcher={async (searchTerm) => {
                  const { data, error } = await supabase
                    .from('suppliers')
                    .select('id, name')
                    .ilike('name', `%${searchTerm}%`)
                    .limit(10);
                  return error ? [] : data;
                }}
                displayField="name"
                placeholder="Select supplier..."
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">Expense Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditFormData(prev => ({
                      ...prev,
                      items: [...(prev.items || []), { part: null, description: '', quantity: 1, unit_price: 0 }]
                    }));
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
              
              {(editFormData.items || []).map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 border rounded">
                  <div className="col-span-5">
                    <Label>Part</Label>
                    <Autocomplete
                      value={item.part}
                      onChange={(value) => {
                        const newItems = [...(editFormData.items || [])];
                        newItems[index].part = value;
                        if (value) {
                          newItems[index].description = value.name;
                          newItems[index].unit_price = value.price || 0;
                        }
                        setEditFormData(prev => ({ ...prev, items: newItems }));
                      }}
                      fetcher={async (searchTerm) => {
                        const { data, error } = await supabase
                          .from('parts')
                          .select('id, name, price')
                          .ilike('name', `%${searchTerm}%`)
                          .limit(10);
                        if (error) return [];
                        // Clean up any potential whitespace issues
                        if (data) {
                          data.forEach(item => {
                            if (item.name) item.name = item.name.trim();
                          });
                        }
                        return data || [];
                      }}
                      displayField="name"
                      placeholder="Type to search parts..."
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...(editFormData.items || [])];
                        newItems[index].quantity = Number(e.target.value) || 0;
                        setEditFormData(prev => ({ ...prev, items: newItems }));
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => {
                        const newItems = [...(editFormData.items || [])];
                        newItems[index].unit_price = Number(e.target.value) || 0;
                        setEditFormData(prev => ({ ...prev, items: newItems }));
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Total</Label>
                    <strong>R {((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</strong>
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newItems = (editFormData.items || []).filter((_, i) => i !== index);
                        setEditFormData(prev => ({ ...prev, items: newItems }));
                      }}
                      className="mt-6"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ViewSLAExpensesPage;