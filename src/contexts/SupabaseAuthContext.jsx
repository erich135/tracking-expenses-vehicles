import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const AuthContext = createContext();

// Super admin email - has full access to everything
const SUPER_ADMIN_EMAIL = 'erich.oberholzer@gmail.com';

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const callInviteApi = async (path, payload) => {
    try {
      if (!session?.access_token) return { skipped: true };

      const doFetch = async (token) => {
        const response = await fetch(path, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        return { response, data };
      };

      // Initial attempt
      let { response, data } = await doFetch(session.access_token);
      if (response.status === 401) {
        // Try to fetch the latest session first
        const fresh = await supabase.auth.getSession();
        const latestToken = fresh?.data?.session?.access_token;
        if (latestToken && latestToken !== session.access_token) {
          ({ response, data } = await doFetch(latestToken));
        }
        // If still unauthorized, try explicit refresh
        if (response.status === 401) {
          const { data: refresh } = await supabase.auth.refreshSession();
          const newToken = refresh?.session?.access_token;
          if (newToken) {
            ({ response, data } = await doFetch(newToken));
          }
        }
      }

      if (!response.ok) {
        return { error: { message: data?.error || 'Invite request failed' }, details: data };
      }
      return { data };
    } catch (err) {
      return { error: { message: err.message || 'Invite request failed' } };
    }
  };

  // Generate a manual invite link for a user (admin only)
  const generateInviteLink = async (email) => {
    const redirectTo = `${window.location.origin}/set-password`;
    const apiResult = await callInviteApi('/api/admin-generate-invite-link', {
      email: email.toLowerCase(),
      redirectTo,
    });
    if (apiResult?.data?.ok && apiResult.data.actionLink) {
      return { actionLink: apiResult.data.actionLink };
    }
    return { error: { message: apiResult?.error?.message || 'Failed to generate invite link' } };
  };

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

  // ✅ Fetch user profile from approved_users table
  const fetchUserProfile = async (user) => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    // 🔑 Super admin override - full access
    if (user.email === SUPER_ADMIN_EMAIL) {
      setUserProfile({
        id: 'super-admin',
        email: user.email,
        first_name: 'Super',
        last_name: 'Admin',
        is_admin: true,
        is_super_admin: true,
        is_active: true,
        password_set: true,
        permissions: ['costing', 'vehicle_expenses', 'workshop_jobs', 'rental', 'sla', 'reports', 'maintenance'],
      });
      return;
    }

    // ✅ Fetch from Supabase approved_users table
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

    // Check if user is active
    if (data.is_active === false) {
      console.warn('User account is deactivated:', user.email);
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      return;
    }

    // ✅ Set user profile with all fields
    setUserProfile({
      ...data,
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      is_super_admin: false,
    });
  };

  // ✅ Refresh user profile (useful after profile updates)
  const refreshUserProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  }, [user]);

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

  // ✅ Sign in with email and password
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

  // ✅ Reset password - sends email with reset link
  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    return { error };
  };

  // ✅ Invite user - creates entry in approved_users and sends invitation email
  const inviteUser = async ({ email, firstName, lastName, isAdmin = false, permissions = [] }) => {
    try {
      const emailLower = email.toLowerCase();
      
      // First check if user already exists in approved_users
      const { data: existingUser } = await supabase
        .from('approved_users')
        .select('id, email, password_set')
        .eq('email', emailLower)
        .single();

      if (existingUser) {
        return { error: { message: 'User with this email already exists' } };
      }

      // Create user entry in approved_users table FIRST
      const { data: newUser, error: insertError } = await supabase
        .from('approved_users')
        .insert({
          email: emailLower,
          first_name: firstName,
          last_name: lastName,
          is_admin: isAdmin,
          is_active: true,
          password_set: false,
          permissions: permissions,
          invitation_sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        return { error: insertError };
      }

      // Prefer server-side admin invite when available (more reliable when signups are disabled)
      const redirectTo = `${window.location.origin}/set-password`;
      const apiResult = await callInviteApi('/api/admin-invite', {
        email: emailLower,
        redirectTo,
        firstName,
        lastName,
      });

      if (apiResult?.data?.ok) {
        const actionLink = apiResult.data.actionLink;
        const warning = apiResult.data.emailSent
          ? null
          : (apiResult.data.warning || 'Invite email could not be sent automatically') +
            (actionLink ? `\nManual link: ${actionLink}` : '');

        if (!apiResult.data.emailSent) {
          console.warn('[inviteUser] server-side invite did not send email:', apiResult.data.warning);
        }

        return warning ? { data: newUser, warning } : { data: newUser };
      }

      if (apiResult?.error) {
        console.warn('[inviteUser] server-side invite failed:', apiResult.error.message);
      }

      // Generate a random temporary password (user will reset it)
      const tempPassword = crypto.randomUUID() + 'Aa1!';
      
      // Create the user in Supabase Auth with temporary password
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: emailLower,
        password: tempPassword,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: `${window.location.origin}/set-password`,
        }
      });

      if (signUpError) {
        console.warn('SignUp error:', signUpError.message);

        // If signups are disabled, continuing would misleadingly report "sent".
        const msg = (signUpError.message || '').toLowerCase();
        if (msg.includes('signups') || msg.includes('signup') || msg.includes('not allowed') || msg.includes('disabled')) {
          return {
            data: newUser,
            warning:
              'User was added to approved users, but Supabase Auth signups appear disabled, so an invitation email cannot be sent from the browser. Configure the server-side invite endpoint (/api/admin-invite) or enable Auth signups in Supabase.',
          };
        }
      }

      // Now send password reset email so user can set their own password
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailLower, {
        redirectTo: `${window.location.origin}/set-password`,
      });
      
      if (resetError) {
        console.warn('Could not send invitation email:', resetError.message);
        return { 
          data: newUser, 
          warning: 'User created but invitation email could not be sent. Please resend invitation.' 
        };
      }

      return { data: newUser };
    } catch (err) {
      return { error: { message: err.message || 'Failed to invite user' } };
    }
  };

  // ✅ Resend invitation to a user
  const resendInvitation = async (email) => {
    const redirectTo = `${window.location.origin}/set-password`;
    const apiResult = await callInviteApi('/api/admin-resend-invite', {
      email: email.toLowerCase(),
      redirectTo,
    });

    if (apiResult?.data?.ok) {
      // Update invitation_sent_at timestamp
      await supabase
        .from('approved_users')
        .update({ invitation_sent_at: new Date().toISOString() })
        .eq('email', email.toLowerCase());

      if (apiResult.data.emailSent) {
        return { error: null };
      }

      return {
        error: {
          message:
            (apiResult.data.warning || 'Invite email could not be sent automatically') +
            (apiResult.data.actionLink ? `\nManual link: ${apiResult.data.actionLink}` : ''),
        },
      };
    }

    // Do not send reset-password email for invites; surface manual-link guidance instead
    return {
      error: {
        message:
          'Could not send the invite automatically. Please use the manual link if provided, or try again shortly.',
      },
    };
  };

  // ✅ Check if user has a specific permission
  const hasPermission = useCallback((permission) => {
    if (!userProfile) return false;
    if (userProfile.is_super_admin || userProfile.is_admin) return true;
    return (userProfile.permissions || []).includes(permission);
  }, [userProfile]);

  // ✅ Check if user is admin (includes super admin)
  const isAdmin = userProfile?.is_admin || userProfile?.is_super_admin || false;
  const isSuperAdmin = userProfile?.is_super_admin || false;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      userProfile, 
      loading, 
      signIn, 
      signOut, 
      resetPassword,
      inviteUser,
      resendInvitation,
      generateInviteLink,
      refreshUserProfile,
      hasPermission,
      isAdmin,
      isSuperAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
