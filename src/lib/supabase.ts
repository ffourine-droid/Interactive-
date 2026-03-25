import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  // Default fallback if env vars are missing or placeholders
  const defaultUrl = 'https://nfttlgbkdvuutrgmthkz.supabase.co';
  const defaultKey = 'no-key-provided';

  let url = (envUrl || defaultUrl).trim();
  const key = (envKey || defaultKey).trim();

  // Basic validation to prevent crash and handle common placeholder patterns
  const isPlaceholder = (s: string) => 
    !s || s.toUpperCase().includes('YOUR_') || s.toUpperCase().includes('INSERT_') || s.length < 10 || s.includes('your-');

  if (isPlaceholder(url) || !url.startsWith('http')) {
    console.warn('Supabase URL is missing or invalid. Using fallback for development.');
    url = defaultUrl;
  }

  return { url, key: isPlaceholder(key) ? defaultKey : key };
};

const { url, key } = getSupabaseConfig();

export const supabase = createClient(url, key);
