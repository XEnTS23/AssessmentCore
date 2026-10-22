import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { authService } from "../services/authService";
import { supabase } from "../services/supabaseClient";
import {
  AuthContextType,
  AuthResponse,
  UserProfile,
  UserUsage,
} from "../types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_INIT_TIMEOUT_MS = 15000;
const PROFILE_FETCH_TIMEOUT_MS = 15000;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error(timeoutMessage)),
      timeoutMs,
    );
    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userUsage, setUserUsage] = useState<UserUsage | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        // Expose user to window for debugging
        (window as any).user = currentUser;

        if (currentUser) {
          const [profile, usage] = await withTimeout(
            Promise.all([
              authService.getUserProfile(currentUser.id),
              authService.getUserUsage(currentUser.id),
            ]),
            AUTH_INIT_TIMEOUT_MS,
            "Auth initialization timeout",
          );

          setUserProfile(profile);
          setUserUsage(usage);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
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
      // Only clear user on explicit sign-out — not on transient events
      // like TOKEN_REFRESHED where the session can briefly be null
      if (event === "SIGNED_OUT") {
        setUser(null);
        setUserProfile(null);
        setUserUsage(null);
        // Clear user from window
        (window as any).user = null;
        return;
      }

      // Token refresh — just update the user object, skip re-fetching profile/usage
      if (event === "TOKEN_REFRESHED") {
        if (session?.user) setUser(session.user);
        // Update window user
        (window as any).user = session?.user || null;
        return;
      }

      if (session?.user) {
        setUser(session.user);
        // Expose user to window
        (window as any).user = session.user;
        try {
          const [profile, usage] = await withTimeout(
            Promise.all([
              authService.getUserProfile(session.user.id),
              authService.getUserUsage(session.user.id),
            ]),
            PROFILE_FETCH_TIMEOUT_MS,
            "Profile fetch timeout",
          );

          setUserProfile(profile);
          setUserUsage(usage);
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Keep existing profile/usage data instead of nulling on timeout
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<AuthResponse> => {
    const response = await authService.login(email, password);

    if (response.success && response.user) {
      setUser(response.user);
      // Expose user to window
      (window as any).user = response.user;
      const profile = await authService.getUserProfile(response.user.id);
      setUserProfile(profile);

      const usage = await authService.getUserUsage(response.user.id);
      setUserUsage(usage);
    }

    return response;
  };

  const logout = async (): Promise<AuthResponse> => {
    const response = await authService.logout();

    if (response.success) {
      setUser(null);
      setUserProfile(null);
      setUserUsage(null);
      // Clear user from window
      (window as any).user = null;
    }

    return response;
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

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    userProfile,
    userUsage,
    login,
    logout,
    trackExport,
    trackQuestionsConverted,
    refreshUsage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
