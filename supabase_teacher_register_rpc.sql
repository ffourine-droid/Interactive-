-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO CREATE THE SECURE TEACHER REGISTER RPC FUNCTION
-- This allows teachers to register securely, automatically handling school link lookup 
-- and preventing duplicate registrations within the same school.

CREATE OR REPLACE FUNCTION public.teacher_register(
    p_email TEXT,
    p_name TEXT,
    p_pin TEXT,
    p_school_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with superuser bypass rules to safely read/write tables regardless of REST client RLS
AS $$
DECLARE
    v_teacher_id UUID;
    v_existing_id UUID;
    v_school_id UUID := NULL;
BEGIN
    -- Trim and clean parameters
    p_name := TRIM(p_name);
    p_school_name := TRIM(COALESCE(p_school_name, 'Unassigned School'));
    p_pin := TRIM(p_pin);
    p_email := TRIM(p_email);

    -- Check if a teacher with this name is already registered under this school
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

    -- Look up the school_id if a school with this name exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schools'
    ) THEN
        EXECUTE 'SELECT id FROM public.schools WHERE LOWER(TRIM(name)) = LOWER($1) LIMIT 1'
        INTO v_school_id
        USING p_school_name;
    END IF;

    -- Generate new teacher ID
    v_teacher_id := gen_random_uuid();

    -- Insert new teacher record
    INSERT INTO public.teachers (id, name, school_name, school_id, pin, email)
    VALUES (
        v_teacher_id,
        p_name,
        p_school_name,
        v_school_id,
        p_pin,
        CASE WHEN p_email = '' THEN NULL ELSE p_email END
    );

    -- Return success payload compatible with frontend client state
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
