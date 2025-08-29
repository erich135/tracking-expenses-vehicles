import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Autocomplete } from '@/components/ui/autocomplete';
import ConfirmationModal from '@/components/ConfirmationModal';
import { supabase } from '@/lib/customSupabaseClient';

const normalizeDateYYYYMMDD = (d) => {
  if (!d) return '';
  try {
    // Handle Date object or string (date/timestamp)
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return String(d).slice(0, 10);
    return dt.toISOString().slice(0, 10);
  } catch {
    return String(d).slice(0, 10);
  }
};

const AddCostingPage = ({ isEditMode = false, costingData, onSuccess }) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [jobDetails, setJobDetails] = useState({
    jobNumber: '',
    invoiceNumber: '',
    jobDescription: null,
    customer: null,
    rep: null,
    date: '', // <-- keep date as "YYYY-MM-DD"
  });

  const [customerItems, setCustomerItems] = useState([
    { id: Date.now(), part: '', quantity: 1, price: 0 },
  ]);
  const [expenseItems, setExpenseItems] = useState([
    { id: Date.now(), part: null, quantity: 1, price: 0 },
  ]);

  const [totals, setTotals] = useState({
    customer: 0,
    expenses: 0,
    profit: 0,
    margin: 0,
  });

  const [isConfirming, setIsConfirming] = useState(false);

  const resetForm = useCallback(() => {
    setJobDetails({
      jobNumber: '',
      invoiceNumber: '',
      jobDescription: null,
      customer: null,
      rep: null,
      date: '', // <-- reset date too
    });
    setCustomerItems([{ id: Date.now(), part: '', quantity: 1, price: 0 }]);
    setExpenseItems([{ id: Date.now(), part: null, quantity: 1, price: 0 }]);
  }, []);

  // Load data when editing
  useEffect(() => {
    if (isEditMode && costingData) {
      setJobDetails({
        jobNumber: costingData.job_number || '',
        invoiceNumber: costingData.invoice_number || '',
        jobDescription: costingData.job_description
          ? { description: costingData.job_description }
          : null,
        customer: costingData.customer ? { name: costingData.customer } : null,
        rep: costingData.rep ? { rep_name: costingData.rep } : null,
        date: normalizeDateYYYYMMDD(costingData.date), // <-- load date
      });
      setCustomerItems(
        costingData.customer_items || [{ id: Date.now(), part: '', quantity: 1, price: 0 }]
      );
      setExpenseItems(
        costingData.expense_items || [{ id: Date.now(), part: null, quantity: 1, price: 0 }]
      );
    }
  }, [isEditMode, costingData]);

  const handleJobDetailChange = (field, value) => {
    setJobDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (type, index, field, value) => {
    const setItems = type === 'customer' ? setCustomerItems : setExpenseItems;
    setItems((prevItems) => {
      const newItems = [...prevItems];
      newItems[index][field] = value;
      return newItems;
    });
  };

  const handleExpensePartChange = (index, value) => {
    setExpenseItems((prevItems) => {
      const newItems = [...prevItems];
      newItems[index].part = value;
      if (value && value.price) {
        newItems[index].price = value.price;
      }
      return newItems;
    });
  };

  const addItem = (type) => {
    const setItems = type === 'customer' ? setCustomerItems : setExpenseItems;
    const newItem =
      type === 'customer'
        ? { id: Date.now(), part: '', quantity: 1, price: 0 }
        : { id: Date.now(), part: null, quantity: 1, price: 0 };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (type, index) => {
    const setItems = type === 'customer' ? setCustomerItems : setExpenseItems;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateTotals = useCallback(() => {
    const totalCustomer = customerItems.reduce(
      (acc, item) => acc + Number(item.quantity) * Number(item.price),
      0
    );
    const totalExpenses = expenseItems.reduce(
      (acc, item) => acc + Number(item.quantity) * Number(item.price),
      0
    );
    const profit = totalCustomer - totalExpenses;
    const margin = totalCustomer > 0 ? (profit / totalCustomer) * 100 : 0;

    setTotals({
      customer: totalCustomer,
      expenses: totalExpenses,
      profit,
      margin,
    });
  }, [customerItems, expenseItems]);

  useEffect(() => {
    calculateTotals();
  }, [customerItems, expenseItems, calculateTotals]);

  const handleInitiateSubmit = () => {
    setIsConfirming(true);
  };
  const handleConfirmSubmit = async () => {
    const entry = {
      job_number: jobDetails.jobNumber || null,
      invoice_number: jobDetails.invoiceNumber || null,
      job_description: jobDetails.jobDescription?.description || null,
      customer: jobDetails.customer?.name || null,
      rep: jobDetails.rep?.rep_name || null,
      date: jobDetails.date || null, // <-- save date to DB (DATE column)
      customer_items: customerItems,
      expense_items: expenseItems,
      total_customer: totals.customer,
      total_expenses: totals.expenses,
      profit: totals.profit,
      margin: totals.margin,
    };

    let error;
    if (isEditMode) {
      ({ error } = await supabase
        .from('costing_entries')
        .update(entry)
        .eq('id', costingData.id));
    } else {
      ({ error } = await supabase.from('costing_entries').insert([entry]));
    }

    if (error) {
      toast({
        variant: 'destructive',
        title: `Error ${isEditMode ? 'updating' : 'saving'} entry`,
        description: error.message,
      });
    } else {
      toast({
        title: 'Success!',
        description: `Costing entry ${isEditMode ? 'updated' : 'saved'} successfully.`,
      });
      if (isEditMode) {
        onSuccess?.();
      } else {
        resetForm();
        navigate('/costing/view');
      }
    }
    setIsConfirming(false);
  };

  const fetcher = async (table, searchColumn, searchTerm) => {
    const { data, error } = await supabase
      .from(table)
      .select(`*`)
      .ilike(searchColumn, `%${searchTerm}%`)
      .limit(10);
    if (error) {
      toast({
        variant: 'destructive',
        title: `Error fetching ${table}`,
        description: error.message,
      });
      return [];
    }
    return data;
  };

  return (
    <>
      <div className="space-y-6 overflow-y-auto max-h-screen px-4">
        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? `Editing Costing Entry` : 'Job Details'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="job-number">Job Number</Label>
                <Input
                  id="job-number"
                  placeholder="Enter job number"
                  value={jobDetails.jobNumber}
                  onChange={(e) => handleJobDetailChange('jobNumber', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice-number">Invoice Number</Label>
                <Input
                  id="invoice-number"
                  placeholder="Enter invoice number"
                  value={jobDetails.invoiceNumber}
                  onChange={(e) => handleJobDetailChange('invoiceNumber', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Job Description</Label>
                <Autocomplete
                  value={jobDetails.jobDescription}
                  onChange={(value) => handleJobDetailChange('jobDescription', value)}
                  fetcher={(searchTerm) => fetcher('job_descriptions', 'description', searchTerm)}
                  displayField="description"
                  placeholder="Type to search job descriptions..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={jobDetails.date}
                  onChange={(e) => handleJobDetailChange('date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Customer</Label>
                <Autocomplete
                  value={jobDetails.customer}
                  onChange={(value) => handleJobDetailChange('customer', value)}
                  fetcher={(searchTerm) => fetcher('customers', 'name', searchTerm)}
                  displayField="name"
                  placeholder="Type to search customers..."
                />
              </div>

              <div className="space-y-2">
                <Label>Rep</Label>
                <Autocomplete
                  value={jobDetails.rep}
                  onChange={(value) => handleJobDetailChange('rep', value)}
                  fetcher={(searchTerm) => fetcher('reps', 'rep_name', searchTerm)}
                  displayField="rep_name"
                  valueField="rep_code"
                  placeholder="Type to search reps..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Line Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customerItems.map((item, index) => (
                <div key={item.id || index} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5 space-y-2">
                    <Label>Part Description</Label>
                    <Textarea
                      placeholder="E.g., Install Bouwa S315..."
                      value={item.part}
                      onChange={(e) =>
                        handleItemChange('customer', index, 'part', e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange('customer', index, 'quantity', e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label>Price (R)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={item.price}
                      onChange={(e) =>
                        handleItemChange('customer', index, 'price', e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-1 flex items-end h-full">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem('customer', index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addItem('customer')}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Customer Item
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense Line Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {expenseItems.map((item, index) => (
                <div key={item.id || index} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5 space-y-2">
                    <Label>Part</Label>
                    <Autocomplete
                      value={item.part}
                      onChange={(value) => handleExpensePartChange(index, value)}
                      fetcher={(searchTerm) => fetcher('parts', 'name', searchTerm)}
                      displayField="name"
                      placeholder="Type to search parts..."
                    />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange('expense', index, 'quantity', e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label>Price (R)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={item.price}
                      onChange={(e) =>
                        handleItemChange('expense', index, 'price', e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-1 flex items-end h-full">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem('expense', index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addItem('expense')}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Expense Item
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardFooter className="flex justify-between items-center p-6">
            <div className="text-lg font-semibold">
              <div>
                Total Customer: <span className="text-green-600">R{totals.customer.toFixed(2)}</span>
              </div>
              <div>
                Total Expenses: <span className="text-red-600">R{totals.expenses.toFixed(2)}</span>
              </div>
              <div className="mt-2 text-xl">
                Profit: <span className="font-bold">R{totals.profit.toFixed(2)}</span> (Margin:{' '}
                <span className="font-bold">{totals.margin.toFixed(2)}%</span>)
              </div>
            </div>
            <Button size="lg" onClick={handleInitiateSubmit}>
              {isEditMode ? 'Update Entry' : 'Submit'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <ConfirmationModal
        isOpen={isConfirming}
        onCancel={() => setIsConfirming(false)}
        onConfirm={handleConfirmSubmit}
        data={{ jobDetails, customerItems, expenseItems, totals }}
        isEditMode={isEditMode}
      />
    </>
  );
};

export default AddCostingPage;
