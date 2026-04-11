import { createClient } from '@supabase/supabase-js';

// Get these from your Supabase project settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function getSupabaseConfigErrorMessage(): string {
  return 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment (for Vercel: Project Settings -> Environment Variables), then redeploy.';
}

if (import.meta.env.DEV && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn('⚠️ Supabase environment variables are not set. Auth features will not work.');
  console.warn('Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Use placeholder values if not configured to prevent hanging requests
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      // Endpoint-aware timeout to avoid premature aborts for cold Edge Functions.
      fetch: (url, options = {}) => {
        const controller = new AbortController();
        const urlStr = typeof url === 'string' ? url : String(url);
        const isEdgeFunction = urlStr.includes('/functions/v1/');
        const timeoutMs = isEdgeFunction ? 30000 : 10000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      },
    },
  }
);
