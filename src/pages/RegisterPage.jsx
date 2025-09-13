import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Check if email is pre-approved
    const { data: approvedUserData, error: approvedUserError } = await supabase
      .from('approved_users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    if (approvedUserError || !approvedUserData) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: 'This email is not approved. Please contact an administrator.',
      });
      setLoading(false);
      return;
    }

    // 2. Sign up user
    const { error } = await signUp(email.toLowerCase(), password);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Sign up Failed',
        description: error.message || 'An unexpected error occurred.',
      });
      setLoading(false);
      return;
    }

    // 3. Inform user to confirm email
    toast({
      title: 'Registration Successful!',
      description: 'Please check your email and confirm your account before logging in.',
    });

    navigate('/login');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Register</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm">
          Already have an account?
          <Link to="/login" className="underline ml-1">
            Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegisterPage;
