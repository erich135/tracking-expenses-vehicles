// components/EditRentalExpenseModal.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function EditRentalExpenseModal({ open, onClose, expense }) {
  const { toast } = useToast();

  const [machines, setMachines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [parts, setParts] = useState([]);

  const [form, setForm] = useState({
    rental_equipment_id: '',
    supplier_id: '',
    date: '',
    current_hours: '',
    lineItems: [],
  });

  useEffect(() => {
    if (open && expense) {
      fetchFormData();
    }
  }, [open, expense]);

  const fetchFormData = async () => {
    const [machineRes, supplierRes, partsRes, lineItemsRes] = await Promise.all([
      supabase.from('rental_equipment').select('id, plant_no'),
      supabase.from('suppliers').select('id, name'),
      supabase.from('parts').select('id, description'),
      supabase
        .from('rental_expense_items')
        .select('id, part_id, description, quantity, unit_price')
        .eq('rental_expense_id', expense.id),
    ]);

    setMachines(machineRes.data || []);
    setSuppliers(supplierRes.data || []);
    setParts(partsRes.data || []);

    setForm({
      rental_equipment_id: expense.rental_equipment?.id || '',
      supplier_id: expense.suppliers?.id || '',
      date: expense.date?.split('T')[0],
      current_hours: expense.current_hours || '',
      lineItems: (lineItemsRes.data || []).map((item) => ({
        ...item,
        total: Number(item.quantity) * Number(item.unit_price),
      })),
    });
  };

  const handleLineChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.lineItems];
      updated[index][field] = value;
      updated[index].total = Number(updated[index].quantity) * Number(updated[index].unit_price);
      return { ...prev, lineItems: updated };
    });
  };

  const addLineItem = () => {
    setForm((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { part_id: '', description: '', quantity: 1, unit_price: 0, total: 0 }],
    }));
  };

  const removeLineItem = (index) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    const totalAmount = form.lineItems.reduce((acc, item) => acc + Number(item.total), 0);

    const { error: updateError } = await supabase
      .from('rental_expenses')
      .update({
        rental_equipment_id: form.rental_equipment_id,
        supplier_id: form.supplier_id,
        date: form.date,
        current_hours: form.current_hours,
        total_amount: totalAmount,
      })
      .eq('id', expense.id);

    if (updateError) {
      toast({ variant: 'destructive', title: 'Failed to update expense', description: updateError.message });
      return;
    }

    await supabase.from('rental_expense_items').delete().eq('rental_expense_id', expense.id);

    const insertItems = form.lineItems.map((item) => ({
      rental_expense_id: expense.id,
      part_id: item.part_id || null,
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      total: Number(item.total),
    }));

    const { error: insertError } = await supabase.from('rental_expense_items').insert(insertItems);

    if (insertError) {
      toast({ variant: 'destructive', title: 'Failed to update line items', description: insertError.message });
      return;
    }

    toast({ title: 'Success', description: 'Rental expense updated.' });
    onClose(true);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-4xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Rental Expense</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Machine</Label>
            <select
              className="w-full border p-2 rounded"
              value={form.rental_equipment_id}
              onChange={(e) => setForm({ ...form, rental_equipment_id: e.target.value })}
            >
              <option value="">Select machine</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.plant_no}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Supplier</Label>
            <select
              className="w-full border p-2 rounded"
              value={form.supplier_id}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>

          <div>
            <Label>Current Hours</Label>
            <Input
              type="number"
              value={form.current_hours}
              onChange={(e) => setForm({ ...form, current_hours: e.target.value })}
            />
          </div>
        </div>

        <hr className="my-4" />

        <h3 className="font-semibold mb-2">Expense Line Items</h3>
        {form.lineItems.map((item, index) => (
          <div key={index} className="grid grid-cols-6 gap-2 items-end mb-2">
            <select
              className="border p-1 col-span-2"
              value={item.part_id}
              onChange={(e) => handleLineChange(index, 'part_id', e.target.value)}
            >
              <option value="">Select part</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.description}
                </option>
              ))}
            </select>
            <Input
              placeholder="Description"
              value={item.description}
              onChange={(e) => handleLineChange(index, 'description', e.target.value)}
            />
            <Input
              type="number"
              placeholder="Qty"
              value={item.quantity}
              onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
            />
            <Input
              type="number"
              placeholder="Unit Price"
              value={item.unit_price}
              onChange={(e) => handleLineChange(index, 'unit_price', e.target.value)}
            />
            <Button variant="destructive" size="sm" onClick={() => removeLineItem(index)}>
              Remove
            </Button>
          </div>
        ))}
        <Button onClick={addLineItem} className="mb-4">
          + Add Line Item
        </Button>

        <div className="flex justify-between items-center mt-4">
          <div className="font-semibold">
            Total: R{' '}
            {form.lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0).toFixed(2)}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave}>Save Changes</Button>
            <Button variant="outline" onClick={() => onClose(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
