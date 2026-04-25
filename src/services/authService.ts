import { getSupabaseConfigErrorMessage, isSupabaseConfigured, supabase } from './supabaseClient';
import { AuthResponse, UserProfile } from '../types/auth';

function mapAuthError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;

  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Unable to reach authentication service. Check internet access and verify VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set correctly.';
  }

  return message;
}

function getSupabaseGuardError(): AuthResponse {
  return { success: false, error: getSupabaseConfigErrorMessage() };
}

export const authService = {
  // Register a new user
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured) return getSupabaseGuardError();

    try {
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Store user profile
      if (data.user) {
        const { error: profileError } = await supabase.from('user_profiles').insert([
          {
            id: data.user.id,
            email,
            full_name: name,
            created_at: new Date().toISOString(),
          },
        ]);

        if (profileError) {
          console.error('Error creating user profile:', profileError);
        }
      }

      return {
        success: true,
        message: 'Registration successful! Please check your email to verify your account.',
        user: data.user || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error, 'Registration failed'),
      };
    }
  },

  // Login with email and password
  async login(email: string, password: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured) return getSupabaseGuardError();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: 'Login successful!',
        user: data.user || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error, 'Login failed'),
      };
    }
  },

  // Verify email with OTP
  async verifyEmail(email: string, token: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured) return getSupabaseGuardError();

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: 'Email verified successfully!',
        user: data.user || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error, 'Verification failed'),
      };
    }
  },

  // Resend verification email
  async resendVerificationEmail(email: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured) return getSupabaseGuardError();

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: 'Verification email sent! Please check your inbox.',
      };
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error, 'Failed to resend email'),
      };
    }
  },

  // Logout
  async logout(): Promise<AuthResponse> {
    if (!isSupabaseConfigured) return getSupabaseGuardError();

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: 'Logged out successfully!',
      };
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error, 'Logout failed'),
      };
    }
  },

  // Get current user
  async getCurrentUser() {
    if (!isSupabaseConfigured) {
      return null;
    }

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        return null;
      }

      return data.user;
    } catch (error) {
      return null;
    }
  },

  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  // Get user subscription/usage status
  async getUserUsage(userId: string) {
    if (!isSupabaseConfigured) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no usage record exists, create one
        if (error.code === 'PGRST116') {
          const { data: newUsage } = await supabase
            .from('user_usage')
            .insert([
              {
                user_id: userId,
                exports_count: 0,
              },
            ])
            .select()
            .single();
          return {
            ...newUsage,
            is_premium: !!(newUsage as any).is_unlimited
          };
        }
        return null;
      }

      return {
        ...data,
        is_premium: !!(data as any).is_unlimited
      };
    } catch (error) {
      return null;
    }
  },

  // Track QTI export
  async trackExport(userId: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured) return getSupabaseGuardError();

    try {
      const usage = await this.getUserUsage(userId);

      if (!usage) {
        const { error } = await supabase.from('user_usage').insert([
          {
            user_id: userId,
            exports_count: 1,
            total_questions_converted: 0,
          },
        ]);

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          message: 'Export tracked successfully!',
        };
      }

      const { error } = await supabase
        .from('user_usage')
        .update({ exports_count: (usage.exports_count || 0) + 1 })
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: 'Export tracked successfully!',
      };
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error, 'Failed to track export'),
      };
    }
  },

  // Track questions converted
  async trackQuestionsConverted(userId: string, questionCount: number): Promise<AuthResponse> {
    if (!isSupabaseConfigured) return getSupabaseGuardError();

    try {
      const usage = await this.getUserUsage(userId);

      if (!usage) {
        const { error } = await supabase.from('user_usage').insert([
          {
            user_id: userId,
            exports_count: 0,
            total_questions_converted: questionCount,
          },
        ]);

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          message: 'Questions tracked successfully!',
        };
      }

      const { error } = await supabase
        .from('user_usage')
        .update({
          total_questions_converted: (usage.total_questions_converted || 0) + questionCount,
        })
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: 'Questions tracked successfully!',
      };
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error, 'Failed to track questions'),
      };
    }
  },

  // Send password reset email
  async resetPasswordForEmail(email: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured) return getSupabaseGuardError();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: 'Password reset email sent! Please check your inbox.',
      };
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error, 'Failed to send reset email'),
      };
    }
  },

  // Update user password (after reset)
  async updatePassword(newPassword: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured) return getSupabaseGuardError();

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: 'Password updated successfully!',
      };
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error, 'Failed to update password'),
      };
    }
  },
};
