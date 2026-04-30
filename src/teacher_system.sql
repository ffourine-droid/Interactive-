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
  grade TEXT NOT NULL,
  parent_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PARENT ACKNOWLEDGEMENTS TABLE
CREATE TABLE IF NOT EXISTS parent_acknowledgements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_code TEXT NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. UPDATE ASSIGNMENTS TABLE
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

-- 6. RLS POLICIES
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_acknowledgements ENABLE ROW LEVEL SECURITY;

-- Teachers policies
DROP POLICY IF EXISTS "Anyone can signup" ON teachers;
CREATE POLICY "Anyone can signup" ON teachers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can read teachers" ON teachers;
CREATE POLICY "Anyone can read teachers" ON teachers FOR SELECT USING (true);

-- Classes policies
DROP POLICY IF EXISTS "Anyone can read classes" ON classes;
CREATE POLICY "Anyone can read classes" ON classes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert classes" ON classes;
CREATE POLICY "Anyone can insert classes" ON classes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can delete classes" ON classes;
CREATE POLICY "Anyone can delete classes" ON classes FOR DELETE USING (true);

-- Students policies
DROP POLICY IF EXISTS "Anyone can read students" ON students;
CREATE POLICY "Anyone can read students" ON students FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert students" ON students;
CREATE POLICY "Anyone can insert students" ON students FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can delete students" ON students;
CREATE POLICY "Anyone can delete students" ON students FOR DELETE USING (true);

-- Assignments policies
DROP POLICY IF EXISTS "Anyone can read assignments" ON assignments;
CREATE POLICY "Anyone can read assignments" ON assignments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert assignments" ON assignments;
CREATE POLICY "Anyone can insert assignments" ON assignments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update assignments" ON assignments;
CREATE POLICY "Anyone can update assignments" ON assignments FOR UPDATE USING (true);

-- Submissions policies
DROP POLICY IF EXISTS "Anyone can read submissions" ON submissions;
CREATE POLICY "Anyone can read submissions" ON submissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert submissions" ON submissions;
CREATE POLICY "Anyone can insert submissions" ON submissions FOR INSERT WITH CHECK (true);

-- Parent Acknowledgements policies
DROP POLICY IF EXISTS "Anyone can read parent_acknowledgements" ON parent_acknowledgements;
CREATE POLICY "Anyone can read parent_acknowledgements" ON parent_acknowledgements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert parent_acknowledgements" ON parent_acknowledgements;
CREATE POLICY "Anyone can insert parent_acknowledgements" ON parent_acknowledgements FOR INSERT WITH CHECK (true);
