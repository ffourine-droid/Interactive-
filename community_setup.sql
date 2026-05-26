-- SUPABASE DATABASE SETUP FOR AZILEARN COMMUNITY FORUM & IN-APP NOTIFICATIONS
-- -----------------------------------------------------------------------------

-- 1. Create Profiles table (safe fallback check)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('student', 'teacher')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Boards table (class_id points to class UUID or Grade name like "Grade 7")
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id public.uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE NOT NULL,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tag TEXT CHECK (tag IN ('question', 'discussion', 'study_tip', 'resource')) NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Replies table
CREATE TABLE IF NOT EXISTS public.replies (
  id public.uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Post Upvotes table (Composite Primary Key prevents duplicate voting)
CREATE TABLE IF NOT EXISTS public.post_upvotes (
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

-- 6. Flags table (moderation reporting)
CREATE TABLE IF NOT EXISTS public.flags (
  id public.uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  flagged_by UUID NOT NULL,
  reason TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Warnings table (issued to misbehaving students by teachers)
CREATE TABLE IF NOT EXISTS public.warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Notifications table (with in-app bell support)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT CHECK (type IN ('flag_alert', 'warning_received', 'post_pinned')) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) - Permissive and Robust for easy prototyping
-- Disable strict RLS checking on these public development tables
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.replies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_upvotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.flags DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.warnings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- AUTOMATED TRIGGERS & NOTIFICATION SYSTEMS
-- -----------------------------------------------------------------------------

-- Trigger 1: When a new POST FLAG is inserted, notify the Teacher of the board
CREATE OR REPLACE FUNCTION public.handle_new_flag_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_board_id UUID;
    v_class_id TEXT;
    v_teacher_id UUID;
    v_post_title TEXT;
BEGIN
    -- Resolve post parameters
    SELECT board_id, title INTO v_board_id, v_post_title FROM public.posts WHERE id = NEW.post_id;
    SELECT class_id INTO v_class_id FROM public.boards WHERE id = v_board_id;
    
    -- Resolve direct Teacher IDs
    SELECT teacher_id INTO v_teacher_id FROM public.classes WHERE id::text = v_class_id LIMIT 1;

    -- Grade level fallback lookup
    IF v_teacher_id IS NULL THEN
        SELECT teacher_id INTO v_teacher_id FROM public.classes WHERE name = v_class_id OR id::text = v_class_id LIMIT 1;
    END IF;

    -- Global school level lookup fallback
    IF v_teacher_id IS NULL THEN
         SELECT id INTO v_teacher_id FROM public.teachers ORDER BY created_at LIMIT 1;
    END IF;

    IF v_teacher_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, message)
        VALUES (
            v_teacher_id, 
            'flag_alert', 
            'Post flagged: "' || LEFT(v_post_title, 30) || '" was flagged for reason: ' || NEW.reason
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_flag_added ON public.flags;
CREATE TRIGGER trigger_on_flag_added
AFTER INSERT ON public.flags
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_flag_trigger();


-- Trigger 2: When a new WARNING is issued, notify the Student
CREATE OR REPLACE FUNCTION public.handle_new_warning_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, message)
    VALUES (
        NEW.student_id, 
        'warning_received', 
        'You have received an official warning: "' || NEW.reason || '"'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_warning_added ON public.warnings;
CREATE TRIGGER trigger_on_warning_added
AFTER INSERT ON public.warnings
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_warning_trigger();


-- Trigger 3: When a post is marked pinned ("is_pinned" updated to true), notify author
CREATE OR REPLACE FUNCTION public.handle_post_pinned_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_pinned = TRUE AND (OLD.is_pinned IS NULL OR OLD.is_pinned = FALSE) THEN
        INSERT INTO public.notifications (user_id, type, message)
        VALUES (
            NEW.author_id, 
            'post_pinned', 
            'Your post "' || LEFT(NEW.title, 30) || '" has been pinned by a teacher! 📌'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_post_pinned ON public.posts;
CREATE TRIGGER trigger_on_post_pinned
AFTER UPDATE OF is_pinned ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.handle_post_pinned_trigger();

-- -----------------------------------------------------------------------------
-- Seed Initial Boards if required
-- -----------------------------------------------------------------------------
INSERT INTO public.boards (class_id, subject, name)
VALUES 
  ('Grade 6', 'Mathematics', '🧮 Grade 6 Math Corner'),
  ('Grade 7', 'Mathematics', '🧮 Grade 7 Maths Quest'),
  ('Grade 7', 'Science', '🧪 Grade 7 Science Laboratory'),
  ('Grade 8', 'Mathematics', '📐 Grade 8 Algebra & Geometry'),
  ('Grade 8', 'Science', '🧬 Grade 8 Chemistry & Biology')
ON CONFLICT DO NOTHING;
