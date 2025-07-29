// src/pages/CostingModule.tsx

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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

export default function CostingModule() {
  const [jobNumber, setJobNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [customer, setCustomer] = useState('');
  const [rep, setRep] = useState('');

  const [customerItems, setCustomerItems] = useState<CustomerLineItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseLineItem[]>([]);

  const [currentCustomerItem, setCurrentCustomerItem] = useState<CustomerLineItem>({ part: '', quantity: 1, price: 0 });
  const [currentExpenseItem, setCurrentExpenseItem] = useState<ExpenseLineItem>({ part: '', quantity: 1, price: 0 });

  const [showDialog, setShowDialog] = useState(false);

  const addCustomerItem = () => {
    setCustomerItems([...customerItems, currentCustomerItem]);
    setCurrentCustomerItem({ part: '', quantity: 1, price: 0 });
  };

  const addExpenseItem = () => {
    setExpenseItems([...expenseItems, currentExpenseItem]);
    setCurrentExpenseItem({ part: '', quantity: 1, price: 0 });
  };

  const totalCustomer = customerItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
  const totalExpenses = expenseItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
  const profit = totalCustomer - totalExpenses;
  const margin = totalCustomer > 0 ? (profit / totalCustomer) * 100 : 0;

  const handleFinalSubmit = () => {
    // TODO: Save to Supabase or desired backend
    console.log('Saving job:', {
      jobNumber,
      invoiceNumber,
      jobDescription,
      customer,
      rep,
      customerItems,
      expenseItems,
      profit,
      margin,
    });

    // Reset form
    setJobNumber('');
    setInvoiceNumber('');
    setJobDescription('');
    setCustomer('');
    setRep('');
    setCustomerItems([]);
    setExpenseItems([]);
    setShowDialog(false);
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
              <Input value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
            </div>
            <div>
              <Label>Customer</Label>
              <Input value={customer} onChange={(e) => setCustomer(e.target.value)} />
            </div>
            <div>
              <Label>Rep</Label>
              <Input value={rep} onChange={(e) => setRep(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="text-xl font-bold">Customer Side Line Items</h2>
          <div className="flex gap-2">
            <Input placeholder="Part" value={currentCustomerItem.part} onChange={(e) => setCurrentCustomerItem({ ...currentCustomerItem, part: e.target.value })} />
            <Input type="number" placeholder="Quantity" value={currentCustomerItem.quantity} onChange={(e) => setCurrentCustomerItem({ ...currentCustomerItem, quantity: parseInt(e.target.value) })} />
            <Input type="number" placeholder="Price" value={currentCustomerItem.price} onChange={(e) => setCurrentCustomerItem({ ...currentCustomerItem, price: parseFloat(e.target.value) })} />
            <Button onClick={addCustomerItem}>Add</Button>
          </div>

          {customerItems.length > 0 && (
            <div className="space-y-2">
              {customerItems.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.part} ({item.quantity} × R{item.price.toFixed(2)})</span>
                  <span>R{(item.quantity * item.price).toFixed(2)}</span>
                </div>
              ))}
              <div className="text-right font-bold">Total: R{totalCustomer.toFixed(2)}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="text-xl font-bold">Expenses Side Line Items</h2>
          <div className="flex gap-2">
            <Input placeholder="Part" value={currentExpenseItem.part} onChange={(e) => setCurrentExpenseItem({ ...currentExpenseItem, part: e.target.value })} />
            <Input type="number" placeholder="Quantity" value={currentExpenseItem.quantity} onChange={(e) => setCurrentExpenseItem({ ...currentExpenseItem, quantity: parseInt(e.target.value) })} />
            <Input type="number" placeholder="Price" value={currentExpenseItem.price} onChange={(e) => setCurrentExpenseItem({ ...currentExpenseItem, price: parseFloat(e.target.value) })} />
            <Button onClick={addExpenseItem}>Add</Button>
          </div>

          {expenseItems.length > 0 && (
            <div className="space-y-2">
              {expenseItems.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.part} ({item.quantity} × R{item.price.toFixed(2)})</span>
                  <span>R{(item.quantity * item.price).toFixed(2)}</span>
                </div>
              ))}
              <div className="text-right font-bold">Total: R{totalExpenses.toFixed(2)}</div>
            </div>
          )}
        </CardContent>
      </Card>

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
            <p><strong>Customer:</strong> {customer} | <strong>Rep:</strong> {rep}</p>
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
          <DialogFooter className="mt-4">
            <Button onClick={handleFinalSubmit}>Accept & Save</Button>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
