import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are valid and not default placeholders
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-ref') &&
  supabaseAnonKey !== 'your-anon-public-key'
);

let supabaseInstance = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn('[TimeFlow Supabase] Client initialization failed:', err);
    supabaseInstance = null;
  }
}

// Fallback dummy client if unconfigured or failed, preventing runtime crashes
const dummyClient = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async () => ({ data: null, error: new Error('Cloud sync is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.') }),
    signUp: async () => ({ data: null, error: new Error('Cloud sync is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.') }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ data: null, error: new Error('Cloud sync is not configured yet.') }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
  },
  from: () => ({
    select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
    upsert: () => Promise.resolve({ data: null, error: null }),
    delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
  }),
};

export const supabase = supabaseInstance || dummyClient;

export default supabase;

