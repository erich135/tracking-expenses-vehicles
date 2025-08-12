
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarPlus as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const jobStatuses = [
    "Quoted/Awaiting Order",
    "Stripping",
    "Go Ahead",
    "Completed",
    "Invoiced",
    "Overdue",
    "PDI",
    "Awaiting Spares",
];

const AddWorkshopJobPage = ({ isEditMode = false, jobData, onSuccess }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        job_number: '',
        technician_id: null,
        equipment_detail: '',
        customer_id: null,
        cash_customer_name: '',
        quote_date: null,
        po_date: null,
        quote_amount: '',
        days_quoted: '',
        area: '',
        delivery_date: null,
        status: '',
        notes: '',
    });

    const resetForm = useCallback(() => {
        setFormData({
            job_number: '',
            technician_id: null,
            equipment_detail: '',
            customer_id: null,
            cash_customer_name: '',
            quote_date: null,
            po_date: null,
            quote_amount: '',
            days_quoted: '',
            area: '',
            delivery_date: null,
            status: '',
            notes: '',
        });
    }, []);

    useEffect(() => {
        if (isEditMode && jobData) {
            setFormData({
                job_number: jobData.job_number || '',
                technician_id: jobData.technician ? { id: jobData.technician_id, name: jobData.technician.name } : null,
                equipment_detail: jobData.equipment_detail || '',
                customer_id: jobData.customer ? { id: jobData.customer_id, name: jobData.customer.name } : null,
                cash_customer_name: jobData.cash_customer_name || '',
                quote_date: jobData.quote_date ? new Date(jobData.quote_date) : null,
                po_date: jobData.po_date ? new Date(jobData.po_date) : null,
                quote_amount: jobData.quote_amount || '',
                days_quoted: jobData.days_quoted || '',
                area: jobData.area || '',
                delivery_date: jobData.delivery_date ? new Date(jobData.delivery_date) : null,
                status: jobData.status || '',
                notes: jobData.notes || '',
            });
        }
    }, [isEditMode, jobData]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDateChange = (field, date) => {
        setFormData(prev => ({ ...prev, [field]: date }));
    };

    const fetchTechnicians = async (searchTerm) => {
        const { data, error } = await supabase
            .from('technicians')
            .select('id, name, rate')
            .ilike('name', `%${searchTerm}%`)
            .limit(10);
        if (error) {
            toast({ variant: "destructive", title: "Error fetching technicians", description: error.message });
            return [];
        }
        return data;
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
            job_number: formData.job_number,
            equipment_detail: formData.equipment_detail,
            cash_customer_name: formData.customer_id?.name?.toLowerCase() === 'cash sale' ? formData.cash_customer_name : null,
            quote_date: formData.quote_date,
            po_date: formData.po_date,
            quote_amount: parseFloat(formData.quote_amount) || null,
            days_quoted: parseInt(formData.days_quoted) || null,
            area: formData.area,
            delivery_date: formData.delivery_date,
            status: formData.status,
            notes: formData.notes,
            user_id: user.id,
            technician_id: formData.technician_id?.id,
            customer_id: formData.customer_id?.name?.toLowerCase() === 'cash sale' ? null : formData.customer_id?.id,
        };
        
        let error;
        if (isEditMode) {
            ({ error } = await supabase.from('workshop_jobs').update(submissionData).eq('id', jobData.id));
        } else {
            ({ error } = await supabase.from('workshop_jobs').insert([submissionData]));
        }

        if (error) {
            toast({ variant: "destructive", title: `Error ${isEditMode ? 'updating' : 'creating'} job`, description: error.message });
        } else {
            toast({ title: "Success!", description: `Workshop job ${isEditMode ? 'updated' : 'created'} successfully.` });
            if (isEditMode) {
                onSuccess();
            } else {
                resetForm();
                navigate('/workshop-jobs/view');
            }
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle>{isEditMode ? 'Edit Workshop Job' : 'Add New Workshop Job'}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2"><Label>Job Number</Label><Input value={formData.job_number} onChange={e => handleInputChange('job_number', e.target.value)} placeholder="e.g., WJ409" required /></div>
                    <div className="space-y-2"><Label>Technician</Label><Autocomplete value={formData.technician_id} onChange={value => handleInputChange('technician_id', value)} fetcher={fetchTechnicians} displayField="name" valueField="id" placeholder="Select a technician..." /></div>
                    <div className="space-y-2"><Label>Equipment Detail</Label><Input value={formData.equipment_detail} onChange={e => handleInputChange('equipment_detail', e.target.value)} placeholder="e.g., Ingersoll Rand Dryer" /></div>
                    <div className="space-y-2"><Label>Customer</Label><Autocomplete value={formData.customer_id} onChange={value => handleInputChange('customer_id', value)} fetcher={fetchCustomers} displayField="name" valueField="id" placeholder="Select a customer..." /></div>
                    {formData.customer_id?.name?.toLowerCase() === 'cash sale' && (<div className="space-y-2"><Label>Cash Customer Name</Label><Input value={formData.cash_customer_name} onChange={e => handleInputChange('cash_customer_name', e.target.value)} placeholder="Enter cash customer name" /></div>)}
                    <div className="space-y-2"><Label>Quote Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.quote_date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{formData.quote_date ? format(formData.quote_date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.quote_date} onSelect={date => handleDateChange('quote_date', date)} initialFocus /></PopoverContent></Popover></div>
                    <div className="space-y-2"><Label>PO Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.po_date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{formData.po_date ? format(formData.po_date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.po_date} onSelect={date => handleDateChange('po_date', date)} initialFocus /></PopoverContent></Popover></div>
                    <div className="space-y-2"><Label>Quote Amount (R)</Label><Input type="number" step="0.01" value={formData.quote_amount} onChange={e => handleInputChange('quote_amount', e.target.value)} placeholder="e.g., 9840.80" /></div>
                    <div className="space-y-2"><Label>Days Quoted</Label><Input type="number" value={formData.days_quoted} onChange={e => handleInputChange('days_quoted', e.target.value)} placeholder="e.g., 10" /></div>
                    <div className="space-y-2"><Label>Area</Label><Input value={formData.area} onChange={e => handleInputChange('area', e.target.value)} placeholder="e.g., JHB" /></div>
                    <div className="space-y-2"><Label>Delivery Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.delivery_date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{formData.delivery_date ? format(formData.delivery_date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.delivery_date} onSelect={date => handleDateChange('delivery_date', date)} initialFocus /></PopoverContent></Popover></div>
                    <div className="space-y-2"><Label>Job Status</Label><Select value={formData.status} onValueChange={value => handleInputChange('status', value)}><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger><SelectContent>{jobStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2 md:col-span-2 lg:col-span-3"><Label>Notes</Label><Textarea value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} placeholder="Add any relevant notes..." /></div>
                </CardContent>
                <CardFooter>
                    <Button type="submit">{isEditMode ? 'Update Job' : 'Create Job'}</Button>
                </CardFooter>
            </Card>
        </form>
    );
};

export default AddWorkshopJobPage;
