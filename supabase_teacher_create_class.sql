-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO CREATE THE SECURE TEACHER CREATE CLASS RPC FUNCTION
-- This function handles the creation of classes and links them with the teacher in teacher_subjects.

CREATE OR REPLACE FUNCTION public.teacher_create_class(
    p_teacher_id UUID,
    p_name TEXT,
    p_grade TEXT
)
RETURNS public.classes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_school_id UUID;
    v_class public.classes;
BEGIN
    -- Get the school_id of the teacher
    SELECT school_id INTO v_school_id
    FROM public.teachers
    WHERE id = p_teacher_id;

    -- Insert into classes
    INSERT INTO public.classes (name, grade, school_id)
    VALUES (p_name, p_grade, v_school_id)
    RETURNING * INTO v_class;

    -- Insert a default mapping into teacher_subjects to associate the teacher with the class
    -- Check if teacher_subjects table exists first to prevent failure if it's missing
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'teacher_subjects'
    ) THEN
        INSERT INTO public.teacher_subjects (teacher_id, class_id, subject)
        VALUES (p_teacher_id, v_class.id, 'General')
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN v_class;
END;
$$;
