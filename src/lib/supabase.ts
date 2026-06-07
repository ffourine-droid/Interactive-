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
    // Silently fallback in production-like environments to avoid exposing config
    url = defaultUrl;
  }

  return { url, key: isPlaceholder(key) ? defaultKey : key };
};

const { url, key } = getSupabaseConfig();

export const supabase = createClient(url, key);

/**
 * Set the teacher_id context session variable inside Postgres.
 * This is used to bypass RLS or identify which teacher is performing writes.
 */
export async function setTeacherConfig(teacherId: string): Promise<void> {
  if (!teacherId) return;
  try {
    const { error } = await supabase.rpc('set_config', {
      name: 'app.teacher_id',
      value: teacherId,
      is_local: true
    });
    if (error) {
      console.warn("set_config RPC execution warning:", error.message);
    }
  } catch (err) {
    console.warn("Could not execute set_config RPC context helper:", err);
  }
}

