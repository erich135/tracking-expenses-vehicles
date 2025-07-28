import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function Auth() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('type') === 'recovery') {
      setMode('reset');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationError('');
    
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    
    try {
      const originalEmail = email.trim();
      const normalizedEmail = originalEmail.toLowerCase();
      console.log('Checking email:', originalEmail, 'normalized:', normalizedEmail);
      
      const { data: allEmails, error: allError } = await supabase
        .from('approved_emails')
        .select('email');
      
      console.log('All emails from DB:', allEmails);
      
      if (allError) {
        console.error('Database error:', allError);
        setRegistrationError('Database connection error. Please try again.');
        setLoading(false);
        return;
      }
      
      if (!allEmails || allEmails.length === 0) {
        setRegistrationError('No approved emails found in system.');
        setLoading(false);
        return;
      }
      
      const isApproved = allEmails.some(item => {
        const dbEmail = item.email.toLowerCase().trim();
        console.log(`Comparing: DB="${dbEmail}" vs Input="${normalizedEmail}"`);
        return dbEmail === normalizedEmail;
      });
      
      console.log('Final approval result:', isApproved);
      console.log('Email being checked:', originalEmail);
      console.log('Available emails:', allEmails.map(e => e.email));
      
      if (!isApproved) {
        setRegistrationError(`Email "${originalEmail}" is not approved for registration. Available: ${allEmails.map(e => e.email).join(', ')}`);
        setLoading(false);
        return;
      }
      
      const { error } = await supabase.auth.signUp({
        email: originalEmail,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });
      
      if (error) {
        setRegistrationError(error.message);
      } else {
        toast({ title: 'Success', description: 'Check your email for verification link' });
        setMode('login');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setRegistrationError(error.message || 'Registration failed');
    }
    
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#type=recovery`
    });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Password reset email sent. Check your email and follow the link to reset your password.' });
      setMode('login');
    }
    setLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Password updated successfully. You can now log in with your new password.' });
      await supabase.auth.signOut();
      setMode('login');
      clearForm();
      window.location.hash = '';
    }
    setLoading(false);
  };

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setRegistrationError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {mode === 'login' && 'Login'}
            {mode === 'register' && 'Register'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'reset' && 'Set New Password'}
          </h1>
          <p className="text-gray-600">
            {mode === 'login' && 'Enter your credentials to access your account'}
            {mode === 'register' && 'Create a new account (approved emails only)'}
            {mode === 'forgot' && 'Enter your email to reset password'}
            {mode === 'reset' && 'Enter your new password'}
          </p>
        </div>
        
        <form onSubmit={
          mode === 'login' ? handleLogin : 
          mode === 'register' ? handleRegister : 
          mode === 'forgot' ? handleForgotPassword :
          handlePasswordReset
        }>
          {mode === 'register' && (
            <>
              <div className="space-y-2 mb-4">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 mb-4">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </>
          )}
          
          {mode !== 'reset' && (
            <div className="space-y-2 mb-4">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}
          
          {(mode === 'login' || mode === 'register' || mode === 'reset') && (
            <div className="space-y-2 mb-4">
              <Label htmlFor="password">{mode === 'reset' ? 'New Password' : 'Password'}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}
          
          {(mode === 'register' || mode === 'reset') && (
            <div className="space-y-2 mb-4">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}
          
          {mode === 'register' && registrationError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{registrationError}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2 mb-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Loading...' : 
               mode === 'login' ? 'Login' : 
               mode === 'register' ? 'Register' : 
               mode === 'forgot' ? 'Send Reset Email' :
               'Update Password'}
            </Button>
            <Button type="button" variant="outline" onClick={clearForm}>
              Clear
            </Button>
          </div>
        </form>
        
        <div className="text-center space-y-2">
          {mode === 'login' && (
            <>
              <Button variant="link" onClick={() => setMode('register')}>
                Don't have an account? Register
              </Button>
              <br />
              <Button variant="link" onClick={() => setMode('forgot')}>
                Forgot Password?
              </Button>
            </>
          )}
          {mode === 'register' && (
            <Button variant="link" onClick={() => setMode('login')}>
              Already have an account? Login
            </Button>
          )}
          {(mode === 'forgot' || mode === 'reset') && (
            <Button variant="link" onClick={() => setMode('login')}>
              Back to Login
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}