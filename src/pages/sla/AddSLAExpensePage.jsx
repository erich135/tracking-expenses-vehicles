import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const AddSLAExpensePage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [slaEquipment, setSLAEquipment] = useState(null);
    const [supplier, setSupplier] = useState(null);
    const [date, setDate] = useState(new Date());
    const [expenseItems, setExpenseItems] = useState([{ part: null, description: '', quantity: 1, unit_price: 0 }]);
    
    const totalAmount = expenseItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);

    const handleItemChange = (index, field, value) => {
        const newItems = [...expenseItems];
        newItems[index][field] = value;

        if (field === 'part' && value) {
            newItems[index].description = value.name;
            newItems[index].unit_price = value.price || 0;
        }

        setExpenseItems(newItems);
    };

    const addItem = () => {
        setExpenseItems([...expenseItems, { part: null, description: '', quantity: 1, unit_price: 0 }]);
    };

    const removeItem = (index) => {
        const newItems = expenseItems.filter((_, i) => i !== index);
        setExpenseItems(newItems);
    };

    const fetchEquipment = async (searchTerm) => {
        const { data, error } = await supabase
            .from('sla_units')
            .select('id, unit_number, make, model')
            .or(`unit_number.ilike.%${searchTerm}%,make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`)
            .limit(10);
        if (error) {
            toast({ variant: "destructive", title: "Error fetching equipment", description: error.message });
            return [];
        }
        return data.map(d => ({ ...d, name: `${d.unit_number} - ${d.make} ${d.model}`}));
    };

    const fetchSuppliers = async (searchTerm) => {
        const { data, error } = await supabase.from('suppliers').select('id, name').ilike('name', `%${searchTerm}%`).limit(10);
        if (error) { toast({ variant: "destructive", title: "Error fetching suppliers" }); return []; }
        return data;
    };
    
    const fetchParts = async (searchTerm) => {
        const { data, error } = await supabase.from('parts').select('id, name, price').ilike('name', `%${searchTerm}%`).limit(10);
        if (error) { toast({ variant: "destructive", title: "Error fetching parts" }); return []; }
        return data;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!slaEquipment || expenseItems.some(item => !item.description)) {
             toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a machine and fill all item descriptions.' });
             return;
        }
        
        // 1. Insert the main expense record
        const { data: expenseData, error: expenseError } = await supabase.from('sla_expenses').insert({
            user_id: user.id,
            sla_unit_id: slaEquipment.id,
            supplier_id: supplier?.id,
            date: date,
        }).select().single();

        if (expenseError) {
            toast({ variant: 'destructive', title: 'Error creating expense record', description: expenseError.message });
            return;
        }

        // 2. Insert the expense items
        const itemsToInsert = expenseItems.map(item => ({
            sla_expense_id: expenseData.id,
            part_id: item.part?.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
        }));
        
        const { error: itemsError } = await supabase.from('sla_expense_items').insert(itemsToInsert);
        
        if(itemsError) {
             toast({ variant: 'destructive', title: 'Error adding expense items', description: itemsError.message });
             // Optionally, delete the main expense record here for consistency
             await supabase.from('sla_expenses').delete().eq('id', expenseData.id);
        } else {
             toast({ title: 'Success!', description: 'SLA expense added successfully.' });
             navigate('/sla/view');
        }
    };

    return (
        <>
            <Helmet>
                <title>Add SLA Expense</title>
                <meta name="description" content="Add a new expense for sla equipment." />
            </Helmet>
            <form onSubmit={handleSubmit}>
                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle>Add SLA Expense</CardTitle>
                        <CardDescription>Log a new expense for a sla machine, including parts and labour.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2"><Label>SLA Machine</Label><Autocomplete value={slaEquipment} onChange={setSLAEquipment} fetcher={fetchEquipment} displayField="name" valueField="id" placeholder="Select a machine..." required /></div>
                            <div className="space-y-2"><Label>Supplier</Label><Autocomplete value={supplier} onChange={setSupplier} fetcher={fetchSuppliers} displayField="name" valueField="id" placeholder="Select a supplier..." /></div>
                            <div className="space-y-2"><Label>Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent></Popover></div>
                        </div>
                        
                        <div>
                            <Label className="text-lg font-semibold">Expense Items</Label>
                            <Table>
                                <TableHeader><TableRow><TableHead className="w-2/5">Item/Part</TableHead><TableHead className="table-head-bold">
Description</TableHead><TableHead className="table-head-bold">
Qty</TableHead><TableHead className="table-head-bold">
Unit Price</TableHead><TableHead className="table-head-bold">
Total</TableHead><TableHead className="table-head-bold">
</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {expenseItems.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Autocomplete value={item.part} onChange={(v) => handleItemChange(index, 'part', v)} fetcher={fetchParts} displayField="name" valueField="id" placeholder="Select part..." /></TableCell>
                                            <TableCell><Input value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} placeholder="Manual Description" /></TableCell>
                                            <TableCell><Input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="w-20"/></TableCell>
                                            <TableCell><Input type="number" step="0.01" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24"/></TableCell>
                                            <TableCell>R {(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                                            <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                             <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                        <span className="text-xl font-bold">Total: R {totalAmount.toFixed(2)}</span>
                        <Button type="submit">Add Expense</Button>
                    </CardFooter>
                </Card>
            </form>
        </>
    );
};

export default AddSLAExpensePage;