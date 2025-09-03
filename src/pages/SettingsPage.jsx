import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, FileUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const permissionOptions = [
  { id: 'costing', label: 'Costing' },
  { id: 'vehicle_expenses', label: 'Vehicle Expenses' },
  { id: 'workshop_jobs', label: 'Workshop' },
  { id: 'rental', label: 'Rental' },
  { id: 'reports', label: 'Reports' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'sla', label: 'SLA' },
];

const SettingsPage = () => {
  const [slaAccess, setSlaAccess] = useState(false);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchApprovedUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('approved_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error fetching users', description: error.message });
    } else {
      setApprovedUsers(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchApprovedUsers();
  }, [fetchApprovedUsers]);

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      toast({ variant: 'destructive', title: 'Email is required' });
      return;
    }

    const { error } = await supabase
      .from('approved_users')
      .insert({ email: newUserEmail.toLowerCase().trim(), is_admin: false, permissions: [] });

    if (error) {
      toast({ variant: 'destructive', title: 'Error adding user', description: error.message });
    } else {
      toast({ title: 'Success', description: `${newUserEmail} has been added.` });
      setNewUserEmail('');
      fetchApprovedUsers();
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    const { error } = await supabase
      .from('approved_users')
      .delete()
      .eq('id', userToDelete.id);

    if (error) {
      console.error('[delete approved_users]', error);
      toast({ variant: 'destructive', title: 'Error deleting user', description: error.message });
    } else {
      toast({ title: 'Success', description: `${userToDelete.email} has been removed.` });
      fetchApprovedUsers();
    }
    setIsModalOpen(false);
    setUserToDelete(null);
  };

  const handlePermissionChange = async (userId, permission, isChecked) => {
    const user = approvedUsers.find((u) => u.id === userId);
    const currentPermissions = user?.permissions || [];
    const newPermissions = isChecked
      ? [...currentPermissions, permission]
      : currentPermissions.filter((p) => p !== permission);

    updateUser(userId, { permissions: newPermissions });
  };

  const handleAdminChange = async (userId, isAdmin) => {
    updateUser(userId, { is_admin: isAdmin });
  };

  const updateUser = async (userId, updates) => {
    const { error } = await supabase.from('approved_users').update(updates).eq('id', userId);

    if (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
      fetchApprovedUsers(); // revert
    } else {
      toast({ title: 'Permissions updated' });
      setApprovedUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
    }
  };

  return (
    <>
      <Helmet>
        <title>Settings - FleetFlow</title>
        <meta name="description" content="Manage application settings and user access." />
      </Helmet>

      <div className="flex items-center justify-between py-2 border-b">
        <span className="text-sm font-medium">Enable SLA Module Access</span>
        <input
          type="checkbox"
          className="form-checkbox h-5 w-5 text-blue-600"
          checked={slaAccess}
          onChange={() => setSlaAccess(!slaAccess)}
        />
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Add New User</CardTitle>
            <CardDescription>Add an email address to allow a new user to register.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input
                type="email"
                placeholder="user@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
              <Button type="button" onClick={handleAddUser}>
                Add User
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage users who are approved to access this dashboard and their permissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="table-head-bold">
Email</TableHead>
                    <TableHead className="table-head-bold">
Is Admin?</TableHead>
                    <TableHead className="table-head-bold">
Permissions</TableHead>
                    <TableHead className="text-right table-head-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <Switch
                            checked={!!user.is_admin}
                            onCheckedChange={(checked) => handleAdminChange(user.id, !!checked)}
                            disabled={user.email === 'erich.oberholzer@gmail.com'}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {permissionOptions.map((option) => (
                              <div key={option.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${user.id}-${option.id}`}
                                  checked={!!(user.is_admin || (user.permissions || []).includes(option.id))}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(user.id, option.id, !!checked)
                                  }
                                  disabled={!!user.is_admin}
                                />
                                <label
                                  htmlFor={`${user.id}-${option.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {option.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {user.email !== 'erich.oberholzer@gmail.com' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(user)}
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historical Data Import</CardTitle>
            <CardDescription>Upload historical data from CSV files to populate your application.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/settings/import')}>
              <FileUp className="mr-2 h-4 w-4" />
              Go to Data Import Center
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Delete Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
          </DialogHeader>
          <p className="mb-2">
            This will permanently remove <strong>{userToDelete?.email}</strong> and they will lose access to the
            application.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SettingsPage;
