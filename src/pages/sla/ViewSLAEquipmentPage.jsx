import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Edit, Trash2, Plus } from 'lucide-react';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const ViewSLAEquipmentPage = () => {
  const [allEquipment, setAllEquipment] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Add dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    unit_number: '',
    make: '',
    model: '',
    customer_id: null, // { id, name } via Autocomplete
    location: '',
    contract_start: '',
    contract_end: '',
    serial_number: '',
    monthly_amount: '',
    contract_value: '',
    notes: ''
  });

  // Delete confirm
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // row object or {id}

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [equipmentRes, customersRes] = await Promise.all([
      supabase
        .from('sla_units')
        .select(
          'id, unit_number, make, model, customer_id, location, contract_start, contract_end, serial_number, monthly_amount, contract_value, notes, customer:customers(name)'
        ),
      supabase.from('customers').select('id, name')
    ]);

    if (equipmentRes.error) {
      toast({ variant: 'destructive', title: 'Error fetching equipment', description: equipmentRes.error.message });
    } else {
      setAllEquipment(equipmentRes.data || []);
    }

    if (customersRes.error) {
      toast({ variant: 'destructive', title: 'Error fetching customers', description: customersRes.error.message });
    } else {
      setCustomers(customersRes.data || []);
    }

    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEquipment = useMemo(() => {
    // (keeping simple—no filtering UI shown here)
    return allEquipment;
  }, [allEquipment]);

  const handleEditClick = (machine) => {
    setEditFormData({
      ...machine,
      customer_id: machine.customer ? { id: machine.customer_id, name: machine.customer.name } : null
    });
    setIsEditDialogOpen(true);
  };

  const handleInputChange = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddInputChange = (field, value) => {
    setAddFormData((prev) => ({ ...prev, [field]: value }));
  };

  const fetchCustomersForAutocomplete = async (searchTerm) => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .ilike('name', `%${searchTerm}%`)
      .limit(10);
    if (error) {
      toast({ variant: 'destructive', title: 'Error fetching customers', description: error.message });
      return [];
    }
    return data;
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { id, customer, ...updateData } = editFormData;
    updateData.customer_id = updateData.customer_id?.id || null;

    const { error } = await supabase.from('sla_units').update(updateData).eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Error updating unit', description: error.message });
    } else {
      toast({ title: 'Saved', description: 'SLA unit updated.' });
      setIsEditDialogOpen(false);
      fetchData();
    }
  };

  const handleAddOpen = () => {
    setAddFormData({
      unit_number: '',
      make: '',
      model: '',
      customer_id: null,
      location: '',
      contract_start: '',
      contract_end: '',
      serial_number: '',
      monthly_amount: '',
      contract_value: '',
      notes: ''
    });
    setIsAddDialogOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    // very light validation
    if (!addFormData.unit_number) {
      toast({ variant: 'destructive', title: 'Unit number is required' });
      return;
    }

    const payload = {
      ...addFormData,
      customer_id: addFormData.customer_id?.id || null
    };

    const { error } = await supabase.from('sla_units').insert(payload);
    if (error) {
      toast({ variant: 'destructive', title: 'Error adding unit', description: error.message });
    } else {
      toast({ title: 'Added', description: 'New SLA unit created.' });
      setIsAddDialogOpen(false);
      fetchData();
    }
  };

  const requestDelete = (row) => {
    setDeleteTarget(row);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) {
      setIsDeleteOpen(false);
      return;
    }
    const { error } = await supabase.from('sla_units').delete().eq('id', deleteTarget.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Error deleting unit', description: error.message });
    } else {
      toast({ title: 'Deleted', description: `Unit ${deleteTarget.unit_number || ''} removed.` });
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      fetchData();
    }
  };

  return (
    <>
      <Helmet>
        <title>SLA Equipment</title>
      </Helmet>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>SLA Equipment</CardTitle>
              <CardDescription>View, add, edit, and delete SLA machines.</CardDescription>
            </div>
            <Button onClick={handleAddOpen}>
              <Plus className="w-4 h-4 mr-2" />
              Add Unit
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="table-head-bold">
Unit</TableHead>
                <TableHead className="table-head-bold">
Make</TableHead>
                <TableHead className="table-head-bold">
Model</TableHead>
                <TableHead className="table-head-bold">
Customer</TableHead>
                <TableHead className="table-head-bold">
Location</TableHead>
                <TableHead className="table-head-bold">
Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>Loading…</TableCell>
                </TableRow>
              ) : filteredEquipment.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>No equipment found.</TableCell>
                </TableRow>
              ) : (
                filteredEquipment.map((machine) => (
                  <TableRow key={machine.id || machine.unit_number}>
                    <TableCell>{machine.unit_number}</TableCell>
                    <TableCell>{machine.make}</TableCell>
                    <TableCell>{machine.model}</TableCell>
                    <TableCell>{machine.customer?.name || 'N/A'}</TableCell>
                    <TableCell>{machine.location || '—'}</TableCell>
                    <TableCell className="space-x-1">
                      <Button onClick={() => handleEditClick(machine)} variant="ghost" size="icon" title="Edit">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => requestDelete(machine)}
                        variant="ghost"
                        size="icon"
                        title="Delete"
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

      {/* Edit dialog (scrolls in the middle) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Machine</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <Label>Unit</Label>
            <Input
              value={editFormData.unit_number || ''}
              onChange={(e) => handleInputChange('unit_number', e.target.value)}
            />

            <Label>Make</Label>
            <Input value={editFormData.make || ''} onChange={(e) => handleInputChange('make', e.target.value)} />

            <Label>Model</Label>
            <Input value={editFormData.model || ''} onChange={(e) => handleInputChange('model', e.target.value)} />

            <Label>Customer</Label>
            <Autocomplete
              value={editFormData.customer_id}
              onChange={(value) => handleInputChange('customer_id', value)}
              fetcher={fetchCustomersForAutocomplete}
            />

            <Label>Location</Label>
            <Input value={editFormData.location || ''} onChange={(e) => handleInputChange('location', e.target.value)} />

            <Label>Contract Start</Label>
            <Input
              type="date"
              value={editFormData.contract_start || ''}
              onChange={(e) => handleInputChange('contract_start', e.target.value)}
            />

            <Label>Contract End</Label>
            <Input
              type="date"
              value={editFormData.contract_end || ''}
              onChange={(e) => handleInputChange('contract_end', e.target.value)}
            />

            <Label>Serial Number</Label>
            <Input
              value={editFormData.serial_number || ''}
              onChange={(e) => handleInputChange('serial_number', e.target.value)}
            />

            <Label>Monthly Amount</Label>
            <Input
              type="number"
              value={editFormData.monthly_amount || ''}
              onChange={(e) => handleInputChange('monthly_amount', e.target.value)}
            />

            <Label>Contract Value</Label>
            <Input
              type="number"
              value={editFormData.contract_value || ''}
              onChange={(e) => handleInputChange('contract_value', e.target.value)}
            />

            <Label>Notes</Label>
            <Textarea value={editFormData.notes || ''} onChange={(e) => handleInputChange('notes', e.target.value)} />
          </div>

          <DialogFooter>
            <Button onClick={handleUpdate}>Save</Button>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add dialog (scrolls in the middle) */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add SLA Unit</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <Label>Unit</Label>
            <Input
              value={addFormData.unit_number}
              onChange={(e) => handleAddInputChange('unit_number', e.target.value)}
            />

            <Label>Make</Label>
            <Input value={addFormData.make} onChange={(e) => handleAddInputChange('make', e.target.value)} />

            <Label>Model</Label>
            <Input value={addFormData.model} onChange={(e) => handleAddInputChange('model', e.target.value)} />

            <Label>Customer</Label>
            <Autocomplete
              value={addFormData.customer_id}
              onChange={(value) => handleAddInputChange('customer_id', value)}
              fetcher={fetchCustomersForAutocomplete}
            />

            <Label>Location</Label>
            <Input value={addFormData.location} onChange={(e) => handleAddInputChange('location', e.target.value)} />

            <Label>Contract Start</Label>
            <Input
              type="date"
              value={addFormData.contract_start}
              onChange={(e) => handleAddInputChange('contract_start', e.target.value)}
            />

            <Label>Contract End</Label>
            <Input
              type="date"
              value={addFormData.contract_end}
              onChange={(e) => handleAddInputChange('contract_end', e.target.value)}
            />

            <Label>Serial Number</Label>
            <Input
              value={addFormData.serial_number}
              onChange={(e) => handleAddInputChange('serial_number', e.target.value)}
            />

            <Label>Monthly Amount</Label>
            <Input
              type="number"
              value={addFormData.monthly_amount}
              onChange={(e) => handleAddInputChange('monthly_amount', e.target.value)}
            />

            <Label>Contract Value</Label>
            <Input
              type="number"
              value={addFormData.contract_value}
              onChange={(e) => handleAddInputChange('contract_value', e.target.value)}
            />

            <Label>Notes</Label>
            <Textarea value={addFormData.notes} onChange={(e) => handleAddInputChange('notes', e.target.value)} />
          </div>

          <DialogFooter>
            <Button onClick={handleAddSubmit}>Create</Button>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete unit?</DialogTitle>
          </DialogHeader>
          <p>
            This will permanently remove
            {deleteTarget?.unit_number ? ` "${deleteTarget.unit_number}"` : ''}. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
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

export default ViewSLAEquipmentPage;
