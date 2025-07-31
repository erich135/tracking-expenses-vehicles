// src/pages/costing/AddCosting.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

export default function AddCosting() {
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
    // Placeholder for saving logic (Supabase)
    console.log({
      jobNumber,
      invoiceNumber,
      jobDescription,
      customer,
      rep,
      cashCustomerName,
      customerItems,
      expenseItems,
      profit,
      margin,
    });

    setJobNumber('');
    setInvoiceNumber('');
    setJobDescription('');
    setCustomer('');
    setCashCustomerName('');
    setRep('');
    setCustomerItems([]);
    setExpenseItems([]);
    setShowDialog(false);
  };

  const addCustomerItem = () => {
    setCustomerItems([...customerItems, currentCustomerItem]);
    setCurrentCustomerItem({ part: '', quantity: 1, price: 0 });
  };

  const addExpenseItem = () => {
    setExpenseItems([...expenseItems, currentExpenseItem]);
    setCurrentExpenseItem({ part: '', quantity: 1, price: 0 });
  };

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="text-xl font-bold">Job Header</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Select onValueChange={setJobDescription}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Job Description" />
                </SelectTrigger>
                <SelectContent>
                  {jobOptions.map((j: any) => (
                    <SelectItem key={j.id} value={j.description}>{j.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Customer</Label>
              <Select onValueChange={setCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent>
                  {customerOptions.map((c: any) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {customer === 'Cash Sales' && (
              <div>
                <Label>Cash Customer Name</Label>
                <Input value={cashCustomerName} onChange={(e) => setCashCustomerName(e.target.value)} />
              </div>
            )}

            <div>
              <Label>Rep</Label>
              <Select onValueChange={setRep}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Rep" />
                </SelectTrigger>
                <SelectContent>
                  {repOptions.map((r: any) => (
                    <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Side Line Items */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="text-xl font-bold">Customer Side Line Items</h2>
          <div className="flex gap-2">
            <Input placeholder="Part" value={currentCustomerItem.part} onChange={(e) => setCurrentCustomerItem({ ...currentCustomerItem, part: e.target.value })} />
            <Input type="number" placeholder="Qty" value={currentCustomerItem.quantity} onChange={(e) => setCurrentCustomerItem({ ...currentCustomerItem, quantity: parseInt(e.target.value) })} />
            <Input type="number" placeholder="Price" value={currentCustomerItem.price} onChange={(e) => setCurrentCustomerItem({ ...currentCustomerItem, price: parseFloat(e.target.value) })} />
            <Button onClick={addCustomerItem}>Add</Button>
          </div>
          <div className="space-y-2">
            {customerItems.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.part} ({item.quantity} × R{item.price.toFixed(2)})</span>
                <span>R{(item.quantity * item.price).toFixed(2)}</span>
              </div>
            ))}
            <div className="text-right font-bold">Total: R{totalCustomer.toFixed(2)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Side Line Items */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="text-xl font-bold">Expenses Side Line Items</h2>
          <div className="flex gap-2">
            <Select onValueChange={handlePartSelect}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select Part" />
              </SelectTrigger>
              <SelectContent>
                {partOptions.map((p) => (
                  <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Qty" value={currentExpenseItem.quantity} onChange={(e) => setCurrentExpenseItem({ ...currentExpenseItem, quantity: parseInt(e.target.value) })} />
            <Input type="number" placeholder="Price" value={currentExpenseItem.price} readOnly />
            <Button onClick={addExpenseItem}>Add</Button>
          </div>
          <div className="space-y-2">
            {expenseItems.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.part} ({item.quantity} × R{item.price.toFixed(2)})</span>
                <span>R{(item.quantity * item.price).toFixed(2)}</span>
              </div>
            ))}
            <div className="text-right font-bold">Total: R{totalExpenses.toFixed(2)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button className="w-full">Submit</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Costing Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p><strong>Job:</strong> {jobNumber} | {jobDescription}</p>
            <p><strong>Customer:</strong> {customer === 'Cash Sales' ? `${customer} - ${cashCustomerName}` : customer} | <strong>Rep:</strong> {rep}</p>
            <hr />
            <h3 className="font-semibold">Customer Items</h3>
            {customerItems.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.part} ({item.quantity} × R{item.price.toFixed(2)})</span>
                <span>R{(item.quantity * item.price).toFixed(2)}</span>
              </div>
            ))}
            <h3 className="font-semibold">Expenses Items</h3>
            {expenseItems.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.part} ({item.quantity} × R{item.price.toFixed(2)})</span>
                <span>R{(item.quantity * item.price).toFixed(2)}</span>
              </div>
            ))}
            <hr />
            <p className="text-right font-bold">Profit: R{profit.toFixed(2)} | Margin: {margin.toFixed(1)}%</p>
          </div>
          <DialogFooter>
            <Button onClick={handleFinalSubmit}>Accept & Save</Button>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
