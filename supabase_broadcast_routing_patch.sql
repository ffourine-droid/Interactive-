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
DECLARE
    v_school_name TEXT;
    v_school_id UUID;
    v_has_classes BOOLEAN;
BEGIN
    -- Get teacher's school details
    SELECT school_name, school_id INTO v_school_name, v_school_id
    FROM public.teachers
    WHERE id = p_teacher_id
    LIMIT 1;

    -- Check if teacher has any classes
    SELECT EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.teacher_id = p_teacher_id
           OR EXISTS (SELECT 1 FROM public.teacher_subjects ts WHERE ts.class_id = c.id AND ts.teacher_id = p_teacher_id)
    ) INTO v_has_classes;

    RETURN QUERY
    SELECT DISTINCT a.*
    FROM public.assignments a
    WHERE a.teacher_id = p_teacher_id
       OR (
           (a.is_broadcast = TRUE OR a.created_by_admin = TRUE OR a.class_name = 'School Broadcast')
           AND (
               -- School matching: either no school restriction on either side, or matching names
               v_school_name IS NULL
               OR a.school_name IS NULL
               OR TRIM(a.school_name) = ''
               OR LOWER(REGEXP_REPLACE(v_school_name, '[^a-zA-Z0-9]', '', 'g')) = LOWER(REGEXP_REPLACE(a.school_name, '[^a-zA-Z0-9]', '', 'g'))
               OR LOWER(v_school_name) LIKE '%' || LOWER(TRIM(a.school_name)) || '%'
               OR LOWER(a.school_name) LIKE '%' || LOWER(TRIM(v_school_name)) || '%'
           )
           AND (
               -- Grade matching:
               -- 1. If broadcast is for 'all' or general
               a.grade IS NULL 
               OR LOWER(TRIM(a.grade)) IN ('all', 'all grades', 'general', '')
               -- 2. If teacher has no classes configured yet, allow seeing school broadcasts
               OR NOT v_has_classes
               -- 3. If teacher teaches a class matching this grade
               OR EXISTS (
                   SELECT 1
                   FROM public.classes c
                   LEFT JOIN public.teacher_subjects ts ON ts.class_id = c.id AND ts.teacher_id = p_teacher_id
                   WHERE (c.teacher_id = p_teacher_id OR ts.teacher_id = p_teacher_id)
                     AND (
                         -- Flexible grade matching
                         LOWER(TRIM(c.grade)) = LOWER(TRIM(a.grade))
                         OR REGEXP_REPLACE(c.grade, '[^0-9]', '', 'g') = REGEXP_REPLACE(a.grade, '[^0-9]', '', 'g')
                         OR LOWER(c.name) LIKE '%' || LOWER(TRIM(a.grade)) || '%'
                     )
                     AND (
                         -- Subject matching if teacher_subjects configured, otherwise all subjects allowed
                         ts.subject IS NULL
                         OR a.subject IS NULL
                         OR LOWER(TRIM(ts.subject)) IN ('general', '')
                         OR LOWER(TRIM(a.subject)) IN ('general', '')
                         OR LOWER(TRIM(ts.subject)) = LOWER(TRIM(a.subject))
                         OR LOWER(ts.subject) LIKE '%' || LOWER(TRIM(a.subject)) || '%'
                         OR LOWER(a.subject) LIKE '%' || LOWER(TRIM(ts.subject)) || '%'
                     )
               )
           )
       );
END;
$$;

-- Reload PostgREST schema cache to make updated functions immediately available
NOTIFY pgrst, 'reload schema';
