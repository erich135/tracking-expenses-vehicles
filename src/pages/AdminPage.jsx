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
  ShieldCheck,
  ChevronDown,
  ChevronRight
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

// Granular permission structure with sub-permissions
const permissionGroups = [
  { 
    id: 'costing', 
    label: 'Costing', 
    description: 'Vehicle costing module',
    subPermissions: [
      { id: 'costing_add', label: 'Add New' },
      { id: 'costing_view', label: 'View Entries' },
    ]
  },
  { 
    id: 'vehicle_expenses', 
    label: 'Vehicle Expenses', 
    description: 'Manage vehicle expenses',
    subPermissions: [
      { id: 'vehicle_expenses_add', label: 'Add Expense' },
      { id: 'vehicle_expenses_view', label: 'View Expenses' },
      { id: 'vehicle_expenses_manage', label: 'Manage Vehicles' },
    ]
  },
  { 
    id: 'workshop_jobs', 
    label: 'Workshop', 
    description: 'Workshop jobs management',
    subPermissions: [
      { id: 'workshop_jobs_add', label: 'Add New Job' },
      { id: 'workshop_jobs_view', label: 'View Jobs' },
    ]
  },
  { 
    id: 'rental', 
    label: 'Rental', 
    description: 'Rental management',
    subPermissions: [
      { id: 'rental_view_machines', label: 'View Machines' },
      { id: 'rental_add_income', label: 'Add Income' },
      { id: 'rental_add_expense', label: 'Add Expense' },
      { id: 'rental_view_income', label: 'View Income' },
      { id: 'rental_view_expenses', label: 'View Expenses' },
    ]
  },
  { 
    id: 'sla', 
    label: 'SLA', 
    description: 'SLA tracking and management',
    subPermissions: [
      { id: 'sla_equipment', label: 'View Equipment' },
      { id: 'sla_add_expense', label: 'Add Expense' },
      { id: 'sla_add_income', label: 'Add Income' },
      { id: 'sla_view_expenses', label: 'View Expenses' },
      { id: 'sla_view_incomes', label: 'View Incomes' },
    ]
  },
  { 
    id: 'reports', 
    label: 'Reports', 
    description: 'View and generate reports',
    subPermissions: [
      { id: 'reports_all', label: 'All Reports' },
      { id: 'reports_monthly', label: 'Monthly Report' },
    ]
  },
  { 
    id: 'maintenance', 
    label: 'Maintenance', 
    description: 'Maintenance data management',
    subPermissions: [
      { id: 'maintenance_customers', label: 'Customers' },
      { id: 'maintenance_suppliers', label: 'Suppliers' },
      { id: 'maintenance_technicians', label: 'Technicians' },
      { id: 'maintenance_parts', label: 'Parts' },
    ]
  },
];

// Flatten for backward compatibility
const permissionOptions = permissionGroups.map(g => ({ id: g.id, label: g.label, description: g.description }));

// Get all permission IDs (both group-level and sub-permissions)
const getAllPermissionIds = () => {
  const ids = [];
  permissionGroups.forEach(group => {
    ids.push(group.id);
    group.subPermissions.forEach(sub => ids.push(sub.id));
  });
  return ids;
};

