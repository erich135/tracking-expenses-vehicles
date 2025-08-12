import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (user) => {
    if (!user) {
      return null;
    }

    if (user.email === 'erich.oberholzer@gmail.com') {
      return { 
        is_admin: true, 
        permissions: ['costing', 'vehicle_expenses', 'workshop_jobs', 'rental', 'reports', 'maintenance', 'settings'] 
      };
    }

    const { data, error } = await supabase
      .from('approved_users')
      .select('is_admin, permissions')
      .eq('email', user.email)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data || { is_admin: false, permissions: [] };
  }, []);

  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
            const profile = await fetchUserProfile(session.user);
            setUserProfile(profile);
        } else {
            setUserProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signUp = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Sign up Failed',
        description: error.message || 'Something went wrong',
      });
    }
    return { error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Sign in Failed',
        description: error.message || 'Something went wrong',
      });
    }
    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Sign out Failed',
        description: error.message || 'Something went wrong',
      });
    }
    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    user: session?.user ?? null,
    session,
    loading,
    userProfile,
    signUp,
    signIn,
    signOut,
  }), [session, loading, userProfile, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
