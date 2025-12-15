import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Users, 
  Settings, 
  FileUp, 
  UserPlus, 
  Mail, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';

const permissionOptions = [
  { id: 'costing', label: 'Costing', description: 'Access to vehicle costing module' },
  { id: 'vehicle_expenses', label: 'Vehicle Expenses', description: 'Manage vehicle expenses' },
  { id: 'workshop_jobs', label: 'Workshop', description: 'Access workshop jobs' },
  { id: 'rental', label: 'Rental', description: 'Rental management' },
  { id: 'reports', label: 'Reports', description: 'View and generate reports' },
  { id: 'maintenance', label: 'Maintenance', description: 'Maintenance scheduling' },
  { id: 'sla', label: 'SLA', description: 'SLA tracking and management' },
];

const AdminPage = () => {
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [resendingTo, setResendingTo] = useState(null);
  
  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    isAdmin: false,
    permissions: [],
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const { inviteUser, resendInvitation } = useAuth();

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

  // Handle invite form changes
  const handleInviteFormChange = (field, value) => {
    setInviteForm(prev => ({ ...prev, [field]: value }));
  };

  const handleInvitePermissionChange = (permissionId, isChecked) => {
    setInviteForm(prev => ({
      ...prev,
      permissions: isChecked 
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter(p => p !== permissionId)
    }));
  };

  // Handle user invitation
  const handleInviteUser = async () => {
    if (!inviteForm.email.trim() || !inviteForm.firstName.trim() || !inviteForm.lastName.trim()) {
      toast({ variant: 'destructive', title: 'All fields are required' });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteForm.email)) {
      toast({ variant: 'destructive', title: 'Please enter a valid email address' });
      return;
    }

    setInviting(true);
    const result = await inviteUser({
      email: inviteForm.email.trim(),
      firstName: inviteForm.firstName.trim(),
      lastName: inviteForm.lastName.trim(),
      isAdmin: inviteForm.isAdmin,
      permissions: inviteForm.isAdmin ? permissionOptions.map(p => p.id) : inviteForm.permissions,
    });

    if (result.error) {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to invite user', 
        description: result.error.message 
      });
    } else {
      toast({ 
        title: 'User invited successfully!', 
        description: result.warning || `An invitation email has been sent to ${inviteForm.email}` 
      });
      setInviteForm({ email: '', firstName: '', lastName: '', isAdmin: false, permissions: [] });
      setIsInviteModalOpen(false);
      fetchApprovedUsers();
    }
    setInviting(false);
  };

  // Handle resend invitation
  const handleResendInvitation = async (user) => {
    setResendingTo(user.id);
    const { error } = await resendInvitation(user.email);
    
    if (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to resend invitation', 
        description: error.message 
      });
    } else {
      toast({ 
        title: 'Invitation resent', 
        description: `A new invitation email has been sent to ${user.email}` 
      });
      fetchApprovedUsers();
    }
    setResendingTo(null);
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
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

    setIsDeleteModalOpen(false);
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
      fetchApprovedUsers();
    } else {
      toast({ title: 'User updated successfully' });
      setApprovedUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
    }
  };

  const handleActiveChange = async (userId, isActive) => {
    updateUser(userId, { is_active: isActive });
  };

  // Get user status badge
  const getUserStatusBadge = (user) => {
    if (user.is_active === false) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Inactive</Badge>;
    }
    if (!user.password_set) {
      return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
    }
    return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="w-3 h-3" /> Active</Badge>;
  };

  // Stats
  const activeUsers = approvedUsers.filter(u => u.is_active !== false).length;
  const pendingUsers = approvedUsers.filter(u => !u.password_set && u.is_active !== false).length;
  const adminUsers = approvedUsers.filter(u => u.is_admin).length;

  return (
    <>
      <Helmet>
        <title>User Management - TrueCost360</title>
        <meta name="description" content="Administrative dashboard for user management and system settings." />
      </Helmet>

      <div className="max-w-7xl mx-auto py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Invite users, manage permissions, and control access to TrueCost360.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{approvedUsers.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <CheckCircle className="h-4 w-4 ml-auto text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{activeUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
              <Clock className="h-4 w-4 ml-auto text-yellow-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pendingUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administrators</CardTitle>
              <ShieldCheck className="h-4 w-4 ml-auto text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{adminUsers}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed border-primary/50 bg-primary/5"
            onClick={() => setIsInviteModalOpen(true)}
          >
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invite New User</CardTitle>
              <UserPlus className="h-4 w-4 ml-auto text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600 dark:text-gray-400">Send invitation email to a new user</p>
            </CardContent>
          </Card>

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
        </div>

        {/* User Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  Manage user accounts and their permissions.
                </CardDescription>
              </div>
              <Button onClick={() => setIsInviteModalOpen(true)} className="gap-2">
                <UserPlus className="w-4 h-4" />
                Invite User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Users Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Loading users...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : approvedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found. Invite your first user to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvedUsers.map((user) => (
                      <TableRow key={user.id} className={user.is_active === false ? 'opacity-50' : ''}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {user.first_name && user.last_name 
                                ? `${user.first_name} ${user.last_name}` 
                                : user.email}
                            </span>
                            <span className="text-sm text-muted-foreground">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getUserStatusBadge(user)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.is_admin ? (
                              <Badge variant="default" className="gap-1">
                                <Shield className="w-3 h-3" /> Admin
                              </Badge>
                            ) : (
                              <Badge variant="outline">User</Badge>
                            )}
                            <Switch
                              checked={!!user.is_admin}
                              onCheckedChange={(checked) => handleAdminChange(user.id, !!checked)}
                              disabled={user.email === 'erich.oberholzer@gmail.com'}
                            />
                          </div>
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
                                <span className={user.is_admin ? 'text-muted-foreground' : ''}>
                                  {perm.label}
                                </span>
                              </label>
                            ))}
                          </div>
                          {user.is_admin && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Admins have access to all modules
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={user.is_active !== false}
                            onCheckedChange={(checked) => handleActiveChange(user.id, checked)}
                            disabled={user.email === 'erich.oberholzer@gmail.com'}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!user.password_set && user.is_active !== false && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResendInvitation(user)}
                                disabled={resendingTo === user.id}
                                className="gap-1"
                              >
                                {resendingTo === user.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Mail className="w-3 h-3" />
                                )}
                                Resend
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(user)}
                              disabled={user.email === 'erich.oberholzer@gmail.com'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Invite User Modal */}
        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Invite New User
              </DialogTitle>
              <DialogDescription>
                Send an invitation email to a new user. They will receive a link to set their password.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={inviteForm.firstName}
                    onChange={(e) => handleInviteFormChange('firstName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={inviteForm.lastName}
                    onChange={(e) => handleInviteFormChange('lastName', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@company.com"
                  value={inviteForm.email}
                  onChange={(e) => handleInviteFormChange('email', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isAdmin">Administrator Access</Label>
                  <Switch
                    id="isAdmin"
                    checked={inviteForm.isAdmin}
                    onCheckedChange={(checked) => handleInviteFormChange('isAdmin', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Administrators have full access to all modules and can manage other users.
                </p>
              </div>

              {!inviteForm.isAdmin && (
                <div className="space-y-3">
                  <Label>Permissions</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/50">
                    {permissionOptions.map((perm) => (
                      <label key={perm.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={inviteForm.permissions.includes(perm.id)}
                          onCheckedChange={(checked) => handleInvitePermissionChange(perm.id, !!checked)}
                        />
                        <div>
                          <span className="font-medium">{perm.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInviteUser} disabled={inviting} className="gap-2">
                {inviting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <p>
              Are you sure you want to delete <strong>{userToDelete?.email}</strong>?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
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
