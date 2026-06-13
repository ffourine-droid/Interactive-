-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO CREATE THE SECURE TEACHER LOGIN RPC FUNCTION

CREATE OR REPLACE FUNCTION public.teacher_login(
    p_name TEXT,
    p_school TEXT,
    p_pin TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with superuser bypass rules to safely read the table regardless of direct REST client RLS
AS $$
DECLARE
    v_teacher RECORD;
BEGIN
    -- Trim whitespace and perform case-insensitive comparison using LOWER(TRIM(x))
    SELECT id, name, school_name, pin
    INTO v_teacher
    FROM public.teachers
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_name))
      AND LOWER(TRIM(school_name)) = LOWER(TRIM(p_school))
    LIMIT 1;

    -- If no record found
    IF v_teacher.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No teacher account found with this Name and School on AziLearn.'
        );
    END IF;

    -- Compare PIN (as trimmed string)
    IF TRIM(v_teacher.pin) <> TRIM(p_pin) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Incorrect 4-Digit PIN. Please try again.'
        );
    END IF;

    -- Return success with the teacher identifier details
    RETURN json_build_object(
        'success', true,
        'message', 'Welcome back!',
        'id', v_teacher.id,
        'name', v_teacher.name,
        'school_name', v_teacher.school_name
    );
END;
$$;
