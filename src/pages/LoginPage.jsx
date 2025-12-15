import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, CheckCircle, AlertCircle, Mail, Lock, RefreshCw } from 'lucide-react';

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Show success message if user just set their password
  useEffect(() => {
    if (searchParams.get('passwordSet') === 'true') {
      toast({
        title: 'Password Set Successfully!',
        description: 'You can now log in with your new password.',
      });
    }
  }, [searchParams, toast]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email.toLowerCase(), password);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'Invalid credentials or unconfirmed email.',
      });
      setLoading(false);
      return;
    }

    toast({
      title: 'Welcome Back!',
      description: 'You have successfully logged in.',
    });

    navigate('/');
    setLoading(false);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter your email address.',
      });
      return;
    }

    setResetLoading(true);
    const { error } = await resetPassword(resetEmail.toLowerCase());

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Reset Failed',
        description: error.message || 'Failed to send password reset email.',
      });
      setResetLoading(false);
      return;
    }

    toast({
      title: 'Email Sent',
      description: 'Check your inbox for a password reset link.',
    });

    setResetLoading(false);
    setResetDialogOpen(false);
    setResetEmail('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <img
            src="/Watermark.png"
            alt="Logo"
            className="w-36 mx-auto mb-4"
          />
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline text-right"
                  >
                    Forgot password?
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                      Enter your email address and we'll send you a link to reset your password.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePasswordReset}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="reset-email">Email</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={resetLoading}>
                        {resetLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'Send Reset Link'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm flex-col gap-2">
          <p className="text-muted-foreground">
            Don't have an account? Contact your administrator for an invitation.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
