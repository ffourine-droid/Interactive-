-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO CREATE THE SECURE STUDENT GET MATERIALS RPC FUNCTION
-- This RPC bypasses PgBouncer session pooling issues with RLS and resolves the active student's 
-- grade and class to safely retrieve matches for visible shared school-specific teacher materials.

CREATE OR REPLACE FUNCTION public.student_get_materials(p_student_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses client-side session RLS restrictions safely
AS $$
DECLARE
    v_student RECORD;
    v_materials JSON;
BEGIN
    -- 1. Fetch active student's current grade and class
    SELECT id, grade, class_id
    INTO v_student
    FROM public.students
    WHERE id = p_student_id;

    IF v_student.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Student account not found',
            'materials', '[]'::json
        );
    END IF;

    -- 2. Fetch teacher materials matches based on visibility, grade, and class scoping
    SELECT json_agg(m)
    INTO v_materials
    FROM (
        SELECT 
            id,
            teacher_id,
            class_id,
            title,
            description,
            file_name,
            file_type,
            storage_path,
            file_size,
            grade,
            subject,
            is_visible,
            created_at
        FROM public.teacher_materials
        WHERE is_visible = true
          AND (grade IS NULL OR grade = v_student.grade)
          AND (class_id IS NULL OR class_id = v_student.class_id)
        ORDER BY created_at DESC
    ) m;

    RETURN json_build_object(
        'success', true,
        'materials', COALESCE(v_materials, '[]'::json)
    );
END;
$$;
