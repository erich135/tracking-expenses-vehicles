import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function EditRentalIncomePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [reps, setReps] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [machines, setMachines] = useState([]);

  const [form, setForm] = useState({
    rep_code: '',
    customer_id: '',
    account_number: '',
    rental_equipment_id: '',
    invoice_number: '',
    date: '',
    amount: '',
    notes: '',
  });

  // Load options + existing row
  useEffect(() => {
    (async () => {
      // options
      const [repsRes, custRes, machRes] = await Promise.all([
        supabase.from('reps').select('rep_code').order('rep_code'),
        supabase.from('customers').select('id, name').order('name'),
        supabase.from('rental_equipment').select('id, plant_no').order('plant_no'),
      ]);
      if (repsRes.error) toast({ variant: 'destructive', title: 'Failed to load reps', description: repsRes.error.message });
      if (custRes.error) toast({ variant: 'destructive', title: 'Failed to load customers', description: custRes.error.message });
      if (machRes.error) toast({ variant: 'destructive', title: 'Failed to load machines', description: machRes.error.message });
      setReps(repsRes.data || []);
      setCustomers(custRes.data || []);
      setMachines(machRes.data || []);

      // existing row
      const { data, error } = await supabase
        .from('rental_incomes')
        .select('rep_code, customer_id, account_number, rental_equipment_id, invoice_number, date, amount, notes')
        .eq('id', id)
        .single();

      if (error) {
        toast({ variant: 'destructive', title: 'Failed to load entry', description: error.message });
        return;
      }

      setForm({
        rep_code: data?.rep_code || '',
        customer_id: data?.customer_id ?? '',
        account_number: data?.account_number || '',
        rental_equipment_id: data?.rental_equipment_id ?? '',
        invoice_number: data?.invoice_number || '',
        date: (data?.date || '').split('T')[0],
        amount: data?.amount != null ? String(data.amount) : '',
        notes: data?.notes || '',
      });
    })();
  }, [id, toast]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      rep_code: form.rep_code || null,
      customer_id: form.customer_id ? Number(form.customer_id) : null,
      account_number: form.account_number || null,
      rental_equipment_id: form.rental_equipment_id ? Number(form.rental_equipment_id) : null,
      invoice_number: form.invoice_number || null,
      date: form.date || null,
      amount: form.amount ? Number(form.amount) : null,
      notes: form.notes || null,
    };

    const { error } = await supabase.from('rental_incomes').update(payload).eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
      return;
    }
    toast({ title: 'Saved' });
    navigate('/rental/income/view');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Rental Income</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Rep Code */}
          <div className="space-y-2">
            <Label>Rep Code</Label>
            <select
              className="w-full border rounded px-3 py-2"
              name="rep_code"
              value={form.rep_code}
              onChange={onChange}
            >
              <option value="">Select a rep...</option>
              {reps.map((r) => (
                <option key={r.rep_code} value={r.rep_code}>{r.rep_code}</option>
              ))}
            </select>
          </div>

          {/* Customer */}
          <div className="space-y-2">
            <Label>Customer</Label>
            <select
              className="w-full border rounded px-3 py-2"
              name="customer_id"
              value={form.customer_id}
              onChange={onChange}
            >
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Account Number */}
          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input
              name="account_number"
              value={form.account_number}
              onChange={onChange}
              placeholder="Enter account number"
            />
          </div>

          {/* Rental Machine (single) */}
          <div className="space-y-2">
            <Label>Rental Machine</Label>
            <select
              className="w-full border rounded px-3 py-2"
              name="rental_equipment_id"
              value={form.rental_equipment_id}
              onChange={onChange}
            >
              <option value="">Select a machine...</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.plant_no}</option>
              ))}
            </select>
          </div>

          {/* Invoice */}
          <div className="space-y-2">
            <Label>Invoice</Label>
            <Input name="invoice_number" value={form.invoice_number} onChange={onChange} />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" name="date" value={form.date} onChange={onChange} />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount (R)</Label>
            <Input type="number" step="0.01" name="amount" value={form.amount} onChange={onChange} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm"
              name="notes"
              value={form.notes}
              onChange={onChange}
              placeholder="Add any relevant notes..."
            />
          </div>

          <Button type="submit">Save</Button>
        </form>
      </CardContent>
    </Card>
  );
}
