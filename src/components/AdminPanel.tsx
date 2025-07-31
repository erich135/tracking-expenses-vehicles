import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

interface ApprovedEmail {
  id: string;
  email: string;
  created_at: string;
}

const AdminPanel: React.FC = () => {
  const [emails, setEmails] = useState<ApprovedEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
    fetchApprovedEmails();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAdmin(user?.email === 'erich.oberholzer@gmail.com');
  };

  const fetchApprovedEmails = async () => {
    try {
      console.log('Fetching approved emails...');
      const { data, error } = await supabase
        .from('approved_emails')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching emails:', error);
        throw error;
      }
      
      console.log('Fetched emails:', data);
      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to fetch approved emails', 
        variant: 'destructive' 
      });
    }
  };

  const addEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast({ title: 'Error', description: 'Please enter an email address', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const emailToAdd = newEmail.trim();
      console.log('Adding email:', emailToAdd);
      
      // Check if email already exists
      const { data: existingEmails, error: checkError } = await supabase
        .from('approved_emails')
        .select('email')
        .ilike('email', emailToAdd);
      
      if (checkError) {
        console.error('Error checking existing emails:', checkError);
        throw checkError;
      }
      
      if (existingEmails && existingEmails.length > 0) {
        toast({ title: 'Error', description: 'Email already exists in approved list', variant: 'destructive' });
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('approved_emails')
        .insert([{ email: emailToAdd, added_by: 'admin' }])
        .select();
      
      if (error) {
        console.error('Error adding email:', error);
        throw error;
      }
      
      console.log('Email added successfully:', data);
      setNewEmail('');
      await fetchApprovedEmails();
      toast({ title: 'Success', description: `Email added successfully` });
    } catch (error: any) {
      console.error('Add email error:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to add email',
        variant: 'destructive' 
      });
    }
    setLoading(false);
  };

  const removeEmail = async (id: string, email: string) => {
    if (email === 'erich.oberholzer@gmail.com') {
      toast({ title: 'Error', description: 'Cannot remove admin email', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      console.log('Removing email:', email, 'with ID:', id);
      const { error } = await supabase
        .from('approved_emails')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error removing email:', error);
        throw error;
      }
      
      console.log('Email removed successfully');
      await fetchApprovedEmails();
      toast({ title: 'Success', description: `Email removed successfully` });
    } catch (error: any) {
      console.error('Remove email error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to remove email', variant: 'destructive' });
    }
    setLoading(false);
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Access denied. Administrator privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Manage Approved Email Addresses</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addEmail} className="flex gap-2 mb-4">
            <div className="flex-1">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter email address"
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="mt-6" disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Adding...' : 'Add User'}
            </Button>
          </form>
          
          <div className="space-y-2">
            <div className="text-sm text-gray-600 mb-2">
              Total approved emails: {emails.length}
            </div>
            {emails.map((email) => (
              <div key={email.id} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">
                  {email.email}
                  {email.email === 'erich.oberholzer@gmail.com' && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2">(Admin)</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {email.email !== 'erich.oberholzer@gmail.com' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeEmail(email.id, email.email)}
                      disabled={loading}
                    >
                      {loading ? 'Removing...' : 'Remove'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <Button 
            onClick={fetchApprovedEmails} 
            variant="outline" 
            className="mt-4"
            disabled={loading}
          >
            Refresh List
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;