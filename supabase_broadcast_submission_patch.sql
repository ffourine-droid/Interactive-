-- ─────────────────────────────────────────────────────────────────────────────
-- SUPABASE STUDENT BROADCAST & SCHOOL ASSIGNMENT SUBMISSION PATCH
-- Run this script in your Supabase SQL Editor to resolve the "No active student session"
-- submission error and support seamless passwordless guest student submissions.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. REDEFINE SUBMIT_BROADCAST_ASSIGNMENT TO SUPPORT PASSWORDLESS STUDENTS
CREATE OR REPLACE FUNCTION public.submit_broadcast_assignment(
    p_student_id UUID,
    p_assignment_id UUID,
    p_answers JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses client-side auth/RLS checks to write safely
AS $$
DECLARE
    v_student RECORD;
    v_assignment RECORD;
    v_submission_id UUID;
    v_mcq_count INTEGER := 0;
    v_correct_count INTEGER := 0;
    v_score INTEGER := NULL;
    v_q RECORD;
    v_ans TEXT;
BEGIN
    -- Resolve student (must exist in students table)
    SELECT id, name, grade
    INTO v_student
    FROM public.students
    WHERE id = p_student_id;

    IF v_student.id IS NULL THEN
        -- Fallback: Check if we can find by p_student_id as string/device
        SELECT id, name, grade
        INTO v_student
        FROM public.students
        WHERE device_id = p_student_id::text
        LIMIT 1;
        
        IF v_student.id IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'message', 'Student account not found on AziLearn. Please re-register or select your name.'
            );
        END IF;
    END IF;

    -- Resolve assignment (must exist)
    SELECT id, title, questions, teacher_id, grade
    INTO v_assignment
    FROM public.assignments
    WHERE id = p_assignment_id;

    IF v_assignment.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Assignment not found.'
        );
    END IF;

    -- Calculate score for MCQs
    FOR v_q IN SELECT * FROM jsonb_to_recordset(v_assignment.questions) AS (id TEXT, type TEXT, correct_option INTEGER)
    LOOP
        IF v_q.type = 'mcq' THEN
            v_mcq_count := v_mcq_count + 1;
            v_ans := p_answers->>v_q.id;
            IF v_ans IS NOT NULL AND v_ans::integer = v_q.correct_option THEN
                v_correct_count := v_correct_count + 1;
            END IF;
        END IF;
    END LOOP;

    IF v_mcq_count > 0 THEN
        v_score := round((v_correct_count::float / v_mcq_count::float) * 100);
    END IF;

    -- Upsert assignment submission (prevent duplicate submission rows)
    SELECT id INTO v_submission_id
    FROM public.assignment_submissions
    WHERE assignment_id = p_assignment_id
      AND student_id = v_student.id::text;

    IF v_submission_id IS NOT NULL THEN
        UPDATE public.assignment_submissions
        SET answers = p_answers,
            score = v_score,
            submitted_at = now()
        WHERE id = v_submission_id;
    ELSE
        INSERT INTO public.assignment_submissions (
            assignment_id,
            student_id,
            student_name,
            answers,
            score,
            status,
            submitted_at
        ) VALUES (
            p_assignment_id,
            v_student.id::text,
            v_student.name,
            p_answers,
            v_score,
            'submitted',
            now()
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Holiday assignment submitted successfully! Excellent job! 🎉'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;


-- 2. REDEFINE SUBMIT_SCHOOL_ASSIGNMENT TO BE RESILIENT AND SUPPORT BROADCAST SUBMISSIONS ELEGANTLY
CREATE OR REPLACE FUNCTION public.submit_school_assignment(
    p_assignment_id UUID,
    p_student_name TEXT,
    p_answers JSONB,
    p_teacher_id UUID DEFAULT NULL,
    p_student_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses client-side auth/RLS checks to write safely
AS $$
DECLARE
    v_assignment RECORD;
    v_student RECORD;
    v_submission_id UUID;
    v_mcq_count INTEGER := 0;
    v_correct_count INTEGER := 0;
    v_score INTEGER := NULL;
    v_q RECORD;
    v_ans TEXT;
    v_student_id_str TEXT;
BEGIN
    -- Find assignment
    SELECT id, is_broadcast, questions, teacher_id, title
    INTO v_assignment
    FROM public.assignments
    WHERE id = p_assignment_id;

    IF v_assignment.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Assignment not found.'
        );
    END IF;

    -- Resolve student identifier string
    IF p_student_id IS NOT NULL THEN
        SELECT id, name INTO v_student FROM public.students WHERE id = p_student_id;
        IF v_student.id IS NOT NULL THEN
            v_student_id_str := v_student.id::text;
            p_student_name := v_student.name;
        ELSE
            v_student_id_str := p_student_id::text;
        END IF;
    ELSE
        -- Fallback to name-based identifier
        v_student_id_str := TRIM(p_student_name);
    END IF;

    -- Calculate score for MCQs
    FOR v_q IN SELECT * FROM jsonb_to_recordset(v_assignment.questions) AS (id TEXT, type TEXT, correct_option INTEGER)
    LOOP
        IF v_q.type = 'mcq' THEN
            v_mcq_count := v_mcq_count + 1;
            v_ans := p_answers->>v_q.id;
            IF v_ans IS NOT NULL AND v_ans::integer = v_q.correct_option THEN
                v_correct_count := v_correct_count + 1;
            END IF;
        END IF;
    END LOOP;

    IF v_mcq_count > 0 THEN
        v_score := round((v_correct_count::float / v_mcq_count::float) * 100);
    END IF;

    -- Upsert submission
    SELECT id INTO v_submission_id
    FROM public.assignment_submissions
    WHERE assignment_id = p_assignment_id
      AND student_id = v_student_id_str;

    IF v_submission_id IS NOT NULL THEN
        UPDATE public.assignment_submissions
        SET answers = p_answers,
            score = v_score,
            submitted_at = now()
        WHERE id = v_submission_id;
    ELSE
        INSERT INTO public.assignment_submissions (
            assignment_id,
            student_id,
            student_name,
            answers,
            score,
            status,
            submitted_at
        ) VALUES (
            p_assignment_id,
            v_student_id_str,
            TRIM(p_student_name),
            p_answers,
            v_score,
            'submitted',
            now()
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Assignment submitted successfully! Excellent job! 🎉'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;

-- Reload PostgREST schema cache to make updated functions immediately available
NOTIFY pgrst, 'reload schema';
