-- Update assignments table to include expected students
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS expected_students TEXT[] DEFAULT '{}';

-- Update submissions table to include teacher comments
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS teacher_comment TEXT;

-- Refresh schema cache (Supabase specific, optional but helpful)
NOTIFY pgrst, 'reload schema';
