// src/pages/CostingModule.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@headlessui/react';

// Types

type CustomerLineItem = {
  part: string;
  quantity: number;
  price: number;
};

type ExpenseLineItem = {
  part: string;
  quantity: number;
  price: number;
};

type Option = { id: number; name: string } | { id: number; description: string };

type CostingEntry = {
  jobNumber: string;
  invoiceNumber: string;
  jobDescription: string;
  customer: string;
  rep: string;
  customerItems: CustomerLineItem[];
  expenseItems: ExpenseLineItem[];
  profit: number;
  margin: number;
};

export default function CostingModule() {
  // State
  const [cashCustomerName, setCashCustomerName] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [customer, setCustomer] = useState('');
  const [rep, setRep] = useState('');
  const [jobOptions, setJobOptions] = useState<Option[]>([]);
  const [customerOptions, setCustomerOptions] = useState<Option[]>([]);
  const [repOptions, setRepOptions] = useState<Option[]>([]);
  const [partOptions, setPartOptions] = useState<{ id: number; name: string; price: number }[]>([]);

  const [customerItems, setCustomerItems] = useState<CustomerLineItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseLineItem[]>([]);
  const [currentCustomerItem, setCurrentCustomerItem] = useState<CustomerLineItem>({ part: '', quantity: 1, price: 0 });
  const [currentExpenseItem, setCurrentExpenseItem] = useState<ExpenseLineItem>({ part: '', quantity: 1, price: 0 });

  const [costingEntries, setCostingEntries] = useState<CostingEntry[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const totalCustomer = customerItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
  const totalExpenses = expenseItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
  const profit = totalCustomer - totalExpenses;
  const margin = totalCustomer > 0 ? (profit / totalCustomer) * 100 : 0;

  useEffect(() => {
    const loadDropdowns = async () => {
      const [{ data: jobs }, { data: customers }, { data: reps }, { data: parts }] = await Promise.all([
        supabase.from('job_descriptions').select('id, description'),
        supabase.from('customers').select('id, name'),
        supabase.from('reps').select('id, name'),
        supabase.from('parts').select('id, name, price')
      ]);
      if (jobs) setJobOptions(jobs);
      if (customers) setCustomerOptions(customers);
      if (reps) setRepOptions(reps);
      if (parts) setPartOptions(parts);
    };
    loadDropdowns();
  }, []);

  const handlePartSelect = (selectedPart: string | null) => {
    if (!selectedPart) return;
    const part = partOptions.find((p) => p.name === selectedPart);
    if (part) {
      setCurrentExpenseItem({ ...currentExpenseItem, part: selectedPart, price: part.price });
    }
  };

  const handleFinalSubmit = () => {
    const entry: CostingEntry = {
      jobNumber,
      invoiceNumber,
      jobDescription,
      customer,
      rep,
      customerItems,
      expenseItems,
      profit,
      margin,
    };

    if (editingIndex !== null) {
      const updated = [...costingEntries];
      updated[editingIndex] = entry;
      setCostingEntries(updated);
    } else {
      setCostingEntries([...costingEntries, entry]);
    }

    setJobNumber('');
    setInvoiceNumber('');
    setJobDescription('');
    setCustomer('');
    setRep('');
    setCashCustomerName('');
    setCustomerItems([]);
    setExpenseItems([]);
    setEditingIndex(null);
    setShowDialog(false);
  };

  const editEntry = (index: number) => {
    const entry = costingEntries[index];
    setJobNumber(entry.jobNumber);
    setInvoiceNumber(entry.invoiceNumber);
    setJobDescription(entry.jobDescription);
    setCustomer(entry.customer);
    setRep(entry.rep);
    setCustomerItems(entry.customerItems);
    setExpenseItems(entry.expenseItems);
    setEditingIndex(index);
  };

  const deleteEntry = (index: number) => {
    const updated = [...costingEntries];
    updated.splice(index, 1);
    setCostingEntries(updated);
  };

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="text-xl font-bold">Saved Costing Entries</h2>
          {costingEntries.length === 0 && <p className="text-gray-500">No entries yet.</p>}
          {costingEntries.map((entry, idx) => (
            <div key={idx} className="border p-2 rounded flex justify-between items-center">
              <div>
                <p><strong>{entry.jobNumber}</strong> | {entry.jobDescription}</p>
                <p>{entry.customer} ({entry.rep}) - Profit: R{entry.profit.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => editEntry(idx)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => deleteEntry(idx)}>Delete</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
