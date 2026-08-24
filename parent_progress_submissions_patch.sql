-- ─────────────────────────────────────────────────────────────────────────────
-- AZILEARN PARENT PORTAL & SUBMISSION VISIBILITY SYNC PATCH
-- Run this script in your Supabase SQL Editor to ensure all student submissions
-- are visible in the Parent Portal across all lookup scenarios.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. SECURE RLS POLICIES FOR ASSIGNMENT SUBMISSIONS & ACKNOWLEDGEMENTS
ALTER TABLE IF EXISTS public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parent_acknowledgements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read assignment submissions" ON public.assignment_submissions;
CREATE POLICY "Public read assignment submissions" 
  ON public.assignment_submissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert assignment submissions" ON public.assignment_submissions;
CREATE POLICY "Public insert assignment submissions" 
  ON public.assignment_submissions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update assignment submissions" ON public.assignment_submissions;
CREATE POLICY "Public update assignment submissions" 
  ON public.assignment_submissions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public read parent acknowledgements" ON public.parent_acknowledgements;
CREATE POLICY "Public read parent acknowledgements" 
  ON public.parent_acknowledgements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert parent acknowledgements" ON public.parent_acknowledgements;
CREATE POLICY "Public insert parent acknowledgements" 
  ON public.parent_acknowledgements FOR INSERT WITH CHECK (true);

-- 2. GET_STUDENT_PROGRESS_FOR_PARENT RPC
-- Robustly matches student submissions by UUIDs and student names so no submissions are missed.
CREATE OR REPLACE FUNCTION public.get_student_progress_for_parent(
    p_student_id UUID,
    p_pin TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student RECORD;
    v_submissions JSONB := '[]'::JSONB;
    v_acknowledgements JSONB := '[]'::JSONB;
    v_all_student_ids TEXT[];
    v_student_name TEXT;
BEGIN
    -- 1. Validate student
    SELECT id, name, grade, class_id, index_number, parent_code
    INTO v_student
    FROM public.students
    WHERE id = p_student_id;

    IF v_student.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Student not found'
        );
    END IF;

    v_student_name := TRIM(v_student.name);

    -- Find all companion/same-student records by ID, index_number, or name
    SELECT ARRAY_AGG(id::text)
    INTO v_all_student_ids
    FROM public.students
    WHERE id = p_student_id
       OR (index_number IS NOT NULL AND index_number = v_student.index_number AND index_number <> '')
       OR (LOWER(TRIM(name)) = LOWER(v_student_name));

    IF v_all_student_ids IS NULL THEN
        v_all_student_ids := ARRAY[p_student_id::text];
    END IF;

    -- 2. Fetch assignment submissions (matching by student_id or student_name)
    SELECT COALESCE(jsonb_agg(sub_row), '[]'::jsonb)
    INTO v_submissions
    FROM (
        SELECT DISTINCT ON (s.assignment_id)
            s.id,
            s.assignment_id,
            s.student_id,
            s.student_name,
            s.score,
            s.answers,
            s.teacher_comment,
            s.parent_feedback,
            s.teacher_reply,
            s.status,
            s.submitted_at
        FROM public.assignment_submissions s
        WHERE s.student_id = ANY(v_all_student_ids)
           OR LOWER(TRIM(s.student_name)) = LOWER(v_student_name)
        ORDER BY s.assignment_id, s.submitted_at DESC
    ) sub_row;

    -- 3. Fetch parent acknowledgements
    SELECT COALESCE(jsonb_agg(ack_row), '[]'::jsonb)
    INTO v_acknowledgements
    FROM (
        SELECT DISTINCT ON (a.assignment_id)
            a.id,
            a.assignment_id,
            a.student_id,
            a.acknowledged_at
        FROM public.parent_acknowledgements a
        WHERE a.student_id::text = ANY(v_all_student_ids)
        ORDER BY a.assignment_id, a.acknowledged_at DESC
    ) ack_row;

    RETURN json_build_object(
        'success', true,
        'student', json_build_object(
            'id', v_student.id,
            'name', v_student.name,
            'grade', v_student.grade,
            'class_id', v_student.class_id,
            'index_number', v_student.index_number
        ),
        'submissions', v_submissions,
        'acknowledgements', v_acknowledgements
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;

-- 3. BACKFILL & REPAIR ANY UNLINKED STUDENT IDS IN ASSIGNMENT_SUBMISSIONS
-- Links submissions that have student_name matching a registered student to their real student_id
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT s.id AS real_student_id, sub.id AS sub_id
        FROM public.assignment_submissions sub
        JOIN public.students s ON LOWER(TRIM(sub.student_name)) = LOWER(TRIM(s.name))
        WHERE sub.student_id IS NULL 
           OR sub.student_id NOT LIKE '%-%-%-%-%'
           OR sub.student_id = sub.student_name
    LOOP
        UPDATE public.assignment_submissions
        SET student_id = r.real_student_id::text
        WHERE id = r.sub_id;
    END LOOP;
END $$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
