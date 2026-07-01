-- ─────────────────────────────────────────────────────────────────────────────
-- AZILEARN SCHOOL BROADCAST DATABASE PATCH
-- Run this script in your Supabase SQL Editor to support school-wide
-- broadcast assignments.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add school_id column to teachers table if not exists
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS school_id UUID;

-- 2. Add is_broadcast and school_name columns to assignments table
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS school_name TEXT;

-- Create an index for faster school-wide broadcast lookup
CREATE INDEX IF NOT EXISTS idx_assignments_is_broadcast_school ON public.assignments(is_broadcast, school_name);

-- 2. CREATE SECURE BROADCAST RPC FUNCTION
CREATE OR REPLACE FUNCTION public.create_assignment_broadcast(
    p_title TEXT,
    p_school_id UUID,
    p_due_date TIMESTAMPTZ,
    p_grade_assignments JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_block RECORD;
    v_random_code TEXT;
    v_grades_created INTEGER := 0;
    v_teacher_id UUID;
    v_school_name TEXT;
BEGIN
    -- Try to find the school name from any teacher linked to this school_id
    SELECT school_name INTO v_school_name
    FROM public.teachers
    WHERE school_id = p_school_id
    LIMIT 1;

    -- If not found, use a default fallback
    IF v_school_name IS NULL THEN
        v_school_name := 'AziLearn School';
    END IF;

    -- Find or create an Admin teacher for this school to satisfy foreign key constraint
    SELECT id INTO v_teacher_id
    FROM public.teachers
    WHERE name = 'Admin' AND school_id = p_school_id
    LIMIT 1;

    IF v_teacher_id IS NULL THEN
        -- Check if any other teacher exists for this school
        SELECT id INTO v_teacher_id
        FROM public.teachers
        WHERE school_id = p_school_id
        LIMIT 1;

        -- If still not found, create a fallback Admin teacher
        IF v_teacher_id IS NULL THEN
            v_teacher_id := gen_random_uuid();
            INSERT INTO public.teachers (id, name, school_name, school_id, pin)
            VALUES (v_teacher_id, 'Admin', v_school_name, p_school_id, '1234');
        END IF;
    END IF;

    -- Loop through each grade block and insert into assignments
    FOR v_block IN 
        SELECT * FROM jsonb_to_recordset(p_grade_assignments) 
        AS (grade TEXT, subject TEXT, total_marks INTEGER, questions JSONB)
    LOOP
        -- Generate random AC#### code
        v_random_code := 'AC' || (floor(random() * 9000 + 1000)::integer)::text;

        INSERT INTO public.assignments (
            teacher_id,
            title,
            subject,
            grade,
            class_name,
            due_date,
            questions,
            share_code,
            is_broadcast,
            school_name
        ) VALUES (
            v_teacher_id,
            p_title,
            v_block.subject,
            v_block.grade,
            'School Broadcast',
            p_due_date,
            v_block.questions,
            v_random_code,
            TRUE,
            v_school_name
        );

        v_grades_created := v_grades_created + 1;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'share_code', v_random_code,
        'grades_created', v_grades_created,
        'message', 'Holiday assignments broadcasted successfully!'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;

-- Reload PostgREST schema cache to make new columns and functions immediately available
NOTIFY pgrst, 'reload schema';
