-- 1. TEACHERS TABLE
CREATE TABLE IF NOT EXISTS teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  school_name TEXT NOT NULL,
  pin TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CLASSES TABLE
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. UPDATE ASSIGNMENTS TABLE
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='assignments' AND column_name='teacher_id'
  ) THEN
    ALTER TABLE assignments ADD COLUMN teacher_id UUID REFERENCES teachers(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='assignments' AND column_name='class_id'
  ) THEN
    ALTER TABLE assignments ADD COLUMN class_id UUID REFERENCES classes(id);
  END IF;
END $$;

-- 5. RLS POLICIES
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Teachers policies
CREATE POLICY "Anyone can signup" ON teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read teachers" ON teachers FOR SELECT USING (true);

-- Classes policies
CREATE POLICY "Anyone can read classes" ON classes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert classes" ON classes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete classes" ON classes FOR DELETE USING (true);

-- Students policies
CREATE POLICY "Anyone can read students" ON students FOR SELECT USING (true);
CREATE POLICY "Anyone can insert students" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete students" ON students FOR DELETE USING (true);

-- Assignments policies
CREATE POLICY "Anyone can read assignments" ON assignments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert assignments" ON assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update assignments" ON assignments FOR UPDATE USING (true);

-- Submissions policies
CREATE POLICY "Anyone can read submissions" ON submissions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert submissions" ON submissions FOR INSERT WITH CHECK (true);
