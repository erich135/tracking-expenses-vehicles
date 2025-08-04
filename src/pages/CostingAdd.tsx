// (same imports as before)
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

  const [previewMode, setPreviewMode] = useState(false);

  const totalCustomer = customerItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const profit = totalCustomer - totalExpenses;
  const margin = totalCustomer === 0 ? 0 : (profit / totalCustomer) * 100;

  useEffect(() => {
    const loadDropdowns = async () => {
      const [{ data: jobs }, { data: customers }, { data: reps }] = await Promise.all([
        supabase.from('job_descriptions').select('description, description'),
        supabase.from('customers').select('name, name'),
        supabase.from('reps').select('rep_code, rep_name')
      ]);

      if (jobs) setJobOptions(jobs.map(j => ({ label: j.description, value: j.description })));
      if (customers) setCustomerOptions(customers.map(c => ({ label: c.name, value: c.name })));
      if (reps) setRepOptions(reps.map(r => ({ label: r.rep_code, value: r.rep_code })));
    };

    loadDropdowns();
  }, []);

  useEffect(() => {
    const loadParts = async () => {
      const { data } = await supabase
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

const handleSave = async () => {
  const { error } = await supabase
    .from('costing_entries')
    .insert({
      job_number: jobNumber,
      invoice_number: invoiceNumber,
      job_description: selectedJob,
      customer: selectedCustomer,
      rep: selectedRep,
      customer_items: customerItems,
      expense_items: expenseItems,
      total_customer: totalCustomer,
      total_expenses: totalExpenses,
      profit,
      margin,
      costing_quantity: expenseItems[0]?.quantity || 0,
      costing_unit_price: expenseItems[0]?.price || 0,
      costing_total: totalExpenses
    });

  if (error) {
    console.error('Supabase insert error:', error.message, error.details);
    alert(`Error saving entry:\n${error.message}`);
  } else {
    navigate('/costing/list');
  }
};

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-2xl font-bold">Add New Costing Entry</h2>

      {!previewMode ? (
        <>
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
                <Combobox options={jobOptions} value={selectedJob} onChange={setSelectedJob} placeholder="Job..." />
              </div>

              <div>
                <Label>Customer</Label>
                <Combobox options={customerOptions} value={selectedCustomer} onChange={setSelectedCustomer} placeholder="Customer..." />
              </div>

              <div>
                <Label>Rep</Label>
                <Combobox options={repOptions} value={selectedRep} onChange={setSelectedRep} placeholder="Rep..." />
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
              />
              <Label>Quantity</Label>
              <Input
                type="number"
                value={currentCustomerItem.quantity}
                onChange={(e) => setCurrentCustomerItem({ ...currentCustomerItem, quantity: +e.target.value })}
              />
              <Label>Price (R)</Label>
              <Input
                type="number"
                value={currentCustomerItem.price}
                onChange={(e) => setCurrentCustomerItem({ ...currentCustomerItem, price: +e.target.value })}
              />
              <Button className="mt-2" onClick={handleAddCustomerItem}>Add Customer Item</Button>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Expense Line Item</h3>
              <Label>Part</Label>
              <Combobox
                options={partOptions}
                value={currentExpenseItem.part}
                onChange={handleExpensePartChange}
                onInputChange={setPartSearch}
                placeholder="Type part..."
              />
              <Label>Quantity</Label>
              <Input
                type="number"
                value={currentExpenseItem.quantity}
                onChange={(e) => setCurrentExpenseItem({ ...currentExpenseItem, quantity: +e.target.value })}
              />
              <Label>Price (R)</Label>
              <Input type="number" value={currentExpenseItem.price} disabled />
              <Button className="mt-2" onClick={handleAddExpenseItem}>Add Expense Item</Button>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <p>Total Customer: R{totalCustomer.toFixed(2)}</p>
            <p>Total Expenses: R{totalExpenses.toFixed(2)}</p>
            <p><strong>Profit:</strong> R{profit.toFixed(2)} <strong>(Margin: {margin.toFixed(2)}%)</strong></p>
            <Button className="mt-4" onClick={() => setPreviewMode(true)}>Submit</Button>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h3 className="text-xl font-bold">Review Transaction</h3>
            <p><strong>Job #:</strong> {jobNumber}</p>
            <p><strong>Invoice:</strong> {invoiceNumber}</p>
            <p><strong>Customer:</strong> {selectedCustomer}</p>
            <p><strong>Rep:</strong> {selectedRep}</p>
            <p><strong>Total Customer:</strong> R{totalCustomer.toFixed(2)}</p>
            <p><strong>Total Expenses:</strong> R{totalExpenses.toFixed(2)}</p>
            <p><strong>Profit:</strong> R{profit.toFixed(2)}</p>
            <p><strong>Margin:</strong> {margin.toFixed(2)}%</p>

            <div className="flex gap-4 mt-4">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => setPreviewMode(false)}>Edit</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
