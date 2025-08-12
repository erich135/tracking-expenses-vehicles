import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash2, PlusCircle, Search, X } from 'lucide-react';

export const GenericMaintenanceTable = ({ tableName, columns, title }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('');
    const [isFormOpen, setIsFormOpen]  = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [formData, setFormData] = useState({});
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        let query = supabase.from(tableName).select('*').order('id', { ascending: true });
        
        if (activeFilter) {
            const searchColumns = columns.filter(c => c.accessor !== 'id' && c.type !== 'number').map(c => c.accessor);
            if(searchColumns.length > 0) {
                 query = query.or(searchColumns.map(col => `${col}.ilike.%${activeFilter}%`).join(','));
            }
        }
        
        const { data, error } = await query;
        if (error) {
            toast({ variant: 'destructive', title: 'Error fetching data', description: error.message });
        } else {
            setData(data);
        }
        setLoading(false);
    }, [tableName, toast, activeFilter, columns]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddNew = () => {
        setSelectedItem(null);
        setFormData(columns.reduce((acc, col) => ({ ...acc, [col.accessor]: '' }), {}));
        setIsFormOpen(true);
    };

    const handleEdit = (item) => {
        setSelectedItem(item);
        setFormData(item);
        setIsFormOpen(true);
    };

    const handleDelete = (item) => {
        setSelectedItem(item);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedItem) return;
        const { error } = await supabase.from(tableName).delete().eq('id', selectedItem.id);
        if (error) {
            toast({ variant: 'destructive', title: 'Error deleting item', description: error.message });
        } else {
            toast({ title: 'Success!', description: `${title.slice(0, -1)} deleted successfully.` });
            fetchData();
        }
        setIsConfirmOpen(false);
        setSelectedItem(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const submissionData = { ...formData };
        columns.forEach(col => {
            if (col.type === 'number' && submissionData[col.accessor]) {
                submissionData[col.accessor] = parseFloat(submissionData[col.accessor]);
            }
        });

        let error;
        if (selectedItem) {
            ({ error } = await supabase.from(tableName).update(submissionData).eq('id', selectedItem.id));
        } else {
            const { id, ...insertData } = submissionData;
            ({ error } = await supabase.from(tableName).insert([insertData]));
        }

        if (error) {
            toast({ variant: 'destructive', title: `Error ${selectedItem ? 'updating' : 'creating'} item`, description: error.message });
        } else {
            toast({ title: 'Success!', description: `${title.slice(0, -1)} ${selectedItem ? 'updated' : 'created'} successfully.` });
            fetchData();
            setIsFormOpen(false);
        }
    };
    
    const handleApplyFilter = () => setActiveFilter(filter);
    const handleClearFilter = () => { setFilter(''); setActiveFilter(''); };

    return (
        <div>
            <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <Input placeholder={`Filter ${title.toLowerCase()}...`} value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
                    <Button onClick={handleApplyFilter}><Search className="mr-2 h-4 w-4"/>Filter</Button>
                    <Button variant="ghost" onClick={handleClearFilter}><X className="mr-2 h-4 w-4"/>Clear</Button>
                </div>
                <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Add New {title.slice(0, -1)}</Button>
            </div>
            
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map(col => <TableHead key={col.accessor}>{col.header}</TableHead>)}
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={columns.length + 1} className="text-center">Loading...</TableCell></TableRow>
                        ) : data.length > 0 ? (
                            data.map(item => (
                                <TableRow key={item.id}>
                                    {columns.map(col => <TableCell key={col.accessor}>{item[col.accessor]}</TableCell>)}
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow><TableCell colSpan={columns.length + 1} className="text-center">No {title.toLowerCase()} found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedItem ? 'Edit' : 'Add New'} {title.slice(0, -1)}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        {columns.filter(c => c.isEditable).map(col => (
                            <div key={col.accessor} className="grid grid-cols-4 items-center gap-4">
                                <label htmlFor={col.accessor} className="text-right">{col.header}</label>
                                <Input 
                                    id={col.accessor}
                                    type={col.type || 'text'}
                                    value={formData[col.accessor] || ''}
                                    onChange={e => handleInputChange(col.accessor, e.target.value)}
                                    className="col-span-3"
                                    required={col.isRequired}
                                />
                            </div>
                        ))}
                         <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                            <Button type="submit">{selectedItem ? 'Save Changes' : 'Create'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete this {title.slice(0,-1).toLowerCase()}.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};