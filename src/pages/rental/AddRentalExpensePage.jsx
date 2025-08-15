
import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Trash2, Plus } from 'lucide-react';

const AddRentalExpensePage = () => {
  const { toast } = useToast();

  const [unit, setUnit] = useState(null);
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [enteredHours, setEnteredHours] = useState('');
  const [equipment, setEquipment] = useState([]);
  const [items, setItems] = useState([{ part: null, quantity: 1, price: 0 }]);

  const totalAmount = useMemo(
    () =>
      items.reduce((sum, it) => {
        const q = Number(it.quantity || 0);
        const p = Number(it.price || 0);
        return sum + q * p;
      }, 0),
    [items]
  );

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('rental_equipment')
        .select('id, plant_no, make, model, current_hours, last_service_hours, next_service_hours')
        .order('plant_no', { ascending: true });

      if (error) {
        toast({ variant: 'destructive', title: 'Error loading equipment', description: error.message });
      } else {
        setEquipment(data || []);
      }
    })();
  }, [toast]);

  const selectedMachine = useMemo(() => {
    if (!unit?.id) return null;
    return (equipment || []).find((e) => e.id === unit.id) || null;
  }, [equipment, unit]);

  const fetchEquipmentOptions = async (q) => {
    const { data, error } = await supabase
      .from('rental_equipment')
      .select('id, plant_no')
      .ilike('plant_no', `%${q}%`)
      .limit(10);

    if (error) return [];
    return (data || []).map((m) => ({ id: m.id, name: m.plant_no || `#${m.id}` }));
  };

  const fetchPartsOptions = async (q) => {
    const { data, error } = await supabase
      .from('parts')
      .select('id, name, description, price')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(15);

    if (error || !data) return [];
    return data.map((p) => ({
      id: p.id,
      name: p.name ? `${p.name}${p.description ? ' — ' + p.description : ''}` : p.description ?? `#${p.id}`,
      price: p.price ?? 0,
    }));
  };

  const setItemField = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handlePartChange = (index, partObj) => {
    setItemField(index, 'part', partObj);
    if (partObj && (items[index].price === 0 || items[index].price === '' || items[index].price == null)) {
      setItemField(index, 'price', Number(partObj.price ?? 0));
    }
  };

  const addItem = () => setItems((prev) => [...prev, { part: null, quantity: 1, price: 0 }]);
  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  async function handleSave(e) {
    e.preventDefault();

    if (!unit?.id) {
      toast({ variant: 'destructive', title: 'Please choose a machine' });
      return;
    }

    const validItems = items.filter(
      (it) => it.part?.id && Number(it.quantity) > 0 && Number(it.price) >= 0
    );
    if (validItems.length === 0) {
      toast({ variant: 'destructive', title: 'Please add at least one line item' });
      return;
    }

    const { data: ins, error: insertErr } = await supabase
      .from('rental_expenses')
      .insert({
        rental_equipment_id: unit.id,
        total_amount: totalAmount,
        date: expenseDate,
        current_hours: enteredHours ? Number(enteredHours) : null,
      })
      .select('id')
      .single();

    if (insertErr) {
      toast({ variant: 'destructive', title: 'Error saving expense', description: insertErr.message });
      return;
    }

    const rows = validItems.map((it) => ({
      rental_expense_id: ins.id,
      part_id: it.part.id,
      quantity: Number(it.quantity),
      price: Number(it.price),
    }));

    const { error: itemsErr } = await supabase.from('rental_expense_items').insert(rows);
    if (itemsErr) {
      toast({
        variant: 'destructive',
        title: 'Expense saved, but items failed',
        description: itemsErr.message,
      });
    }

    if (enteredHours !== '' && !Number.isNaN(Number(enteredHours))) {
      const newHours = Number(enteredHours);
      const { data: eqRow, error: fetchErr } = await supabase
        .from('rental_equipment')
        .select('id, current_hours, last_service_hours, next_service_hours')
        .eq('id', unit.id)
        .single();

      if (!fetchErr && eqRow) {
        let last = eqRow.last_service_hours == null ? null : Number(eqRow.last_service_hours);
        let next = eqRow.next_service_hours == null ? null : Number(eqRow.next_service_hours);
        let interval = null;
        if (last != null && next != null && next > last) interval = next - last;
        if (interval != null && interval > 0) {
          if (next == null) {
            const k = Math.ceil(newHours / interval);
            next = k * interval;
          } else {
            while (newHours >= next) next += interval;
          }
        }

        const payload = { current_hours: newHours };
        if (next != null) payload.next_service_hours = next;
        await supabase.from('rental_equipment').update(payload).eq('id', unit.id);
      }
    }

    toast({ title: 'Saved', description: 'Expense and line items captured.' });
    setItems([{ part: null, quantity: 1, price: 0 }]);
    setEnteredHours('');
  }

  return (
    <>
      <Helmet>
        <title>Add Rental Expense</title>
      </Helmet>
      <Card>
        <CardHeader>
          <CardTitle>Add Rental Expense</CardTitle>
          <CardDescription>
            Select a machine, add expense line items, and (optionally) capture <strong>Current Hours</strong> to update the machine and next service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label>Machine</Label>
              <Autocomplete value={unit} onChange={setUnit} fetcher={fetchEquipmentOptions} displayField="name" placeholder="Search by plant number…" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Current Hours</Label>
              <Input type="number" value={enteredHours} onChange={(e) => setEnteredHours(e.target.value)} placeholder={selectedMachine?.current_hours != null ? `Current: ${selectedMachine.current_hours}` : 'e.g. 1234'} />
            </div>
            <Card className="border">
              <CardHeader><CardTitle className="text-lg">Expense Line Items</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-5 space-y-2">
                      <Label>Part</Label>
                      <Autocomplete value={it.part} onChange={(v) => handlePartChange(idx, v)} fetcher={fetchPartsOptions} displayField="name" placeholder="Type to search parts..." />
                    </div>
                    <div className="col-span-3 space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" value={it.quantity} onChange={(e) => setItemField(idx, 'quantity', e.target.value)} min="0" />
                    </div>
                    <div className="col-span-3 space-y-2">
                      <Label>Price (R)</Label>
                      <input type="number" step="0.01" min="0" value={it.price} onChange={(e) => setItemField(idx, 'price', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" />
                    </div>
                    <div className="col-span-1 flex items-center">
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} title="Remove">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" /> Add Expense Item
                </Button>
                <div className="text-right font-medium pt-2">
                  Total: R {totalAmount.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Button type="submit">Save Expense</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
};

export default AddRentalExpensePage;
