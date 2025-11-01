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
import { Trash2, Users, Settings, FileUp } from 'lucide-react';
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

const AdminPage = () => {
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
      toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
    } else {
      toast({ title: 'User deleted', description: `${userToDelete.email} has been removed.` });
      fetchApprovedUsers();
    }

    setIsModalOpen(false);
    setUserToDelete(null);
  };

  const handlePermissionChange = async (userId, permissionId, isChecked) => {
    const user = approvedUsers.find((u) => u.id === userId);
    if (!user) return;

    let updatedPermissions = user.permissions || [];

    if (isChecked) {
      if (!updatedPermissions.includes(permissionId)) {
        updatedPermissions.push(permissionId);
      }
    } else {
      updatedPermissions = updatedPermissions.filter((p) => p !== permissionId);
    }

    updateUser(userId, { permissions: updatedPermissions });
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
        <title>Admin Dashboard - FleetFlow</title>
        <meta name="description" content="Administrative dashboard for user management and system settings." />
      </Helmet>

      <div className="max-w-7xl mx-auto py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage users, permissions, and system settings for FleetFlow.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/settings/audit')}>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Audit Trail</CardTitle>
              <FileUp className="h-4 w-4 ml-auto" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600 dark:text-gray-400">View system activity logs</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/settings/import')}>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Import</CardTitle>
              <Settings className="h-4 w-4 ml-auto" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600 dark:text-gray-400">Bulk import data</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 ml-auto" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{approvedUsers.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Add new users and manage their permissions for different modules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Add User Section */}
            <div className="flex gap-4 mb-6">
              <Input
                type="email"
                placeholder="Enter user email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddUser}>Add User</Button>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Is Admin?</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                          <div className="flex flex-wrap gap-2 max-w-md">
                            {permissionOptions.map((perm) => (
                              <label key={perm.id} className="flex items-center space-x-1 text-sm">
                                <Checkbox
                                  checked={(user.permissions || []).includes(perm.id)}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(user.id, perm.id, !!checked)
                                  }
                                  disabled={!!user.is_admin}
                                />
                                <span>{perm.label}</span>
                              </label>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(user)}
                            disabled={user.email === 'erich.oberholzer@gmail.com'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
            </DialogHeader>
            <p>
              Are you sure you want to delete <strong>{userToDelete?.email}</strong>? This action cannot be undone.
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
      </div>
    </>
  );
};

export default AdminPage;
