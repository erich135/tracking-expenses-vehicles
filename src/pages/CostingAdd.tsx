// src/pages/CostingAdd.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

type CustomerLineItem = { part: string; quantity: number; price: number };
type ExpenseLineItem = { part: string; quantity: number; price: number };
type Option = { id: number; name: string } | { id: number; description: string };

export default function CostingAdd() {
  const navigate = useNavigate();
  const [jobNumber, setJobNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [customer, setCustomer] = useState('');
  const [rep, setRep] = useState('');
  const [cashCustomerName, setCashCustomerName] = useState('');
  const [customerItems, setCustomerItems] = useState<CustomerLineItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseLineItem[]>([]);
  const [currentCustomerItem, setCurrentCustomerItem] = useState<CustomerLineItem>({ part: '', quantity: 1, price: 0 });
  const [currentExpenseItem, setCurrentExpenseItem] = useState<ExpenseLineItem>({ part: '', quantity: 1, price: 0 });

  const [jobOptions, setJobOptions] = useState<Option[]>([]);
  const [customerOptions, setCustomerOptions] = useState<Option[]>([]);
  const [repOptions, setRepOptions] = useState<Option[]>([]);
  const [partOptions, setPartOptions] = useState<{ id: number; name: string; price: number }[]>([]);

  useEffect(() => {
    const loadDropdowns = async () => {
      const [{ data: jobs }, { data: customers }, { data: reps }, { data: parts }] = await Promise.all([
        supabase.from('job_descriptions').select('id, description'),
        supabase.from('customers').select('id, name'),
        supabase.from('reps').select('id, name'),
        supabase.from('parts').select('id, name, price'),
      ]);
      if (jobs) setJobOptions(jobs);
      if (customers) setCustomerOptions(customers);
      if (reps) setRepOptions(reps);
      if (parts) setPartOptions(parts);
    };
    loadDropdowns();
  }, []);

  const totalCustomer = customerItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const profit = totalCustomer - totalExpenses;
  const margin = totalCustomer > 0 ? (profit / totalCustomer) * 100 : 0;

  const handleAddCustomerItem = () => {
    setCustomerItems([...customerItems, currentCustomerItem]);
    setCurrentCustomerItem({ part: '', quantity: 1, price: 0 });
  };

  const handleAddExpenseItem = () => {
    const part = partOptions.find((p) => p.name === currentExpenseItem.part);
    if (part) {
      setExpenseItems([...expenseItems, { ...currentExpenseItem, price: part.price }]);
      setCurrentExpenseItem({ part: '', quantity: 1, price: 0 });
    }
  };

  const handleSubmit = async () => {
    const { error } = await supabase.from('costing_entries').insert([
      {
        job_number: jobNumber,
        invoice_number: invoiceNumber,
        job_description: jobDescription,
        customer,
        rep,
        customer_items: customerItems,
        expense_items: expenseItems,
        profit,
        margin,
      },
    ]);

    if (error) {
      alert('❌ Failed to save entry: ' + error.message);
    } else {
      alert('✅ Entry saved successfully!');
      resetForm();
      navigate('/costing/list');
    }
  };

  const resetForm = () => {
    setJobNumber('');
    setInvoiceNumber('');
    setJobDescription('');
    setCustomer('');
    setRep('');
    setCustomerItems([]);
    setExpenseItems([]);
    setCurrentCustomerItem({ part: '', quantity: 1, price: 0 });
    setCurrentExpenseItem({ part: '', quantity: 1, price: 0 });
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="text-xl font-bold">Add New Costing Entry</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Job Number</Label>
              <Input value={jobNumber} onChange={(e) => setJobNumber(e.target.value)} />
            </div>
            <div>
              <Label>Invoice Number</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
            <div>
              <Label>Job Description</Label>
              <Select onValueChange={setJobDescription} value={jobDescription}>
                <SelectTrigger><SelectValue placeholder="Select job..." /></SelectTrigger>
                <SelectContent>
                  {jobOptions.map((j: any) => (
                    <SelectItem key={j.id} value={j.description}>{j.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Customer</Label>
              <Select onValueChange={setCustomer} value={customer}>
                <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                <SelectContent>
                  {customerOptions.map((c: any) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customer === 'Cash Sales' && (
                <>
                  <Label>Cash Customer Name</Label>
                  <Input value={cashCustomerName} onChange={(e) => setCashCustomerName(e.target.value)} />
                </>
              )}
            </div>
            <div>
              <Label>Rep</Label>
              <Select onValueChange={setRep} value={rep}>
                <SelectTrigger><SelectValue placeholder="Select rep..." /></SelectTrigger>
                <SelectContent>
                  {repOptions.map((r: any) => (
                    <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Customer Line Item</Label>
              <Input placeholder="Part" value={currentCustomerItem.part} onChange={(e) => setCurrentCustomerItem({ ...currentCustomerItem, part: e.target.value })} />
              <Input type="number" placeholder="Qty" value={currentCustomerItem.quantity} onChange={(e) => setCurrentCustomerItem({ ...currentCustomerItem, quantity: +e.target.value })} />
              <Input type="number" placeholder="Price" value={currentCustomerItem.price} onChange={(e) => setCurrentCustomerItem({ ...currentCustomerItem, price: +e.target.value })} />
              <Button onClick={handleAddCustomerItem}>Add Customer Item</Button>
            </div>

            <div>
              <Label>Expense Line Item</Label>
              <Select onValueChange={(val) => setCurrentExpenseItem({ ...currentExpenseItem, part: val })}>
                <SelectTrigger><SelectValue placeholder="Select part..." /></SelectTrigger>
                <SelectContent>
                  {partOptions.map((p) => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Qty" value={currentExpenseItem.quantity} onChange={(e) => setCurrentExpenseItem({ ...currentExpenseItem, quantity: +e.target.value })} />
              <Button onClick={handleAddExpenseItem}>Add Expense Item</Button>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-semibold">Profit: R{profit.toFixed(2)} | Margin: {margin.toFixed(1)}%</h3>
            <Button className="mt-2" onClick={handleSubmit}>Save Costing Entry</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
