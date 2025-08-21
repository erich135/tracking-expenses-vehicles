import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function AddRentalIncomePage() {
  const { toast } = useToast();

  // dropdown data
  const [reps, setReps] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [equipment, setEquipment] = useState([]);

  // form fields
  const [repCode, setRepCode] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // machine search + selection (multi)
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [selectedMachines, setSelectedMachines] = useState([]); // [{id, plant_no}]

  // load dropdown options
  useEffect(() => {
    (async () => {
      const [repsRes, custRes, equipRes] = await Promise.all([
        supabase.from('reps').select('rep_code').order('rep_code'),
        supabase.from('customers').select('id, name').order('name'),
        supabase.from('rental_equipment').select('id, plant_no').order('plant_no'),
      ]);

      if (repsRes.error) toast({ variant: 'destructive', title: 'Error loading reps', description: repsRes.error.message });
      if (custRes.error) toast({ variant: 'destructive', title: 'Error loading customers', description: custRes.error.message });
      if (equipRes.error) toast({ variant: 'destructive', title: 'Error loading machines', description: equipRes.error.message });

      setReps(repsRes.data || []);
      setCustomers(custRes.data || []);
      setEquipment(equipRes.data || []);
    })();
  }, [toast]);

  // filter machines by query
  useEffect(() => {
    if (!query) { setFiltered([]); return; }
    const q = query.toLowerCase();
    setFiltered(
      equipment
        .filter(m => (m.plant_no || '').toLowerCase().includes(q))
        .filter(m => !selectedMachines.some(s => s.id === m.id))
    );
  }, [query, equipment, selectedMachines]);

  const handleSelectMachine = (m) => {
    setSelectedMachines(prev => [...prev, m]);
    setQuery('');
    setFiltered([]);
  };

  const handleRemoveMachine = (id) => {
    setSelectedMachines(prev => prev.filter(m => m.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedMachines.length) {
      toast({ variant: 'destructive', title: 'Please select at least one machine' });
      return;
    }

    const total = Number(amount);
    if (!Number.isFinite(total) || total <= 0) {
      toast({ variant: 'destructive', title: 'Enter a valid income amount' });
      return;
    }

    const share = total / selectedMachines.length;
    const isoDate = date ? new Date(date).toISOString() : new Date().toISOString();

    const rows = selectedMachines.map(m => ({
      rental_equipment_id: m.id,
      rep_code: repCode || null,
      customer_id: customerId ? Number(customerId) : null,
      account_number: accountNumber || null,
      invoice_number: invoiceNumber || null,
      date: isoDate,
      amount: share,
      notes: notes || null,
    }));

    const { error } = await supabase.from('rental_incomes').insert(rows);

    if (error) {
      toast({ variant: 'destructive', title: 'Error saving rental income', description: error.message });
    } else {
      toast({ title: 'Success', description: 'Rental income saved for selected machines.' });
      // reset (keep rep/customer/account as convenience)
      setSelectedMachines([]);
      setAmount('');
      setInvoiceNumber('');
      setNotes('');
      setQuery('');
      setFiltered([]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Rental Income</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top row: machine + customer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Machine search & select (multi) */}
            <div className="space-y-2">
              <Label>Machine</Label>
              <Input
                placeholder="Type to search machines…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {filtered.length > 0 && (
                <ul className="border mt-1 rounded-md max-h-40 overflow-y-auto">
                  {filtered.map((m) => (
                    <li
                      key={m.id}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleSelectMachine(m)}
                    >
                      {m.plant_no}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedMachines.map((m) => (
                  <div key={m.id} className="bg-gray-200 px-3 py-1 rounded-md flex items-center gap-2">
                    {m.plant_no}
                    <button
                      type="button"
                      className="text-red-500"
                      onClick={() => handleRemoveMachine(m.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer */}
            <div className="space-y-2">
              <Label>Customer</Label>
              <select
                className="w-full border rounded px-3 py-2"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Select a customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rep + Account */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rep Code</Label>
              <select
                className="w-full border rounded px-3 py-2"
                value={repCode}
                onChange={(e) => setRepCode(e.target.value)}
              >
                <option value="">Select a rep…</option>
                {reps.map((r) => (
                  <option key={r.rep_code} value={r.rep_code}>{r.rep_code}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input
                placeholder="Enter account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Invoice */}
          <div className="space-y-2">
            <Label>Invoice</Label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-12345"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount (R)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 10000"
            />
            {selectedMachines.length > 0 && amount && Number(amount) > 0 && (
              <p className="text-sm text-gray-500">
                Each machine will receive: <strong>R {(Number(amount) / selectedMachines.length).toFixed(2)}</strong>
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant notes…"
            />
          </div>

          <Button type="submit">Save</Button>
        </form>
      </CardContent>
    </Card>
  );
}
