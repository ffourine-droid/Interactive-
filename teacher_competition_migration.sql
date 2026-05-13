-- TEACHER COMPETITION AND REQUESTS SYSTEM
-- Run this in your Supabase SQL Editor

-- 1. Teacher Competitions
CREATE TABLE IF NOT EXISTS public.teacher_competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    status TEXT DEFAULT 'draft', -- 'draft', 'active', 'marking', 'finished'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Questions for Competitions
CREATE TABLE IF NOT EXISTS public.teacher_competition_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES public.teacher_competitions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    type TEXT NOT NULL, -- 'mcq', 'short_answer'
    options TEXT[], -- For MCQ
    correct_answer TEXT NOT NULL,
    points INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Participants
CREATE TABLE IF NOT EXISTS public.teacher_competition_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES public.teacher_competitions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    is_finished BOOLEAN DEFAULT false,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(competition_id, student_id)
);

-- 4. Responses
CREATE TABLE IF NOT EXISTS public.teacher_competition_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES public.teacher_competitions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.teacher_competition_questions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    is_correct BOOLEAN, -- NULL means needs marking
    points_awarded INTEGER DEFAULT 0,
    graded_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Question Requests
CREATE TABLE IF NOT EXISTS public.question_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL,
    teacher_name TEXT NOT NULL,
    school_name TEXT,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    topic TEXT NOT NULL,
    num_questions INTEGER DEFAULT 10,
    description TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Enable Realtime
ALTER TABLE public.teacher_competitions REPLICA IDENTITY FULL;
ALTER TABLE public.teacher_competition_participants REPLICA IDENTITY FULL;

-- 7. RLS
ALTER TABLE public.teacher_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_competition_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_competition_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_competition_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_requests ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['teacher_competitions', 'teacher_competition_questions', 'teacher_competition_participants', 'teacher_competition_responses', 'question_requests']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Allow all" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 8. Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
