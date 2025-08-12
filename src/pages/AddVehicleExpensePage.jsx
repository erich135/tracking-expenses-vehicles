import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarPlus as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Autocomplete } from '@/components/ui/autocomplete';

const AddVehicleExpensePage = ({ isEditMode = false, expenseData = null, onSuccess }) => {
    const { toast } = useToast();
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [lastOdometer, setLastOdometer] = useState(null);
    const [category, setCategory] = useState('');
    const [supplier, setSupplier] = useState(null);
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date());
    const [litres, setLitres] = useState('');
    const [odometer, setOdometer] = useState('');
    const [description, setDescription] = useState('');

    const categories = ["Fuel", "Maintenance", "Tyres", "Tolls", "Other"];

    const fetchVehicles = useCallback(async () => {
        const { data, error } = await supabase.from('vehicles').select('*');
        if (error) {
            toast({ variant: 'destructive', title: 'Error fetching vehicles', description: error.message });
        } else {
            setVehicles(data);
        }
    }, [toast]);

    useEffect(() => {
        fetchVehicles();
    }, [fetchVehicles]);

    useEffect(() => {
        if (isEditMode && expenseData) {
            setSelectedVehicle(expenseData.vehicle_id);
            setCategory(expenseData.category);
            setSupplier(expenseData.supplier ? { name: expenseData.supplier } : null);
            setAmount(expenseData.amount);
            setDate(parseISO(expenseData.date));
            setLitres(expenseData.litres || '');
            setOdometer(expenseData.odometer || '');
            setDescription(expenseData.description || '');
        }
    }, [isEditMode, expenseData]);

    const fetchLastOdometer = useCallback(async (vehicleId) => {
        if (!vehicleId) return;
        const { data, error } = await supabase
            .from('vehicle_expenses')
            .select('odometer')
            .eq('vehicle_id', vehicleId)
            .order('date', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
             toast({ variant: 'destructive', title: 'Error fetching last odometer', description: error.message });
        } else if (data) {
            setLastOdometer(data.odometer);
        } else {
            const { data: vehicleData } = await supabase.from('vehicles').select('odometer').eq('id', vehicleId).single();
            setLastOdometer(vehicleData?.odometer || 0);
        }
    }, [toast]);

    useEffect(() => {
        if (selectedVehicle) {
            fetchLastOdometer(selectedVehicle);
        } else {
            setLastOdometer(null);
        }
    }, [selectedVehicle, fetchLastOdometer]);
    
    const fetchSuppliers = async (searchTerm) => {
        const { data, error } = await supabase
            .from('suppliers')
            .select('name')
            .ilike('name', `%${searchTerm}%`)
            .limit(10);
        if (error) {
            toast({ variant: "destructive", title: "Error fetching suppliers", description: error.message });
            return [];
        }
        return data;
    };


    const clearForm = () => {
        setSelectedVehicle(null);
        setCategory('');
        setSupplier(null);
        setAmount('');
        setDate(new Date());
        setLitres('');
        setOdometer('');
        setDescription('');
    };

    const handleSave = async () => {
        if (!selectedVehicle || !category || !amount || !date) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please fill all required fields." });
            return;
        }

        const expensePayload = {
            vehicle_id: selectedVehicle,
            category,
            supplier: supplier?.name,
            amount: parseFloat(amount),
            date: format(date, 'yyyy-MM-dd'),
            description,
            litres: category === 'Fuel' && litres ? parseFloat(litres) : null,
            odometer: category === 'Fuel' && odometer ? parseInt(odometer) : null,
        };

        let error;
        if (isEditMode) {
            const { error: updateError } = await supabase.from('vehicle_expenses').update(expensePayload).eq('id', expenseData.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase.from('vehicle_expenses').insert([expensePayload]);
            error = insertError;
        }
        
        if (error) {
            toast({ variant: 'destructive', title: `Error ${isEditMode ? 'updating' : 'saving'} expense`, description: error.message });
        } else {
            toast({ title: 'Success!', description: `Vehicle expense ${isEditMode ? 'updated' : 'saved'} successfully.` });
            if(category === 'Fuel' && odometer) {
                 await supabase.from('vehicles').update({ odometer: parseInt(odometer) }).eq('id', selectedVehicle);
            }
            if (onSuccess) {
                onSuccess();
            } else {
                clearForm();
            }
        }
    };

    const cardContent = (
        <>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Vehicle *</Label>
                        <Select onValueChange={setSelectedVehicle} value={selectedVehicle}>
                            <SelectTrigger><SelectValue placeholder="Select a vehicle" /></SelectTrigger>
                            <SelectContent>
                                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name} ({v.registration_number})</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {lastOdometer !== null && <p className="text-sm text-muted-foreground">Last odometer: {lastOdometer} km</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>Supplier</Label>
                        <Autocomplete value={supplier} onChange={setSupplier} fetcher={fetchSuppliers} displayField="name" placeholder="Type to search suppliers..."/>
                    </div>
                    <div className="space-y-2">
                         <Label>Category *</Label>
                         <Select onValueChange={setCategory} value={category}>
                             <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                             <SelectContent>
                                 {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                             </SelectContent>
                         </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount *</Label>
                        <Input id="amount" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Date *</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {category === 'Fuel' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        <div className="space-y-2">
                            <Label htmlFor="litres">Litres</Label>
                            <Input id="litres" type="number" placeholder="e.g., 50" value={litres} onChange={e => setLitres(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="odometer">Current Odometer (km)</Label>
                            <Input id="odometer" type="number" placeholder="e.g., 151102" value={odometer} onChange={e => setOdometer(e.target.value)} />
                        </div>
                    </div>
                )}
                
                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Add a description for the expense..." value={description} onChange={e => setDescription(e.target.value)} />
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                {!isEditMode && <Button variant="outline" onClick={clearForm}>Clear</Button>}
                <Button onClick={handleSave}>{isEditMode ? 'Update Expense' : 'Save Expense'}</Button>
            </CardFooter>
        </>
    );

    if (isEditMode) {
        return <div className="py-4">{cardContent}</div>;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Add Vehicle Expense</CardTitle>
                    <CardDescription>Log a new expense for a vehicle in your fleet.</CardDescription>
                </CardHeader>
                {cardContent}
            </Card>
        </div>
    );
};

export default AddVehicleExpensePage;