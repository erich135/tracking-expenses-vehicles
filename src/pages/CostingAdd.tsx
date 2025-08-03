import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Combobox } from '@/components/ui/Combobox';
import { supabase } from '@/lib/supabaseClient';

type CustomerLineItem = { part: string; quantity: number; price: number };
type ExpenseLineItem = { part: string; quantity: number; price: number };

export default function CostingAdd() {
  const navigate = useNavigate();

  const [jobOptions, setJobOptions] = useState<{ label: string; value: string }[]>([]);
  const [customerOptions, setCustomerOptions] = useState<{ label: string; value: string }[]>([]);
  const [repOptions, setRepOptions] = useState<{ label: string; value: string }[]>([]);
  const [partOptions, setPartOptions] = useState<{ label: string; value: string; price: number }[]>([]);
  const [partSearch, setPartSearch] = useState('');

  const [selectedJob, setSelectedJob] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedRep, setSelectedRep] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const [currentCustomerItem, setCurrentCustomerItem] = useState<CustomerLineItem>({ part: '', quantity: 0, price: 0 });
  const [currentExpenseItem, setCurrentExpenseItem] = useState<ExpenseLineItem>({ part: '', quantity: 0, price: 0 });

  const [customerItems, setCustomerItems] = useState<CustomerLineItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseLineItem[]>([]);

  const totalCustomer = customerItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const profit = totalCustomer - totalExpenses;

  useEffect(() => {
    const loadDropdowns = async () => {
      const [{ data: jobs }, { data: customers }, { data: reps }] = await Promise.all([
        supabase.from('job_descriptions').select('id, description'),
        supabase.from('customers').select('id, name'),
        supabase.from('reps').select('id, rep_code')
      ]);

      if (jobs) setJobOptions(jobs.map(j => ({ label: j.description, value: j.id })));
      if (customers) setCustomerOptions(customers.map(c => ({ label: c.name, value: c.id })));
      if (reps) setRepOptions(reps.map(r => ({ label: r.rep_code, value: r.id })));
    };

    loadDropdowns();
  }, []);

  useEffect(() => {
    const loadParts = async () => {
      const { data, error } = await supabase
        .from('parts')
        .select('id, name, price')
        .ilike('name', `%${partSearch}%`)
        .limit(50);

      if (data) {
        setPartOptions(data.map(p => ({
          label: p.name,
          value: p.name,
          price: p.price
        })));
      }
    };

    if (partSearch.length > 0) {
      loadParts();
    }
  }, [partSearch]);

  const handleAddCustomerItem = () => {
    if (currentCustomerItem.part && currentCustomerItem.quantity && currentCustomerItem.price) {
      setCustomerItems([...customerItems, currentCustomerItem]);
      setCurrentCustomerItem({ part: '', quantity: 0, price: 0 });
    }
  };

  const handleAddExpenseItem = () => {
    if (currentExpenseItem.part && currentExpenseItem.quantity && currentExpenseItem.price) {
      setExpenseItems([...expenseItems, currentExpenseItem]);
      setCurrentExpenseItem({ part: '', quantity: 0, price: 0 });
    }
  };

  const handleExpensePartChange = (val: string) => {
    const selected = partOptions.find(p => p.value === val);
    if (selected) {
      setCurrentExpenseItem({ ...currentExpenseItem, part: val, price: selected.price });
    }
  };

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-2xl font-bold">Add New Costing Entry</h2>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-4">
          <div>
            <Label>Job Number</Label>
            <Input value={jobNumber} onChange={e => setJobNumber(e.target.value)} />
          </div>

          <div>
            <Label>Invoice Number</Label>
            <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
          </div>

          <div>
            <Label>Job Description</Label>
            <Combobox
              options={jobOptions}
              value={selectedJob}
              onChange={setSelectedJob}
              placeholder="Type or select job..."
            />
          </div>

          <div>
            <Label>Customer</Label>
            <Combobox
              options={customerOptions}
              value={selectedCustomer}
              onChange={setSelectedCustomer}
              placeholder="Type or select customer..."
            />
          </div>

          <div>
            <Label>Rep</Label>
            <Combobox
              options={repOptions}
              value={selectedRep}
              onChange={setSelectedRep}
              placeholder="Type or select rep..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold text-lg mb-2">Customer Line Item</h3>
          <Label>Part</Label>
          <Input
            value={currentCustomerItem.part}
            onChange={(e) => setCurrentCustomerItem({ ...currentCustomerItem, part: e.target.value })}
            placeholder="Type part name"
          />
          <Label>Quantity</Label>
          <Input
            type="number"
            inputMode="decimal"
            step="1"
            value={currentCustomerItem.quantity}
            onChange={(e) => setCurrentCustomerItem({ ...currentCustomerItem, quantity: +e.target.value })}
          />
          <Label>Price (R)</Label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={currentCustomerItem.price}
            onChange={(e) => setCurrentCustomerItem({ ...currentCustomerItem, price: +e.target.value })}
          />
          <Button onClick={handleAddCustomerItem} className="mt-2">Add Customer Item</Button>
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-2">Expense Line Item</h3>
          <Label>Part</Label>
          <Combobox
            options={partOptions}
            value={currentExpenseItem.part}
            onChange={handleExpensePartChange}
            onInputChange={setPartSearch}
            placeholder="Type or select part..."
          />
          <div className="mt-2 text-xs text-muted">
            <strong>Debug PartOptions:</strong>
            <pre style={{ maxHeight: 200, overflow: 'auto' }}>
              {JSON.stringify(partOptions, null, 2)}
            </pre>
          </div>
          <Label>Quantity</Label>
          <Input
            type="number"
            inputMode="decimal"
            step="1"
            value={currentExpenseItem.quantity}
            onChange={(e) => setCurrentExpenseItem({ ...currentExpenseItem, quantity: +e.target.value })}
          />
          <Label>Price (R)</Label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={currentExpenseItem.price}
            disabled
          />
          <Button onClick={handleAddExpenseItem} className="mt-2">Add Expense Item</Button>
        </div>
      </div>

      <div className="mt-6">
        <p className="font-medium">Total Customer: R{totalCustomer.toFixed(2)}</p>
        <p className="font-medium">Total Expenses: R{totalExpenses.toFixed(2)}</p>
        <p className="font-bold">Profit: R{profit.toFixed(2)}</p>
      </div>
    </div>
  );
}
