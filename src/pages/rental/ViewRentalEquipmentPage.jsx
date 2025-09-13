import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Edit, Search, X } from 'lucide-react';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const getServiceStatusStyle = (machine) => {
    const hoursToService = (machine.next_service_hours || 0) - (machine.current_hours || 0);
    if (hoursToService <= 500) return { backgroundColor: '#FF0000', color: '#ffffff' };
    if (hoursToService <= 1000) return { backgroundColor: '#FFA500' };
    return {};
};


const ViewRentalEquipmentPage = () => {
    const [allEquipment, setAllEquipment] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const { toast } = useToast();

    // Filters
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [attributeFilter, setAttributeFilter] = useState({ key: 'all', value: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [equipmentRes, customersRes] = await Promise.all([
            supabase.from('rental_equipment').select('*, customer:customers(name)'),
            supabase.from('customers').select('*')
        ]);
        
        if (equipmentRes.error) {
            toast({ variant: 'destructive', title: 'Error fetching equipment', description: equipmentRes.error.message });
        } else {
            setAllEquipment(equipmentRes.data);
        }

        if (customersRes.error) {
            toast({ variant: 'destructive', title: 'Error fetching customers', description: customersRes.error.message });
        } else {
            setCustomers(customersRes.data);
        }

        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const customerOptions = useMemo(() => customers.map(c => ({ value: c.id, label: c.name })), [customers]);

    const filteredEquipment = useMemo(() => {
        return allEquipment.filter(machine => {
            const customerMatch = selectedCustomers.length === 0 || (machine.customer_id && selectedCustomers.includes(machine.customer_id));
            
            let attributeMatch = attributeFilter.key === 'all' || !attributeFilter.value;
            if (!attributeMatch) {
                const machineValue = machine[attributeFilter.key];
                const filterValue = attributeFilter.value.toLowerCase();
                if (attributeFilter.key === 'customer') {
                     attributeMatch = machine.customer?.name?.toLowerCase().includes(filterValue);
                } else {
                     attributeMatch = String(machineValue || '').toLowerCase().includes(filterValue);
                }
            }

            return customerMatch && attributeMatch;
        });
    }, [allEquipment, selectedCustomers, attributeFilter]);

    const handleEditClick = (machine) => {
        setSelectedMachine(machine);
        setEditFormData({
            ...machine,
            customer_id: machine.customer ? { id: machine.customer_id, name: machine.customer.name } : null
        });
        setIsEditDialogOpen(true);
    };

    const handleInputChange = (field, value) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const fetchCustomersForAutocomplete = async (searchTerm) => {
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
    
    const handleUpdate = async (e) => {
        e.preventDefault();
        const { id, customer, ...updateData } = editFormData;
        updateData.customer_id = updateData.customer_id?.id || null;
        
        const { error } = await supabase.from('rental_equipment').update(updateData).eq('id', id);

        if (error) {
            toast({ variant: 'destructive', title: 'Error updating machine', description: error.message });
        } else {
            toast({ title: 'Success!', description: 'Machine details updated.' });
            setIsEditDialogOpen(false);
            fetchData();
        }
    };

    const columns = [
        { key: 'plant_no', label: 'Plant No.' },
        { key: 'make', label: 'Make' },
        { key: 'model', label: 'Model' },
        { key: 'customer', label: 'Customer' },
        { key: 'current_hours', label: 'Current Hours' },
        { key: 'next_service_hours', label: 'Next Service' },
        { key: 'hours_to_service', label: 'Hours to Service' },
    ];
    
    const editFields = [
      { key: 'plant_no', label: 'Plant No.', type: 'text' },
      { key: 'branch', label: 'Branch', type: 'text' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'customer_id', label: 'Customer', type: 'autocomplete' },
      { key: 'make', label: 'Make', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'bar', label: 'Bar', type: 'number' },
      { key: 'kw', label: 'KW', type: 'number' },
      { key: 'cfm', label: 'CFM', type: 'number' },
      { key: 'volt', label: 'Volt', type: 'number' },
      { key: 'serial_number', label: 'Serial No.', type: 'text' },
      { key: 'inspection_date', label: 'Inspection Date', type: 'date' },
      { key: 'current_hours', label: 'Current Hours', type: 'number' },
      { key: 'last_service_hours', label: 'Last Service Hours', type: 'number' },
      { key: 'next_service_hours', label: 'Next Service Hours', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea', colSpan: 3 },
    ];
    
    const attributeOptions = [
        { value: 'all', label: 'All Attributes' }, { value: 'plant_no', label: 'Plant No' },
        { value: 'make', label: 'Make' }, { value: 'model', label: 'Model' },
        { value: 'serial_number', label: 'Serial No' }, { value: 'customer', label: 'Customer Name' },
        { value: 'kw', label: 'KW' }, { value: 'bar', label: 'Bar' }, { value: 'volt', label: 'Volt' }
    ];

    return (
        <>
            <Helmet>
                <title>Rental Equipment</title>
                <meta name="description" content="View and manage rental equipment." />
            </Helmet>
            <Card>
                <CardHeader>
                    <CardTitle>Rental Equipment</CardTitle>
                    <CardDescription>View, filter, and manage all rental machines.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div className="lg:col-span-1">
                            <MultiSelect options={customerOptions} selected={selectedCustomers} onChange={setSelectedCustomers} placeholder="Filter by Customer..." />
                        </div>
                        <div className="lg:col-span-2 flex gap-2">
                            <Select value={attributeFilter.key} onValueChange={(v) => setAttributeFilter(p => ({...p, key: v}))}>
                                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Attribute" /></SelectTrigger>
                                <SelectContent>{attributeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                            </Select>
                            <Input placeholder="Filter by attribute value..." value={attributeFilter.value} onChange={(e) => setAttributeFilter(p => ({...p, value: e.target.value}))} disabled={attributeFilter.key === 'all'} />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {columns.map(col => <TableHead key={col.key}>{col.label}</TableHead>)}
                                    <TableHead className="text-right table-head-bold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={columns.length + 1} className="text-center">Loading equipment...</TableCell></TableRow>
                                ) : filteredEquipment.length === 0 ? (
                                    <TableRow><TableCell colSpan={columns.length + 1} className="text-center">No equipment found matching your filters.</TableCell></TableRow>
                                ) : (
                                    filteredEquipment.map((machine) => {
                                        const hoursToService = (machine.next_service_hours || 0) - (machine.current_hours || 0);
                                        return (
                                            <TableRow key={machine.id} style={getServiceStatusStyle(machine)}>

                                                <TableCell>{machine.plant_no}</TableCell>
                                                <TableCell>{machine.make}</TableCell>
                                                <TableCell>{machine.model}</TableCell>
                                                <TableCell>{machine.customer?.name || 'N/A'}</TableCell>
                                                <TableCell>{machine.current_hours}</TableCell>
                                                <TableCell>{machine.next_service_hours}</TableCell>
                                                <TableCell>{hoursToService > 0 ? hoursToService : 'Service Due'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(machine)}><Edit className="h-4 w-4" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader><DialogTitle>Edit Rental Machine</DialogTitle></DialogHeader>
                    <form onSubmit={handleUpdate} className="py-4 max-h-[70vh] overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {editFields.map(field => (
                            <div key={field.key} className={`space-y-2 ${field.colSpan ? `lg:col-span-${field.colSpan}` : ''}`}>
                                <Label htmlFor={field.key}>{field.label}</Label>
                                {field.type === 'autocomplete' ? (
                                    <Autocomplete
                                        value={editFormData[field.key]}
                                        onChange={value => handleInputChange(field.key, value)}
                                        fetcher={fetchCustomersForAutocomplete}
                                        displayField="name"
                                        valueField="id"
                                        placeholder="Select a customer..."
                                    />
                                ) : field.type === 'textarea' ? (
                                    <Textarea
                                        id={field.key}
                                        value={editFormData[field.key] || ''}
                                        onChange={e => handleInputChange(field.key, e.target.value)}
                                        rows={4}
                                    />
                                ): (
                                    <Input
                                        id={field.key}
                                        type={field.type}
                                        value={editFormData[field.key] || ''}
                                        onChange={e => handleInputChange(field.key, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}
                        </div>
                         <DialogFooter className="mt-6">
                            <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ViewRentalEquipmentPage;