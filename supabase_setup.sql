-- AZILEARN COMPLETE DATABASE SETUP
-- Run this in your Supabase SQL Editor to initialize/fix your entire database.

-- 1. CLEANUP (Only run these if you need a total reset)
-- DROP TABLE IF EXISTS public.exam_answer_logs CASCADE;
-- DROP TABLE IF EXISTS public.exam_attempts CASCADE;
-- DROP TABLE IF EXISTS public.exams CASCADE;
-- DROP TABLE IF EXISTS public.submissions CASCADE;
-- DROP TABLE IF EXISTS public.parent_acknowledgements CASCADE;
-- DROP TABLE IF EXISTS public.assignments CASCADE;
-- DROP TABLE IF EXISTS public.students CASCADE;
-- DROP TABLE IF EXISTS public.classes CASCADE;
-- DROP TABLE IF EXISTS public.teachers CASCADE;
-- DROP TABLE IF EXISTS public.experiments CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TABLE IF EXISTS public.payments CASCADE;

-- 2. TABLES
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    name TEXT NOT NULL,
    school_name TEXT NOT NULL,
    pin TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    grade TEXT,
    parent_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    class_name TEXT,
    due_date TIMESTAMPTZ,
    questions JSONB DEFAULT '[]',
    expected_students TEXT[],
    short_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    student_name TEXT,
    answers JSONB DEFAULT '{}',
    score INTEGER,
    status TEXT DEFAULT 'pending',
    teacher_comment TEXT,
    parent_feedback TEXT,
    teacher_reply TEXT,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parent_acknowledgements (
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    acknowledged_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    instructions TEXT,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    questions JSONB DEFAULT '[]',
    created_by UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    is_prebuilt BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    is_submitted BOOLEAN DEFAULT false,
    score INTEGER,
    total_marks INTEGER,
    has_overtime BOOLEAN DEFAULT false,
    answers JSONB DEFAULT '{}',
    grading JSONB DEFAULT '{}',
    teacher_feedback TEXT,
    parent_feedback TEXT,
    teacher_reply TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_answer_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL,
    answer TEXT,
    is_overtime BOOLEAN DEFAULT false,
    answered_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.experiments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    keywords TEXT,
    html_content TEXT,
    subject TEXT,
    grade TEXT,
    category TEXT DEFAULT 'notes',
    slides JSONB DEFAULT '[]', 
    audio_url TEXT,
    pdf_url TEXT,
    ppt_url TEXT,
    is_free BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,
    amount INTEGER NOT NULL,
    plan TEXT NOT NULL, 
    lesson_id TEXT,
    transaction_code TEXT,
    status TEXT NOT NULL DEFAULT 'pending', 
    submitted_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    expires_at TIMESTAMPTZ
);

-- 3. ENABLE RLS
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_acknowledgements ENABLE ROW LEVEL SECURITY;
-- Admin table for access control
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add share_code to exams (assessments)
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS target_teacher_name TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS target_school_name TEXT;

-- Add share_code to assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS target_teacher_name TEXT;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS target_school_name TEXT;

-- Indices and Realtime
CREATE INDEX IF NOT EXISTS idx_exams_share_code ON public.exams(share_code);
CREATE INDEX IF NOT EXISTS idx_assignments_share_code ON public.assignments(share_code);

-- Enable Realtime for these tables
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.exams, public.assignments;
COMMIT;

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins are viewable by everyone" ON public.admins FOR SELECT USING (true);

-- Seed current user as admin
INSERT INTO public.admins (id, email)
SELECT id, email FROM auth.users WHERE email = 'ffourine@gmail.com'
ON CONFLICT (email) DO NOTHING;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES (DROP and CREATE to avoid duplicates)
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Allow all" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 5. SEED DATA
INSERT INTO public.experiments (title, keywords, subject, grade, html_content, category, is_free)
VALUES 
('Introduction to Photosynthesis', 'biology, plants, energy', 'Biology', 'Grade 7', '<h1>Photosynthesis</h1><p>Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods with the help of chlorophyll pigments.</p>', 'notes', true),
('Chemical Reactions Basics', 'chemistry, reactions, atoms', 'Chemistry', 'Grade 8', '<h1>Chemical Reactions</h1><p>A chemical reaction is a process that leads to the chemical transformation of one set of chemical substances to another.</p>', 'notes', false),
('Newton''s Laws of Motion', 'physics, motion, force', 'Physics', 'Grade 9', '<h1>Newton''s Laws</h1><p>Newton''s laws of motion are three physical laws that, together, laid the foundation for classical mechanics.</p>', 'notes', true),
('Algebraic Expressions', 'math, algebra, variables', 'Mathematics', 'Grade 10', '<h1>Algebra</h1><p>Algebra is one of the broad areas of mathematics, together with number theory, geometry and analysis.</p>', 'notes', false),
('Plate Tectonics', 'geography, earth, plates', 'Geography', 'Grade 11', '<h1>Plate Tectonics</h1><p>Plate tectonics is a scientific theory describing the large-scale motion of seven large plates and the movements of a larger number of smaller plates of Earth''s lithosphere.</p>', 'notes', true)
ON CONFLICT DO NOTHING;

-- 6. CACHE RELOAD
NOTIFY pgrst, 'reload schema';

-- 7. RECOVERY (Use this only if needed)
-- If "Teacher record not found", run the query below replacing 'YOUR_LOCAL_STORAGE_ID'
-- with the id from your browser console log error.
/*
INSERT INTO public.teachers (id, name, school_name, pin) 
VALUES ('YOUR_LOCAL_STORAGE_ID', 'Admin', 'AziLearn Academy', '0000')
ON CONFLICT (id) DO NOTHING;
*/


