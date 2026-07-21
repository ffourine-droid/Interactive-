import { createClient } from '@supabase/supabase-js';

const url = 'https://nfttlgbkdvuutrgmthkz.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .limit(10);
  console.log("Students:", data, "Error:", error);
}

run();
