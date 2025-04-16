import { createClient } from '@supabase/supabase-js'

// Read environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Basic check to ensure variables are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Anon Key is missing from environment variables.');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey) 