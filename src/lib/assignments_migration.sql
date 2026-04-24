-- 1. Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id TEXT, -- Or UUID if you use Supabase Auth
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  class_name TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT, -- Student phone or UUID
  student_name TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  score INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' -- 'pending', 'graded'
);

-- 3. Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Allow public access for this prototype)
CREATE POLICY "Allow public read assignments" ON assignments FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert assignments" ON assignments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update assignments" ON assignments FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow public read submissions" ON submissions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert submissions" ON submissions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update submissions" ON submissions FOR UPDATE TO anon USING (true);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_grade ON assignments(grade);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
