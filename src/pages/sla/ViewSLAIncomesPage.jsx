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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Autocomplete } from '@/components/ui/autocomplete';

const ViewSLAIncomesPage = () => {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [editFormData, setEditFormData] = useState({});
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sla_incomes')
      .select(`
        *,
        sla_unit:sla_units(unit_number, make, model),
        customer:customers(name)
      `)
      .order('date', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error fetching incomes', description: error.message });
    } else {
      setIncomes(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredIncomes = incomes.filter(income => {
    if (!activeFilter) return true;
    const searchTerm = activeFilter.toLowerCase();
    return (
      (income.sla_unit?.unit_number || '').toLowerCase().includes(searchTerm) ||
      (income.sla_unit?.make || '').toLowerCase().includes(searchTerm) ||
      (income.sla_unit?.model || '').toLowerCase().includes(searchTerm) ||
      (income.customer?.name || '').toLowerCase().includes(searchTerm) ||
      (income.invoice_number || '').toLowerCase().includes(searchTerm)
    );
  });

  const handleApplyFilter = () => {
    setActiveFilter(filterText);
  };

  const handleClearFilter = () => {
    setFilterText('');
    setActiveFilter('');
  };

  const handleDeleteClick = (income) => {
    setSelectedIncome(income);
    setIsDeleteDialogOpen(true);
  };

  const handleEditClick = (income) => {
    setSelectedIncome(income);
    setEditFormData({
      date: income.date?.split('T')[0] || '',
      sla_unit_id: income.sla_unit ? {
        id: income.sla_unit_id,
        name: `${income.sla_unit.unit_number} - ${income.sla_unit.make} ${income.sla_unit.model}`
      } : null,
      customer_id: income.customer ? {
        id: income.customer_id,
        name: income.customer.name
      } : null,
      invoice_number: income.invoice_number || '',
      amount: income.amount || 0,
      notes: income.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('sla_incomes')
        .update({
          date: editFormData.date,
          sla_unit_id: editFormData.sla_unit_id?.id,
          customer_id: editFormData.customer_id?.id,
          invoice_number: editFormData.invoice_number,
          amount: Number(editFormData.amount),
          notes: editFormData.notes
        })
        .eq('id', selectedIncome.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'SLA income updated successfully' });
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error updating income', description: error.message });
    }
  };

  const handleDelete = async () => {
    if (!selectedIncome) return;

    const { error } = await supabase
      .from('sla_incomes')
      .delete()
      .eq('id', selectedIncome.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error deleting income', description: error.message });
    } else {
      toast({ title: 'Success', description: 'SLA income deleted successfully' });
      fetchData();
    }

    setIsDeleteDialogOpen(false);
    setSelectedIncome(null);
  };

  return (
    <>
      <Helmet>
        <title>View SLA Incomes</title>
      </Helmet>

      <Card>
        <CardHeader>
          <CardTitle>SLA Incomes</CardTitle>
          <CardDescription>View and manage all SLA income entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Input
              placeholder="Filter by unit, customer, or invoice..."
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
                <TableHead>Customer</TableHead>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredIncomes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No incomes found.</TableCell>
                </TableRow>
              ) : (
                filteredIncomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell>
                      {format(new Date(income.date), 'yyyy/MM/dd')}
                    </TableCell>
                    <TableCell>
                      {income.sla_unit ? 
                        `${income.sla_unit.unit_number} - ${income.sla_unit.make} ${income.sla_unit.model}` 
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{income.customer?.name || 'N/A'}</TableCell>
                    <TableCell>{income.invoice_number || 'N/A'}</TableCell>
                    <TableCell>R {income.amount?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>{income.notes || ''}</TableCell>
                    <TableCell className="space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Edit"
                        onClick={() => handleEditClick(income)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Delete"
                        onClick={() => handleDeleteClick(income)}
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
            <DialogTitle>Delete SLA Income</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this SLA income? This action cannot be undone.</p>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit SLA Income</DialogTitle>
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
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.amount || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
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

            <div className="space-y-2">
              <Label>Customer</Label>
              <Autocomplete
                value={editFormData.customer_id}
                onChange={(value) => setEditFormData(prev => ({ ...prev, customer_id: value }))}
                fetcher={async (searchTerm) => {
                  const { data, error } = await supabase
                    .from('customers')
                    .select('id, name')
                    .ilike('name', `%${searchTerm}%`)
                    .limit(10);
                  return error ? [] : data;
                }}
                displayField="name"
                placeholder="Select customer..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input
                value={editFormData.invoice_number || ''}
                onChange={(e) => setEditFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                placeholder="e.g., INV-12345"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editFormData.notes || ''}
                onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
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

export default ViewSLAIncomesPage;