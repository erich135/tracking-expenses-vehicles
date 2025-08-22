
// EditRentalExpensePage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Trash2, Plus } from 'lucide-react';

const EditRentalExpensePage = () => {
  const { id } = useParams();
  const { toast } = useToast();

  const [equipment, setEquipment] = useState([]);
  const [unitId, setUnitId] = useState('');
  const [unitName, setUnitName] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [enteredHours, setEnteredHours] = useState('');
  const [items, setItems] = useState([{ part: null, quantity: 1, price: 0 }]);
  const [loading, setLoading] = useState(false);

  const totalAmount = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.price || 0), 0),
    [items]
  );

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('rental_equipment')
        .select('id, plant_no')
        .order('plant_no', { ascending: true });

      if (!error && data) setEquipment(data);
    })();
  }, []);

  const selectedMachine = useMemo(
    () => equipment.find(e => String(e.id) === String(unitId)) || null,
    [equipment, unitId]
  );

  const fetchPartsOptions = async (q) => {
    const { data, error } = await supabase
      .from('parts')
      .select('id, name, description, price')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(15);

    if (error || !data) return [];

    return data.map((p) => ({
      id: String(p.id),
      name: p.name
        ? `${p.name}${p.description ? ' — ' + p.description : ''}`
        : p.description ?? `#${p.id}`,
      price: p.price ?? 0,
      raw: p,
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
    setItemField(index, 'price', partObj?.price ?? 0);
  };

  const addItem = () => setItems((prev) => [...prev, { part: null, quantity: 1, price: 0 }]);
  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  useEffect(() => {
  const fetchData = async () => {
    if (!id) return;
    setLoading(true);

    const { data: expense, error: err1 } = await supabase
      .from('rental_expenses')
      .select('id, rental_equipment_id, date, current_hours')
      .eq('id', id)
      .single();

    if (err1 || !expense) {
      setLoading(false);
      return;
    }

    const { data: itemRows, error: err2 } = await supabase
      .from('rental_expense_items')
      .select('id, part_id, quantity, unit_price')
      .eq('rental_expense_id', id);

    const [equipmentRes, partsRes] = await Promise.all([
      supabase.from('rental_equipment').select('id, plant_no'),
      supabase
        .from('parts')
        .select('id, name, description, price')
        .in('id', itemRows.map((item) => item.part_id)),
    ]);

    const equipmentData = equipmentRes.data || [];
    const parts = partsRes.data || [];

    setEquipment(equipmentData);

    const machine = equipmentData.find((e) => e.id === expense.rental_equipment_id);
    setUnitId(expense.rental_equipment_id);
    setUnitName(machine?.plant_no ?? '');

    const mappedItems = itemRows.map((item) => {
      const matchedPart = parts.find((p) => String(p.id) === String(item.part_id));
      return {
        part: matchedPart
          ? {
              id: String(matchedPart.id),
              name:
                matchedPart.name && matchedPart.description
                  ? `${matchedPart.name} - ${matchedPart.description}`
                  : matchedPart.name || matchedPart.description || `Part #${matchedPart.id}`,
              price: matchedPart.price ?? 0,
              raw: matchedPart,
            }
          : {
              id: String(item.part_id),
              name: `Unknown Part #${item.part_id}`,
              price: item.unit_price,
            },
        quantity: item.quantity,
        price: item.unit_price,
      };
    });

    setExpenseDate(expense.date);
    setEnteredHours(expense.current_hours ?? '');
    setItems(mappedItems);
    setLoading(false);
  };

  fetchData();
}, [id]);
  const handleSave = async (e) => {
    e.preventDefault();
    toast({ title: 'Edit not implemented in this demo.' });
  };

  return (
    <>
      <Helmet>
        <title>Edit Rental Expense</title>
      </Helmet>
      <Card>
        <CardHeader>
          <CardTitle>Edit Rental Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label>Machine</Label>
              <Input disabled value={unitName} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Current Hours</Label>
              <Input
                type="number"
                value={enteredHours}
                onChange={(e) => setEnteredHours(e.target.value)}
              />
            </div>
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-lg">Expense Line Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-5 space-y-2">
                      <Label>Part</Label>
                      <Autocomplete
                        value={it.part}
                        onChange={(v) => handlePartChange(idx, v)}
                        fetcher={fetchPartsOptions}
                        displayField="name"
                        placeholder="Type to search parts..."
                      />
                    </div>
                    <div className="col-span-3 space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={it.quantity}
                        onChange={(e) => setItemField(idx, 'quantity', e.target.value)}
                        min="0"
                      />
                    </div>
                    <div className="col-span-3 space-y-2">
                      <Label>Price (R)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={it.price}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItemField(idx, 'price', val === '' ? '' : parseFloat(val));
                        }}
                      />
                    </div>
                    <div className="col-span-1 flex items-center">
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(idx)}
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" /> Add Expense Item
                </Button>
                <div className="text-right font-medium pt-2">Total: R {totalAmount.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
};

export default EditRentalExpensePage;
