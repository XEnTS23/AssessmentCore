import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { AuthContextType, AuthResponse, UserProfile, UserUsage } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userUsage, setUserUsage] = useState<UserUsage | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Add timeout to prevent hanging on invalid/missing Supabase config
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth initialization timeout')), 5000)
        );

        const authPromise = (async () => {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);

          if (currentUser) {
            // Fetch user profile
            const profile = await authService.getUserProfile(currentUser.id);
            setUserProfile(profile);

            // Fetch user usage
            const usage = await authService.getUserUsage(currentUser.id);
            setUserUsage(usage);
          }
        })();

        await Promise.race([authPromise, timeoutPromise]);
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Even on error/timeout, we continue with unauthenticated state
        setUser(null);
        setUserProfile(null);
        setUserUsage(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Redirect to reset password page when user clicks the email link
      if (event === 'PASSWORD_RECOVERY') {
        setUser(session?.user || null);
        window.location.href = '/auth/reset-password';
        return;
      }

      // Only clear user on explicit sign-out — not on transient events
      // like TOKEN_REFRESHED where the session can briefly be null
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
        setUserUsage(null);
        return;
      }

      // Token refresh — just update the user object, skip re-fetching profile/usage
      if (event === 'TOKEN_REFRESHED') {
        if (session?.user) setUser(session.user);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        try {
          // Add timeout protection for profile and usage fetch
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
          );

          const fetchPromise = (async () => {
            const profile = await authService.getUserProfile(session.user.id);
            setUserProfile(profile);

            const usage = await authService.getUserUsage(session.user.id);
            setUserUsage(usage);
          })();

          await Promise.race([fetchPromise, timeoutPromise]);
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Keep existing profile/usage data instead of nulling on timeout
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const response = await authService.login(email, password);

    if (response.success && response.user) {
      setUser(response.user);
      const profile = await authService.getUserProfile(response.user.id);
      setUserProfile(profile);

      const usage = await authService.getUserUsage(response.user.id);
      setUserUsage(usage);
    }

    return response;
  };

  const register = async (email: string, password: string, name: string): Promise<AuthResponse> => {
    const response = await authService.register(email, password, name);

    if (response.success && response.user) {
      setUser(response.user);
      const profile = await authService.getUserProfile(response.user.id);
      setUserProfile(profile);
    }

    return response;
  };

  const logout = async (): Promise<AuthResponse> => {
    const response = await authService.logout();

    if (response.success) {
      setUser(null);
      setUserProfile(null);
      setUserUsage(null);
    }

    return response;
  };

  const verifyEmail = async (email: string, token: string): Promise<AuthResponse> => {
    const response = await authService.verifyEmail(email, token);

    if (response.success && response.user) {
      setUser(response.user);
    }

    return response;
  };

  const resendVerificationEmail = (email: string): Promise<AuthResponse> => {
    return authService.resendVerificationEmail(email);
  };

  const trackExport = async () => {
    if (user) {
      await authService.trackExport(user.id);
      const usage = await authService.getUserUsage(user.id);
      setUserUsage(usage);
    }
  };

  const trackQuestionsConverted = async (count: number) => {
    if (user) {
      await authService.trackQuestionsConverted(user.id, count);
      const usage = await authService.getUserUsage(user.id);
      setUserUsage(usage);
    }
  };

  const refreshUsage = async () => {
    if (user) {
      const usage = await authService.getUserUsage(user.id);
      setUserUsage(usage);
    }
  };

  const resetPasswordForEmail = async (email: string): Promise<AuthResponse> => {
    return authService.resetPasswordForEmail(email);
  };

  const updatePassword = async (newPassword: string): Promise<AuthResponse> => {
    return authService.updatePassword(newPassword);
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    userProfile,
    userUsage,
    login,
    register,
    logout,
    verifyEmail,
    resendVerificationEmail,
    trackExport,
    trackQuestionsConverted,
    refreshUsage,
    resetPasswordForEmail,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
