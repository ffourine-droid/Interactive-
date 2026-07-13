import { createClient } from '@supabase/supabase-js';

const url = 'https://nfttlgbkdvuutrgmthkz.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!key) {
  console.error("Missing VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function inspectTeacherSubjects() {
  console.log("Inspecting columns of teacher_subjects...");
  // Try inserting a row with a random property 'dummy_col_xyz' to force a column-not-found error,
  // which will print out details or we can see if it lists columns.
  const { data, error } = await supabase
    .from('teacher_subjects')
    .insert({ dummy_col_xyz: 'test' })
    .select();

  console.log("Result error:", error);
}

inspectTeacherSubjects();
