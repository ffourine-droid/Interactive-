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
    school_id UUID,
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
    share_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
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
    parent_code TEXT,
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
    share_code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_exams_share_code ON public.exams(share_code);
CREATE INDEX IF NOT EXISTS idx_assignments_share_code ON public.assignments(share_code);

-- Enable Realtime
ALTER TABLE public.exams REPLICA IDENTITY FULL;
ALTER TABLE public.assignments REPLICA IDENTITY FULL;
ALTER TABLE public.admin_assignments REPLICA IDENTITY FULL;

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
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_acknowledgements ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Master table for shared work created by admins
CREATE TABLE IF NOT EXISTS public.admin_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    type TEXT DEFAULT 'assessment',
    questions JSONB NOT NULL,
    share_code TEXT UNIQUE NOT NULL,
    target_teacher_name TEXT,
    target_school_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_admin_assignments_share_code ON public.admin_assignments(share_code);
CREATE INDEX IF NOT EXISTS idx_students_parent_code ON public.students(parent_code);
CREATE INDEX IF NOT EXISTS idx_students_name_grade ON public.students(name, grade);

-- Enable Realtime
ALTER TABLE public.admin_assignments REPLICA IDENTITY FULL;
-- We'll assume publication setup handles this or use:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_assignments;

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

-- 8. SECURE TEACHER LOGIN RPC FUNCTION
CREATE OR REPLACE FUNCTION public.teacher_login(
    p_name TEXT,
    p_school TEXT,
    p_pin TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_teacher RECORD;
BEGIN
    SELECT id, name, school_name, pin
    INTO v_teacher
    FROM public.teachers
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_name))
      AND LOWER(TRIM(school_name)) = LOWER(TRIM(p_school))
    LIMIT 1;

    IF v_teacher.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No teacher account found with this Name and School on AziLearn.'
        );
    END IF;

    IF TRIM(v_teacher.pin) <> TRIM(p_pin) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Incorrect 4-Digit PIN. Please try again.'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Welcome back!',
        'id', v_teacher.id,
        'name', v_teacher.name,
        'school_name', v_teacher.school_name
    );
END;
$$;


-- 9. SECURE TEACHER REGISTER RPC FUNCTION
CREATE OR REPLACE FUNCTION public.teacher_register(
    p_email TEXT,
    p_name TEXT,
    p_pin TEXT,
    p_school_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_teacher_id UUID;
    v_existing_id UUID;
    v_school_id UUID := NULL;
BEGIN
    p_name := TRIM(p_name);
    p_school_name := TRIM(COALESCE(p_school_name, 'Unassigned School'));
    p_pin := TRIM(p_pin);
    p_email := TRIM(p_email);

    SELECT id INTO v_existing_id
    FROM public.teachers
    WHERE LOWER(TRIM(name)) = LOWER(p_name)
      AND LOWER(TRIM(school_name)) = LOWER(p_school_name)
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'A teacher with this name is already registered under this school.'
        );
    END IF;

    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schools'
    ) THEN
        EXECUTE 'SELECT id FROM public.schools WHERE LOWER(TRIM(name)) = LOWER($1) LIMIT 1'
        INTO v_school_id
        USING p_school_name;
    END IF;

    v_teacher_id := gen_random_uuid();

    INSERT INTO public.teachers (id, name, school_name, school_id, pin, email)
    VALUES (
        v_teacher_id,
        p_name,
        p_school_name,
        v_school_id,
        p_pin,
        CASE WHEN p_email = '' THEN NULL ELSE p_email END
    );

    RETURN json_build_object(
        'success', true,
        'message', 'Welcome back!',
        'id', v_teacher_id,
        'name', p_name,
        'school_name', p_school_name,
        'school_id', v_school_id,
        'school_linked', (v_school_id IS NOT NULL)
    );
END;
$$;




