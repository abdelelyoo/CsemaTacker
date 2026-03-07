import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isConfigured = supabaseUrl && supabaseKey && isValidUrl(supabaseUrl);

if (!isConfigured) {
  console.warn('Supabase credentials not found or invalid. Using local storage mode.');
}

export const supabase: SupabaseClient | null = isConfigured 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const isSupabaseConfigured = () => {
  return isConfigured;
};
