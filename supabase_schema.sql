-- AZILEARN COMPLETE SCHEMA
-- This script sets up all necessary tables for the AziLearn platform.

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read by phone" ON profiles
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow public insert/update" ON profiles
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. EXPERIMENTS (MATERIALS) TABLE
CREATE TABLE IF NOT EXISTS experiments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  keywords TEXT,
  html_content TEXT,
  subject TEXT,
  grade TEXT,
  category TEXT DEFAULT 'notes',
  slides TEXT[], -- Array of image URLs
  audio_url TEXT,
  pdf_url TEXT,
  ppt_url TEXT,
  is_free BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read materials
CREATE POLICY "Allow public read" ON experiments
  FOR SELECT TO anon USING (true);

-- Allow everyone to manage materials (for admin purposes in this demo)
CREATE POLICY "Allow public manage" ON experiments
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  amount INTEGER NOT NULL,
  plan TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  lesson_id TEXT,
  transaction_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Added for compatibility
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON payments
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public read" ON payments
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow public update" ON payments
  FOR UPDATE TO anon USING (true);

-- 4. SEED DATA FOR EXPERIMENTS
INSERT INTO experiments (title, keywords, subject, grade, html_content, category, is_free)
VALUES 
('Introduction to Photosynthesis', 'biology, plants, energy', 'Biology', 'Grade 7', '<h1>Photosynthesis</h1><p>Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods with the help of chlorophyll pigments.</p>', 'notes', true),
('Chemical Reactions Basics', 'chemistry, reactions, atoms', 'Chemistry', 'Grade 8', '<h1>Chemical Reactions</h1><p>A chemical reaction is a process that leads to the chemical transformation of one set of chemical substances to another.</p>', 'notes', false),
('Newton''s Laws of Motion', 'physics, motion, force', 'Physics', 'Grade 9', '<h1>Newton''s Laws</h1><p>Newton''s laws of motion are three physical laws that, together, laid the foundation for classical mechanics.</p>', 'notes', true),
('Algebraic Expressions', 'math, algebra, variables', 'Mathematics', 'Grade 10', '<h1>Algebra</h1><p>Algebra is one of the broad areas of mathematics, together with number theory, geometry and analysis.</p>', 'notes', false),
('Plate Tectonics', 'geography, earth, plates', 'Geography', 'Grade 11', '<h1>Plate Tectonics</h1><p>Plate tectonics is a scientific theory describing the large-scale motion of seven large plates and the movements of a larger number of smaller plates of Earth''s lithosphere.</p>', 'notes', true);

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_payments_phone ON payments(phone_number);
CREATE INDEX IF NOT EXISTS idx_experiments_grade ON experiments(grade);
CREATE INDEX IF NOT EXISTS idx_experiments_subject ON experiments(subject);
