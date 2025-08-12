import React, { useState, useEffect, useCallback } from 'react';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
    import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
    import { useToast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';
    import { PlusCircle, Edit, Trash2 } from 'lucide-react';

    const VehicleForm = ({ vehicle, onSave, closeDialog }) => {
        const [formData, setFormData] = useState({
            name: '',
            registration_number: '',
            make: '',
            model: '',
            year: '',
            odometer: '',
            fleet_number: '',
            next_service_odometer: ''
        });

        useEffect(() => {
            if (vehicle) {
                setFormData({
                    name: vehicle.name || '',
                    registration_number: vehicle.registration_number || '',
                    make: vehicle.make || '',
                    model: vehicle.model || '',
                    year: vehicle.year || '',
                    odometer: vehicle.odometer || '',
                    fleet_number: vehicle.fleet_number || '',
                    next_service_odometer: vehicle.next_service_odometer || ''
                });
            } else {
                 setFormData({
                    name: '',
                    registration_number: '',
                    make: '',
                    model: '',
                    year: '',
                    odometer: '',
                    fleet_number: '',
                    next_service_odometer: ''
                });
            }
        }, [vehicle]);

        const handleChange = (e) => {
            const { id, value } = e.target;
            setFormData(prev => ({ ...prev, [id]: value }));
        };

        const handleSubmit = () => {
            onSave(formData);
        };

        return (
            <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input id="name" value={formData.name} onChange={handleChange} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="registration_number" className="text-right">Registration</Label>
                    <Input id="registration_number" value={formData.registration_number} onChange={handleChange} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="make" className="text-right">Make</Label>
                    <Input id="make" value={formData.make} onChange={handleChange} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="model" className="text-right">Model</Label>
                    <Input id="model" value={formData.model} onChange={handleChange} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="year" className="text-right">Year</Label>
                    <Input id="year" type="number" value={formData.year} onChange={handleChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="odometer" className="text-right">Current Odometer</Label>
                    <Input id="odometer" type="number" value={formData.odometer} onChange={handleChange} className="col-span-3" />
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit}>Save changes</Button>
                </DialogFooter>
            </div>
        );
    };


    const ManageVehiclesPage = () => {
        const [vehicles, setVehicles] = useState([]);
        const [loading, setLoading] = useState(true);
        const [isDialogOpen, setIsDialogOpen] = useState(false);
        const [selectedVehicle, setSelectedVehicle] = useState(null);
        const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
        const [vehicleToDelete, setVehicleToDelete] = useState(null);
        const { toast } = useToast();

        const fetchVehicles = useCallback(async () => {
            setLoading(true);
            const { data, error } = await supabase.from('vehicles').select('*').order('name');
            if (error) {
                toast({ variant: 'destructive', title: 'Error fetching vehicles', description: error.message });
            } else {
                setVehicles(data);
            }
            setLoading(false);
        }, [toast]);

        useEffect(() => {
            fetchVehicles();
        }, [fetchVehicles]);

        const handleSaveVehicle = async (formData) => {
            const payload = {
                ...formData,
                year: formData.year ? parseInt(formData.year) : null,
                odometer: formData.odometer ? parseInt(formData.odometer) : null,
            }
            const { data, error } = selectedVehicle
                ? await supabase.from('vehicles').update(payload).eq('id', selectedVehicle.id).select().single()
                : await supabase.from('vehicles').insert([payload]).select().single();

            if (error) {
                toast({ variant: 'destructive', title: 'Error saving vehicle', description: error.message });
            } else {
                toast({ title: 'Success!', description: `Vehicle ${selectedVehicle ? 'updated' : 'added'} successfully.` });
                setIsDialogOpen(false);
                fetchVehicles();
            }
        };
        
        const handleDeleteClick = (vehicle) => {
            setVehicleToDelete(vehicle);
            setIsDeleteDialogOpen(true);
        };

        const handleDeleteConfirm = async () => {
            if (!vehicleToDelete) return;
            const { error: expenseError } = await supabase.from('vehicle_expenses').delete().eq('vehicle_id', vehicleToDelete.id);
            if (expenseError) {
                toast({ variant: 'destructive', title: 'Error deleting associated expenses', description: expenseError.message });
                setIsDeleteDialogOpen(false);
                return;
            }

            const { error } = await supabase.from('vehicles').delete().eq('id', vehicleToDelete.id);
            if (error) {
                toast({ variant: 'destructive', title: 'Error deleting vehicle', description: error.message });
            } else {
                toast({ title: 'Success!', description: 'Vehicle deleted successfully.' });
                fetchVehicles();
            }
            setIsDeleteDialogOpen(false);
            setVehicleToDelete(null);
        };
        
        const openAddDialog = () => {
            setSelectedVehicle(null);
            setIsDialogOpen(true);
        };
        
        const openEditDialog = (vehicle) => {
            setSelectedVehicle(vehicle);
            setIsDialogOpen(true);
        };

        return (
            <>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Manage Vehicles</CardTitle>
                                <CardDescription>Add, edit, or view vehicles in your fleet.</CardDescription>
                            </div>
                            <Button onClick={openAddDialog}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Vehicle
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                         {loading ? (
                            <p>Loading vehicles...</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Registration No.</TableHead>
                                        <TableHead>Make</TableHead>
                                        <TableHead>Model</TableHead>
                                        <TableHead>Odometer</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vehicles.map((vehicle) => (
                                        <TableRow key={vehicle.id}>
                                            <TableCell>{vehicle.name}</TableCell>
                                            <TableCell>{vehicle.registration_number}</TableCell>
                                            <TableCell>{vehicle.make}</TableCell>
                                            <TableCell>{vehicle.model}</TableCell>
                                            <TableCell>{vehicle.odometer ? `${vehicle.odometer} km` : 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(vehicle)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(vehicle)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{selectedVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
                        </DialogHeader>
                        <VehicleForm vehicle={selectedVehicle} onSave={handleSaveVehicle} closeDialog={() => setIsDialogOpen(false)} />
                    </DialogContent>
                </Dialog>

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the vehicle and ALL associated expense records.
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

    export default ManageVehiclesPage;