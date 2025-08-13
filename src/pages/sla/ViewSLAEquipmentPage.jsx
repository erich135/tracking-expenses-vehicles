
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Edit } from 'lucide-react';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const getServiceStatusClass = (machine) => {
    const hoursToService = (machine.next_service_hours || 0) - (machine.current_hours || 0);
    if (hoursToService <= 500) return 'bg-red-200 dark:bg-red-900/50';
    if (hoursToService <= 1000) return 'bg-orange-200 dark:bg-orange-900/50';
    return '';
};

const ViewSLAEquipmentPage = () => {
    const [allEquipment, setAllEquipment] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({});
    const { toast } = useToast();
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [attributeFilter, setAttributeFilter] = useState({ key: 'all', value: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [equipmentRes, customersRes] = await Promise.all([
            supabase.from('sla_units').select('*, customer:customers(name)'),
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
            toast({ variant: 'destructive', title: 'Error fetching customers', description: error.message });
            return [];
        }
        return data;
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const { id, customer, ...updateData } = editFormData;
        updateData.customer_id = updateData.customer_id?.id || null;

        const { error } = await supabase.from('sla_units').update(updateData).eq('id', id);
        if (error) {
            toast({ variant: 'destructive', title: 'Error updating machine', description: error.message });
        } else {
            toast({ title: 'Success!', description: 'Machine details updated.' });
            setIsEditDialogOpen(false);
            fetchData();
        }
    };

    return (
        <>
            <Helmet>
                <title>SLA Equipment</title>
            </Helmet>
            <Card>
                <CardHeader>
                    <CardTitle>SLA Equipment</CardTitle>
                    <CardDescription>View, filter, and manage SLA machines.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Unit</TableHead>
                                <TableHead>Make</TableHead>
                                <TableHead>Model</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Current Hours</TableHead>
                                <TableHead>Next Service</TableHead>
                                <TableHead>To Service</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEquipment.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8}>No equipment found.</TableCell>
                                </TableRow>
                            ) : (
                                filteredEquipment.map(machine => (
                                    <TableRow key={machine.id || machine.unit_number}>
                                        <TableCell>{machine.unit_number}</TableCell>
                                        <TableCell>{machine.make}</TableCell>
                                        <TableCell>{machine.model}</TableCell>
                                        <TableCell>{machine.customer?.name || 'N/A'}</TableCell>
                                        <TableCell>{machine.current_hours}</TableCell>
                                        <TableCell>{machine.next_service_hours}</TableCell>
                                        <TableCell>{(machine.next_service_hours || 0) - (machine.current_hours || 0)}</TableCell>
                                        <TableCell>
                                            <Button onClick={() => handleEditClick(machine)} variant="ghost" size="icon">
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
};

export default ViewSLAEquipmentPage;
