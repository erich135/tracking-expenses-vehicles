import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO } from 'date-fns';
import { Edit, Trash2, Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import AddVehicleExpensePage from '@/pages/AddVehicleExpensePage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const ViewVehicleExpensesPage = () => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const { toast } = useToast();

    const [vehicles, setVehicles] = useState([]);
    const [filterVehicle, setFilterVehicle] = useState('all');
    const [filterDate, setFilterDate] = useState({ from: null, to: null });
    const [activeFilters, setActiveFilters] = useState({ vehicle: 'all', date: { from: null, to: null } });

    const fetchVehicles = useCallback(async () => {
        const { data, error } = await supabase.from('vehicles').select('id, name, registration_number');
        if (error) {
            toast({ variant: 'destructive', title: 'Error fetching vehicles', description: error.message });
        } else {
            setVehicles(data);
        }
    }, [toast]);

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from('vehicle_expenses')
            .select(`
                *,
                vehicles (
                    id,
                    name,
                    registration_number
                )
            `);

        if (activeFilters.vehicle && activeFilters.vehicle !== 'all') {
            query = query.eq('vehicle_id', activeFilters.vehicle);
        }
        if (activeFilters.date.from) {
            query = query.gte('date', format(activeFilters.date.from, 'yyyy-MM-dd'));
        }
        if (activeFilters.date.to) {
            query = query.lte('date', format(activeFilters.date.to, 'yyyy-MM-dd'));
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) {
            toast({ variant: 'destructive', title: 'Error fetching expenses', description: error.message });
        } else {
            setExpenses(data);
        }
        setLoading(false);
    }, [toast, activeFilters]);

    useEffect(() => {
        fetchVehicles();
    }, [fetchVehicles]);
    
    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const handleApplyFilters = () => {
        setActiveFilters({ vehicle: filterVehicle, date: filterDate });
    };

    const handleClearFilters = () => {
        setFilterVehicle('all');
        setFilterDate({ from: null, to: null });
        setActiveFilters({ vehicle: 'all', date: { from: null, to: null } });
    };

    const handleEditClick = (expense) => {
        setSelectedExpense(expense);
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (expense) => {
        setSelectedExpense(expense);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedExpense) return;
        const { error } = await supabase.from('vehicle_expenses').delete().eq('id', selectedExpense.id);
        if (error) {
            toast({ variant: 'destructive', title: 'Error deleting expense', description: error.message });
        } else {
            toast({ title: 'Success!', description: 'Expense deleted successfully.' });
            fetchExpenses();
        }
        setIsDeleteDialogOpen(false);
        setSelectedExpense(null);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0);
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Vehicle Expense History</CardTitle>
                    <CardDescription>A complete log of all recorded vehicle expenses.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-slate-50 rounded-lg border">
                        <div className="flex-1 min-w-[200px]">
                            <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by vehicle..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Vehicles</SelectItem>
                                    {vehicles.map(v => (
                                        <SelectItem key={v.id} value={v.id}>{v.name} ({v.registration_number})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 min-w-[280px]">
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !filterDate.from && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDate.from ? (
                                    filterDate.to ? (
                                        <>
                                        {format(filterDate.from, "LLL dd, y")} -{" "}
                                        {format(filterDate.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(filterDate.from, "LLL dd, y")
                                    )
                                    ) : (
                                    <span>Pick a date range</span>
                                    )}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={filterDate.from}
                                    selected={filterDate}
                                    onSelect={setFilterDate}
                                    numberOfMonths={2}
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Button onClick={handleApplyFilters}><Filter className="mr-2 h-4 w-4" /> Apply</Button>
                        <Button variant="ghost" onClick={handleClearFilters}><X className="mr-2 h-4 w-4" /> Clear</Button>
                    </div>

                    {loading ? (
                        <p>Loading expenses...</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Vehicle</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Odometer</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan="7" className="text-center">No expenses found for the selected filters.</TableCell>
                                    </TableRow>
                                ) : (
                                    expenses.map((expense) => (
                                        <TableRow key={expense.id}>
                                            <TableCell>{format(parseISO(expense.date), 'PPP')}</TableCell>
                                            <TableCell>{expense.vehicles?.name || 'N/A'} ({expense.vehicles?.registration_number || 'N/A'})</TableCell>
                                            <TableCell>{expense.category}</TableCell>
                                            <TableCell>{expense.supplier || 'N/A'}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
                                            <TableCell className="text-right">{expense.odometer ? `${expense.odometer} km` : 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(expense)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(expense)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Edit Vehicle Expense</DialogTitle>
                    </DialogHeader>
                    <AddVehicleExpensePage 
                        isEditMode={true} 
                        expenseData={selectedExpense} 
                        onSuccess={() => {
                            setIsEditDialogOpen(false);
                            fetchExpenses();
                        }}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the expense record.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default ViewVehicleExpensesPage;