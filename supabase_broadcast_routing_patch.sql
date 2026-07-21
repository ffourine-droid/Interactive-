-- ─────────────────────────────────────────────────────────────────────────────
-- SUPABASE TEACHER ASSIGNMENTS ROUTING PATCH
-- Run this script in your Supabase SQL Editor to make sure school-wide
-- broadcast assignments are correctly routed to all teachers teaching that
-- grade and subject.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.teacher_get_assignments(p_teacher_id UUID)
RETURNS SETOF public.assignments
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses client-side auth/RLS checks to read safely
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT a.*
    FROM public.assignments a
    WHERE a.teacher_id = p_teacher_id
       OR (
           a.is_broadcast = TRUE
           AND EXISTS (
               SELECT 1 FROM public.teachers t 
               WHERE t.id = p_teacher_id 
                 AND LOWER(TRIM(t.school_name)) = LOWER(TRIM(a.school_name))
           )
           AND EXISTS (
               SELECT 1
               FROM public.classes c
               JOIN public.teacher_subjects ts ON ts.class_id = c.id
               WHERE ts.teacher_id = p_teacher_id
                 AND LOWER(TRIM(c.grade)) = LOWER(TRIM(a.grade))
                 AND (
                     LOWER(TRIM(ts.subject)) = LOWER(TRIM(a.subject))
                     OR LOWER(TRIM(ts.subject)) = 'general'
                 )
           )
       );
END;
$$;

-- Reload PostgREST schema cache to make updated functions immediately available
NOTIFY pgrst, 'reload schema';
