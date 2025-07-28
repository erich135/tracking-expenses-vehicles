import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useVehicleContext } from '@/contexts/VehicleContext';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import AddVehicleForm from './AddVehicleForm';
import EditVehicleForm from './EditVehicleForm';
import { Vehicle } from '@/types';

const VehicleManagement: React.FC = () => {
  const { vehicles, deleteVehicle } = useVehicleContext();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteVehicle(id);
      toast({ title: 'Success', description: 'Vehicle deleted successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete vehicle', variant: 'destructive' });
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
  };

  const closeEditDialog = () => {
    setEditingVehicle(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Vehicle Management</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
            </DialogHeader>
            <AddVehicleForm onClose={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Vehicles ({vehicles?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registration Number</TableHead>
                <TableHead>Fleet Number</TableHead>
                <TableHead>Make & Model</TableHead>
                <TableHead>Odometer</TableHead>
                <TableHead>Next Service</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles?.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">{vehicle.registrationNumber || vehicle.registration_number || 'N/A'}</TableCell>
                  <TableCell>{vehicle.fleetNumber || vehicle.fleet_number || 'N/A'}</TableCell>
                  <TableCell>{vehicle.make || ''} {vehicle.model || ''}</TableCell>
                  <TableCell>{(vehicle.odometer || 0)} km</TableCell>
                  <TableCell>
                    {vehicle.nextServiceOdometer || vehicle.next_service_odometer ? 
                      `${vehicle.nextServiceOdometer || vehicle.next_service_odometer} km` : 
                      'N/A km'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(vehicle)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(vehicle.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) || []}
            </TableBody>
          </Table>
          {(!vehicles || vehicles.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No vehicles added yet. Click "Add Vehicle" to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {editingVehicle && (
        <Dialog open={!!editingVehicle} onOpenChange={closeEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Vehicle</DialogTitle>
            </DialogHeader>
            <EditVehicleForm vehicle={editingVehicle} onClose={closeEditDialog} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default VehicleManagement;