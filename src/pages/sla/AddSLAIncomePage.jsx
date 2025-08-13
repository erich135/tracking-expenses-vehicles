import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const AddSLAIncomePage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        sla_unit_id: null,
        customer_id: null,
        invoice_number: '',
        date: new Date(),
        amount: '',
        notes: ''
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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

    const fetchCustomers = async (searchTerm) => {
        const { data, error } = await supabase
            .from('customers')
            .select('id, name')
            .ilike('name', `%${searchTerm}%`)
            .limit(10);
        if (error) {
            toast({ variant: "destructive", title: "Error fetching customers", description: error.message });
            return [];
        }
        return data;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const submissionData = {
            ...formData,
            user_id: user.id,
            sla_unit_id: formData.sla_unit_id?.id,
            customer_id: formData.customer_id?.id,
            amount: parseFloat(formData.amount)
        };

        if (!submissionData.sla_unit_id || !submissionData.customer_id || !submissionData.amount) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all required fields.' });
            return;
        }

        const { error } = await supabase.from('sla_incomes').insert([submissionData]);

        if (error) {
            toast({ variant: 'destructive', title: 'Error adding income', description: error.message });
        } else {
            toast({ title: 'Success!', description: 'SLA income added successfully.' });
            navigate('/sla/view');
        }
    };

    return (
        <>
            <Helmet>
                <title>Add SLA Income</title>
                <meta name="description" content="Add a new income record for sla equipment." />
            </Helmet>
            <form onSubmit={handleSubmit}>
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>Add SLA Income</CardTitle>
                        <CardDescription>Log a new invoice or income for a sla machine.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label>SLA Machine</Label><Autocomplete value={formData.sla_unit_id} onChange={value => handleInputChange('sla_unit_id', value)} fetcher={fetchEquipment} displayField="name" valueField="id" placeholder="Select a machine..." required /></div>
                        <div className="space-y-2"><Label>Customer</Label><Autocomplete value={formData.customer_id} onChange={value => handleInputChange('customer_id', value)} fetcher={fetchCustomers} displayField="name" valueField="id" placeholder="Select a customer..." required /></div>
                        <div className="space-y-2"><Label>Invoice Number</Label><Input value={formData.invoice_number} onChange={e => handleInputChange('invoice_number', e.target.value)} placeholder="e.g., INV-12345" /></div>
                        <div className="space-y-2"><Label>Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.date} onSelect={date => handleInputChange('date', date)} initialFocus /></PopoverContent></Popover></div>
                        <div className="space-y-2"><Label>Amount (R)</Label><Input type="number" step="0.01" value={formData.amount} onChange={e => handleInputChange('amount', e.target.value)} placeholder="e.g., 15000.00" required /></div>
                        <div className="space-y-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} placeholder="Add any relevant notes..." /></div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit">Add Income</Button>
                    </CardFooter>
                </Card>
            </form>
        </>
    );
};

export default AddSLAIncomePage;