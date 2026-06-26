-- ─────────────────────────────────────────────────────────────────────────────
-- SUPABASE STUDENT IDENTITY & QUEST PROGRESS PATCH
-- Run this script in your Supabase SQL Editor to support device-based auto-login
-- and centralized student quest & study progress tracking.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add device-based, school, index and XP tracking columns to students table if not exists
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS school_name TEXT,
ADD COLUMN IF NOT EXISTS index_number TEXT,
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;

-- Create unique index on device_id for high performance mapping
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_device_id ON public.students(device_id);

-- 2. Create the get_student_by_device RPC function
CREATE OR REPLACE FUNCTION public.get_student_by_device(p_device_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student RECORD;
BEGIN
    SELECT id, name, grade, school_name, class_id, index_number, total_xp
    INTO v_student
    FROM public.students
    WHERE device_id = p_device_id
    LIMIT 1;

    IF v_student.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'no_student_for_device'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'student_id', v_student.id,
        'name', v_student.name,
        'grade', v_student.grade,
        'school_name', COALESCE(v_student.school_name, ''),
        'class_id', v_student.class_id,
        'index_number', COALESCE(v_student.index_number, ''),
        'total_xp', COALESCE(v_student.total_xp, 0)
    );
END;
$$;

-- 3. Create RPC to save story quest progress and award XP automatically
CREATE OR REPLACE FUNCTION public.save_story_progress(
    p_student_id UUID,
    p_session_grade TEXT,
    p_subject_id UUID,
    p_current_chapter_id UUID,
    p_current_scene_number INTEGER,
    p_total_xp INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Increment total student XP in their primary account
    UPDATE public.students
    SET total_xp = COALESCE(total_xp, 0) + p_total_xp
    WHERE id = p_student_id;

    -- Centralize progress updates
    INSERT INTO public.student_story_progress (
        student_id,
        subject_id,
        current_chapter_id,
        current_scene_number,
        total_xp,
        updated_at
    )
    VALUES (
        p_student_id::text,
        p_subject_id,
        p_current_chapter_id,
        p_current_scene_number,
        p_total_xp,
        timezone('utc'::text, now())
    )
    ON CONFLICT (student_id, subject_id)
    DO UPDATE SET
        current_chapter_id = EXCLUDED.current_chapter_id,
        current_scene_number = EXCLUDED.current_scene_number,
        total_xp = EXCLUDED.total_xp,
        updated_at = timezone('utc'::text, now());

    RETURN json_build_object(
        'success', true,
        'message', 'Story Quest progress logged successfully'
    );
END;
$$;

-- 4. Create RPC to fetch story quest progress to resume study session correctly
CREATE OR REPLACE FUNCTION public.get_story_progress(
    p_student_id TEXT,
    p_subject_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_progress RECORD;
BEGIN
    SELECT id, student_id, subject_id, current_chapter_id, current_scene_number, completed_chapters, total_xp
    INTO v_progress
    FROM public.student_story_progress
    WHERE student_id = p_student_id AND subject_id = p_subject_id
    LIMIT 1;

    IF v_progress.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No progress found'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'id', v_progress.id,
        'student_id', v_progress.student_id,
        'subject_id', v_progress.subject_id,
        'current_chapter_id', v_progress.current_chapter_id,
        'current_scene_number', v_progress.current_scene_number,
        'completed_chapters', COALESCE(v_progress.completed_chapters, '{}'::uuid[]),
        'total_xp', COALESCE(v_progress.total_xp, 0)
    );
END;
$$;
