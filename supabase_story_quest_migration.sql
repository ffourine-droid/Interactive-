-- supabase_story_quest_migration.sql
-- Migration file for Story Quest feature in AziLearn

-- Create tables
CREATE TABLE IF NOT EXISTS public.story_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    story_title VARCHAR(255) NOT NULL,
    icon VARCHAR(100) DEFAULT 'BookOpen',
    total_chapters INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.story_characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.story_subjects(id) ON DELETE CASCADE UNIQUE,
    character_name VARCHAR(100) NOT NULL,
    character_description TEXT NOT NULL,
    home_town VARCHAR(100) NOT NULL,
    personality VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.story_subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.story_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
    chapter_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    total_scenes INT DEFAULT 3,
    xp_reward INT DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(story_id, chapter_number)
);

CREATE TABLE IF NOT EXISTS public.story_scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID REFERENCES public.story_chapters(id) ON DELETE CASCADE,
    scene_number INT NOT NULL,
    narrative TEXT NOT NULL,
    setting_local VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(chapter_id, scene_number)
);

CREATE TABLE IF NOT EXISTS public.scene_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID REFERENCES public.story_scenes(id) ON DELETE CASCADE UNIQUE,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    explanation TEXT,
    response_correct TEXT,
    response_wrong TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Fail-safe column additions if table already exists without response_correct or response_wrong
ALTER TABLE public.scene_questions ADD COLUMN IF NOT EXISTS response_correct TEXT;
ALTER TABLE public.scene_questions ADD COLUMN IF NOT EXISTS response_wrong TEXT;

CREATE TABLE IF NOT EXISTS public.student_story_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(255) NOT NULL,
    subject_id UUID REFERENCES public.story_subjects(id) ON DELETE CASCADE,
    current_chapter_id UUID REFERENCES public.story_chapters(id) ON DELETE SET NULL,
    current_scene_number INT DEFAULT 1,
    completed_chapters UUID[] DEFAULT '{}'::uuid[],
    total_xp INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, subject_id)
);

-- Enable RLS
ALTER TABLE public.story_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_story_progress ENABLE ROW LEVEL SECURITY;

-- Allow public read of content
CREATE POLICY "Allow public select story_subjects" ON public.story_subjects FOR SELECT USING (true);
CREATE POLICY "Allow public select story_characters" ON public.story_characters FOR SELECT USING (true);
CREATE POLICY "Allow public select stories" ON public.stories FOR SELECT USING (true);
CREATE POLICY "Allow public select story_chapters" ON public.story_chapters FOR SELECT USING (true);
CREATE POLICY "Allow public select story_scenes" ON public.story_scenes FOR SELECT USING (true);
CREATE POLICY "Allow public select scene_questions" ON public.scene_questions FOR SELECT USING (true);

-- Allow public manage of content for admins/uploaders
CREATE POLICY "Allow public manage story_subjects" ON public.story_subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public manage story_characters" ON public.story_characters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public manage stories" ON public.stories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public manage story_chapters" ON public.story_chapters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public manage story_scenes" ON public.story_scenes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public manage scene_questions" ON public.scene_questions FOR ALL USING (true) WITH CHECK (true);

-- Allow student read-write for progress
CREATE POLICY "Allow all student progress access" ON public.student_story_progress FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_story_subjects_grade ON public.story_subjects(grade);
CREATE INDEX IF NOT EXISTS idx_story_characters_subject ON public.story_characters(subject_id);
CREATE INDEX IF NOT EXISTS idx_stories_subject ON public.stories(subject_id);
CREATE INDEX IF NOT EXISTS idx_story_chapters_story ON public.story_chapters(story_id);
CREATE INDEX IF NOT EXISTS idx_story_scenes_chapter ON public.story_scenes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_scene_questions_scene ON public.scene_questions(scene_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student ON public.student_story_progress(student_id);
