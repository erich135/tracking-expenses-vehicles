// src/pages/costing/CostingList.tsx

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

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

export default function CostingList() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<CostingEntry[]>([]);

  useEffect(() => {
    // Mock data for now
    const mock: CostingEntry[] = [
      {
        jobNumber: 'JN001',
        invoiceNumber: 'INV1001',
        jobDescription: 'Service A',
        customer: 'Customer 1',
        rep: 'Rep A',
        customerItems: [{ part: 'Item X', quantity: 2, price: 100 }],
        expenseItems: [{ part: 'Brake Pad', quantity: 1, price: 60 }],
        profit: 140,
        margin: 58.33,
      },
      {
        jobNumber: 'JN002',
        invoiceNumber: 'INV1002',
        jobDescription: 'Repair B',
        customer: 'Cash Sales',
        rep: 'Rep B',
        customerItems: [{ part: 'Item Z', quantity: 1, price: 500 }],
        expenseItems: [{ part: 'Filter', quantity: 1, price: 100 }],
        profit: 400,
        margin: 80,
      },
    ];
    setEntries(mock);
  }, []);

  const deleteEntry = (index: number) => {
    const updated = [...entries];
    updated.splice(index, 1);
    setEntries(updated);
  };

  const editEntry = (index: number) => {
    const entry = entries[index];
    localStorage.setItem('editingEntry', JSON.stringify(entry));
    navigate('/costing/add');
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">View Costing Transactions</h1>

      <Card>
        <CardContent className="p-4 space-y-4">
          {entries.length === 0 ? (
            <p className="text-gray-500">No entries found.</p>
          ) : (
            entries.map((entry, idx) => (
              <div key={idx} className="border p-3 rounded flex justify-between items-center">
                <div>
                  <p className="font-semibold">{entry.jobNumber} | {entry.jobDescription}</p>
                  <p>{entry.customer} ({entry.rep})</p>
                  <p>Profit: R{entry.profit.toFixed(2)} | Margin: {entry.margin.toFixed(1)}%</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => editEntry(idx)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteEntry(idx)}>Delete</Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
