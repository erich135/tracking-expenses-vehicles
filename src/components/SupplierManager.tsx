import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useVehicleContext } from '@/contexts/VehicleContext';
import { Supplier } from '@/types';

const SupplierManager: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useVehicleContext();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [editSupplierName, setEditSupplierName] = useState('');

  const handleAddSupplier = () => {
    if (!newSupplierName.trim()) {
      toast({ title: 'Error', description: 'Supplier name cannot be empty', variant: 'destructive' });
      return;
    }
    
    if (suppliers.some(s => s.name.toLowerCase() === newSupplierName.trim().toLowerCase())) {
      toast({ title: 'Error', description: 'Supplier already exists', variant: 'destructive' });
      return;
    }

    addSupplier({ name: newSupplierName.trim() });
    toast({ title: 'Success', description: 'Supplier added successfully' });
    setNewSupplierName('');
    setIsAddDialogOpen(false);
  };

  const handleEditSupplier = () => {
    if (!editSupplierName.trim() || !editingSupplier) {
      toast({ title: 'Error', description: 'Supplier name cannot be empty', variant: 'destructive' });
      return;
    }
    
    if (suppliers.some(s => s.name.toLowerCase() === editSupplierName.trim().toLowerCase() && s.id !== editingSupplier.id)) {
      toast({ title: 'Error', description: 'Supplier already exists', variant: 'destructive' });
      return;
    }

    updateSupplier(editingSupplier.id, { name: editSupplierName.trim() });
    toast({ title: 'Success', description: 'Supplier updated successfully' });
    setEditingSupplier(null);
    setEditSupplierName('');
  };

  const handleDeleteSupplier = (id: string) => {
    deleteSupplier(id);
    toast({ title: 'Success', description: 'Supplier deleted successfully' });
  };

  const startEditing = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setEditSupplierName(supplier.name);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Suppliers ({suppliers.length})</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="supplierName">Supplier Name</Label>
                  <Input
                    id="supplierName"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Enter supplier name"
                  />
                </div>
                <Button onClick={handleAddSupplier} className="w-full">
                  Add Supplier
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  {editingSupplier?.id === supplier.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editSupplierName}
                        onChange={(e) => setEditSupplierName(e.target.value)}
                        className="h-8"
                      />
                      <Button size="sm" onClick={handleEditSupplier}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingSupplier(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    supplier.name
                  )}
                </TableCell>
                <TableCell>
                  {editingSupplier?.id !== supplier.id && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(supplier)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteSupplier(supplier.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {suppliers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No suppliers added yet. Click "Add Supplier" to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SupplierManager;