const AdminPage = () => {
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [resendingTo, setResendingTo] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedInviteGroups, setExpandedInviteGroups] = useState({});
  
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

  const handleInvitePermissionChange = (permissionId, isChecked, isGroup = false, groupId = null) => {
    setInviteForm(prev => {
      let newPermissions = [...prev.permissions];
      
      if (isGroup) {
        // Toggle entire group
        const group = permissionGroups.find(g => g.id === permissionId);
        if (group) {
          const subIds = group.subPermissions.map(s => s.id);
          if (isChecked) {
            // Add group and all sub-permissions
            if (!newPermissions.includes(permissionId)) newPermissions.push(permissionId);
            subIds.forEach(id => {
              if (!newPermissions.includes(id)) newPermissions.push(id);
            });
          } else {
            // Remove group and all sub-permissions
            newPermissions = newPermissions.filter(p => p !== permissionId && !subIds.includes(p));
          }
        }
      } else if (groupId) {
        // Toggle individual sub-permission
        const group = permissionGroups.find(g => g.id === groupId);
        if (isChecked) {
          if (!newPermissions.includes(permissionId)) newPermissions.push(permissionId);
          // Check if all sub-permissions are now selected, if so add group
          const subIds = group.subPermissions.map(s => s.id);
          const allSelected = subIds.every(id => id === permissionId || newPermissions.includes(id));
          if (allSelected && !newPermissions.includes(groupId)) {
            newPermissions.push(groupId);
          }
        } else {
          newPermissions = newPermissions.filter(p => p !== permissionId);
          // Remove group-level permission if a sub is unchecked
          newPermissions = newPermissions.filter(p => p !== groupId);
        }
      }
      
      return { ...prev, permissions: newPermissions };
    });
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
      permissions: inviteForm.isAdmin ? getAllPermissionIds() : inviteForm.permissions,
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

  const handlePermissionChange = async (userId, permissionId, isChecked, isGroup = false, groupId = null) => {
    const user = approvedUsers.find((u) => u.id === userId);
    if (!user) return;

    let updatedPermissions = [...(user.permissions || [])];

    if (isGroup) {
      // Toggle entire group
      const group = permissionGroups.find(g => g.id === permissionId);
      if (group) {
        const subIds = group.subPermissions.map(s => s.id);
        if (isChecked) {
          // Add group and all sub-permissions
          if (!updatedPermissions.includes(permissionId)) updatedPermissions.push(permissionId);
          subIds.forEach(id => {
            if (!updatedPermissions.includes(id)) updatedPermissions.push(id);
          });
        } else {
          // Remove group and all sub-permissions
          updatedPermissions = updatedPermissions.filter(p => p !== permissionId && !subIds.includes(p));
        }
      }
    } else if (groupId) {
      // Toggle individual sub-permission
      const group = permissionGroups.find(g => g.id === groupId);
      if (isChecked) {
        if (!updatedPermissions.includes(permissionId)) updatedPermissions.push(permissionId);
        // Check if all sub-permissions are now selected, if so add group
        const subIds = group.subPermissions.map(s => s.id);
        const allSelected = subIds.every(id => id === permissionId || updatedPermissions.includes(id));
        if (allSelected && !updatedPermissions.includes(groupId)) {
          updatedPermissions.push(groupId);
        }
      } else {
        updatedPermissions = updatedPermissions.filter(p => p !== permissionId);
        // Remove group-level permission if a sub is unchecked
        updatedPermissions = updatedPermissions.filter(p => p !== groupId);
      }
    } else {
      // Legacy simple toggle
      if (isChecked) {
        if (!updatedPermissions.includes(permissionId)) {
          updatedPermissions.push(permissionId);
        }
      } else {
        updatedPermissions = updatedPermissions.filter((p) => p !== permissionId);
      }
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
                          <div className="space-y-2 max-w-xl">
                            {permissionGroups.map((group) => {
                              const isExpanded = expandedGroups[`${user.id}-${group.id}`];
                              const hasGroupPerm = (user.permissions || []).includes(group.id);
                              const subIds = group.subPermissions.map(s => s.id);
                              const selectedSubs = subIds.filter(id => (user.permissions || []).includes(id));
                              const allSubsSelected = selectedSubs.length === subIds.length;
                              const someSubsSelected = selectedSubs.length > 0 && !allSubsSelected;
                              
                              return (
                                <div key={group.id} className="border rounded-md p-2 bg-muted/30">
                                  <div className="flex items-center justify-between">
                                    <label className="flex items-center space-x-2 text-sm cursor-pointer flex-1">
                                      <Checkbox
                                        checked={hasGroupPerm || allSubsSelected}
                                        ref={(el) => {
                                          if (el) el.indeterminate = someSubsSelected;
                                        }}
                                        onCheckedChange={(checked) =>
                                          handlePermissionChange(user.id, group.id, !!checked, true)
                                        }
                                        disabled={!!user.is_admin}
                                      />
                                      <span className={`font-medium ${user.is_admin ? 'text-muted-foreground' : ''}`}>
                                        {group.label}
                                      </span>
                                      {selectedSubs.length > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                          ({selectedSubs.length}/{subIds.length})
                                        </span>
                                      )}
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedGroups(prev => ({
                                        ...prev,
                                        [`${user.id}-${group.id}`]: !isExpanded
                                      }))}
                                      className="p-1 hover:bg-muted rounded"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                  {isExpanded && (
                                    <div className="mt-2 ml-6 space-y-1 border-l-2 border-muted pl-3">
                                      {group.subPermissions.map((sub) => (
                                        <label key={sub.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                                          <Checkbox
                                            checked={(user.permissions || []).includes(sub.id)}
                                            onCheckedChange={(checked) =>
                                              handlePermissionChange(user.id, sub.id, !!checked, false, group.id)
                                            }
                                            disabled={!!user.is_admin}
                                          />
                                          <span className={user.is_admin ? 'text-muted-foreground' : ''}>
                                            {sub.label}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
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
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/50 max-h-64 overflow-y-auto">
                    {permissionGroups.map((group) => {
                      const isExpanded = expandedInviteGroups[group.id];
                      const hasGroupPerm = inviteForm.permissions.includes(group.id);
                      const subIds = group.subPermissions.map(s => s.id);
                      const selectedSubs = subIds.filter(id => inviteForm.permissions.includes(id));
                      const allSubsSelected = selectedSubs.length === subIds.length;
                      const someSubsSelected = selectedSubs.length > 0 && !allSubsSelected;
                      
                      return (
                        <div key={group.id} className="border rounded-md p-2 bg-background">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center space-x-2 text-sm cursor-pointer flex-1">
                              <Checkbox
                                checked={hasGroupPerm || allSubsSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = someSubsSelected;
                                }}
                                onCheckedChange={(checked) =>
                                  handleInvitePermissionChange(group.id, !!checked, true)
                                }
                              />
                              <span className="font-medium">{group.label}</span>
                              {selectedSubs.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ({selectedSubs.length}/{subIds.length})
                                </span>
                              )}
                            </label>
                            <button
                              type="button"
                              onClick={() => setExpandedInviteGroups(prev => ({
                                ...prev,
                                [group.id]: !isExpanded
                              }))}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="mt-2 ml-6 space-y-1 border-l-2 border-muted pl-3">
                              {group.subPermissions.map((sub) => (
                                <label key={sub.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                                  <Checkbox
                                    checked={inviteForm.permissions.includes(sub.id)}
                                    onCheckedChange={(checked) =>
                                      handleInvitePermissionChange(sub.id, !!checked, false, group.id)
                                    }
                                  />
                                  <span>{sub.label}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
