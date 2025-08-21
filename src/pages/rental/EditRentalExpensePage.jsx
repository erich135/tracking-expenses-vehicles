import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

export default function EditRentalExpensePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [machines, setMachines] = useState([]);
  const [parts, setParts] = useState([]);
  const [form, setForm] = useState({
    rental_equipment_id: '',
    date: '',
    current_hours: '',
    lineItems: []
  });

  useEffect(() => {
    fetchMachines();
    fetchParts();
    fetchExpense();
  }, []);

  const fetchMachines = async () => {
    const { data } = await supabase.from('rental_equipment').select();
    setMachines(data || []);
  };

  const fetchParts = async () => {
    const { data } = await supabase.from('parts').select();
    setParts(data || []);
  };

  const fetchExpense = async () => {
    const { data, error } = await supabase
      .from('rental_expenses')
      .select(`
        id,
        date,
        rental_equipment_id,
        current_hours,
        rental_expense_items: rental_expense_items (
          part_id,
          quantity,
          price
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error loading expense',
        description: error.message
      });
      return;
    }

    setForm({
      rental_equipment_id: data.rental_equipment_id,
      date: data.date?.split('T')[0] || '',
      current_hours: data.current_hours || '',
      lineItems: data.rental_expense_items || []
    });
  };

  const handleLineItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.lineItems];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, lineItems: items };
    });
  };

  const addLineItem = () => {
    setForm((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { part_id: '', quantity: 1, price: 0 }]
    }));
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from('rental_expenses')
      .update({
        rental_equipment_id: form.rental_equipment_id,
        date: form.date,
        current_hours: form.current_hours
      })
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to update expense',
        description: error.message
      });
      return;
    }

    await supabase.from('rental_expense_items').delete().eq('expense_id', id);

    const lineItems = form.lineItems.map((item) => ({
      expense_id: id,
      part_id: item.part_id,
      quantity: Number(item.quantity),
      price: Number(item.price)
    }));

    const { error: lineError } = await supabase
      .from('rental_expense_items')
      .insert(lineItems);

    if (lineError) {
      toast({
        variant: 'destructive',
        title: 'Failed to update items',
        description: lineError.message
      });
      return;
    }

    toast({ title: 'Updated successfully' });
    navigate('/rental/expense/view');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-semibold mb-4">Edit Rental Expense</h2>

      <div className="space-y-4">
        <div>
          <Label>Machine</Label>
          <Select
            value={form.rental_equipment_id}
            onValueChange={(val) =>
              setForm((f) => ({ ...f, rental_equipment_id: val }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select machine" />
            </SelectTrigger>
            <SelectContent>
              {machines.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.plant_no}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>

        <div>
          <Label>Current Hours</Label>
          <Input
            type="number"
            value={form.current_hours}
            onChange={(e) =>
              setForm({ ...form, current_hours: e.target.value })
            }
          />
        </div>

        <div className="border p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Expense Line Items</h3>
          {form.lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-3 gap-2 mb-2">
              <Select
                value={item.part_id}
                onValueChange={(val) =>
                  handleLineItemChange(index, 'part_id', val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select part" />
                </SelectTrigger>
                <SelectContent>
                  {parts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  handleLineItemChange(index, 'quantity', e.target.value)
                }
                placeholder="Qty"
              />
              <Input
                type="number"
                value={item.price}
                onChange={(e) =>
                  handleLineItemChange(index, 'price', e.target.value)
                }
                placeholder="Price"
              />
            </div>
          ))}

          <Button type="button" onClick={addLineItem} className="mt-2">
            + Add Expense Item
          </Button>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave}>Save</Button>
          <Button
            variant="outline"
            onClick={() => navigate('/rental/expense/view')}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
