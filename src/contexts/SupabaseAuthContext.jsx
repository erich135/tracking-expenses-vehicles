import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Handle session and user setup
  const handleSession = useCallback(async (session) => {
    setSession(session);
    const currentUser = session?.user ?? null;
    setUser(currentUser);

    if (currentUser) {
      await fetchUserProfile(currentUser);
    } else {
      setUserProfile(null);
    }

    setLoading(false);
  }, []);

  // ✅ Fetch user profile (hybrid: new + old)
  const fetchUserProfile = async (user) => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    // 🔑 Super admin override (old behavior)
    if (user.email === 'erich.oberholzer@gmail.com') {
      setUserProfile({
        email: user.email,
        is_admin: true,
        permissions: ['costing', 'vehicle_expenses', 'workshop_jobs', 'rental', 'sla', 'reports', 'maintenance'],
      });
      return;
    }

    // ✅ Fetch from Supabase
    const { data, error } = await supabase
      .from('approved_users')
      .select('*')
      .eq('email', user.email)
      .single();

    if (error || !data) {
      console.warn('User not approved or profile fetch failed:', user.email);
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      return;
    }

    // ✅ If permissions missing, fallback to admin-only flag
    setUserProfile({
      ...data,
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
    });
  };

  // ✅ Init session
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      handleSession(data.session);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [handleSession]);

  // ✅ Sign in
  const signIn = async (email, password) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    return { error, data };
  };

  // ✅ Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    setSession(null);
  };

  // ✅ Reset password
  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
      // Note: Email link expiry is controlled in Supabase Dashboard under Authentication > Email Templates
      // The OTP expiry setting is in Authentication > Settings (default is often 60 seconds)
      // To increase it, go to: Supabase Dashboard > Authentication > Settings > Email Auth > 
      // "Email OTP Expiry" and set it to 1200 seconds (20 minutes)
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, userProfile, loading, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
