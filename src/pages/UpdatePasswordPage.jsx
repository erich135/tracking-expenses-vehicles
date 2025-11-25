import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const UpdatePasswordPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters long.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords Do Not Match',
        description: 'Please ensure both passwords are the same.',
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error Updating Password',
        description: error.message,
      });
    } else {
      toast({
        title: 'Password Updated',
        description: 'You can now log in with your new password.',
      });
      navigate('/login');
    }

    setLoading(false);
  };

  useEffect(() => {
    // Supabase sends tokens in the hash fragment, not query params
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const errorCode = hashParams.get('error_code');
    const errorDescription = hashParams.get('error_description');

    // Check if there's an error in the URL (e.g., expired link)
    if (errorCode) {
      let errorMessage = 'This password reset link is invalid or has expired.';
      
      if (errorCode === 'otp_expired') {
        errorMessage = 'This password reset link has expired. Please request a new one.';
      } else if (errorDescription) {
        errorMessage = errorDescription.replace(/\+/g, ' ');
      }

      toast({
        variant: 'destructive',
        title: 'Link Expired',
        description: errorMessage,
      });
      setValidToken(false);
      setTokenChecked(true);
      return;
    }

    if (accessToken) {
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        })
        .then(({ error }) => {
          if (error) {
            console.error('Failed to set session:', error.message);
            toast({
              variant: 'destructive',
              title: 'Invalid Reset Link',
              description: 'This password reset link is invalid or has expired. Please request a new one.',
            });
            setValidToken(false);
          } else {
            setValidToken(true);
          }
          setTokenChecked(true);
        });
    } else {
      toast({
        variant: 'destructive',
        title: 'No Reset Token',
        description: 'Please use the link from your password reset email.',
      });
      setValidToken(false);
      setTokenChecked(true);
    }
  }, [toast]);

  if (!tokenChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
        <p className="text-center text-lg">Verifying reset link...</p>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Link Expired</CardTitle>
            <CardDescription>
              This password reset link has expired. Password reset links are valid for a limited time for security reasons.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Please return to the login page and click "Forgot password?" to request a new reset link.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Input
                  type="password"
                  placeholder="New password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Input
                  type="password"
                  placeholder="Confirm password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdatePasswordPage;
