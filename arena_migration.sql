-- ARENA SYSTEM MIGRATION

-- 1. QUESTIONS BANK
CREATE TABLE IF NOT EXISTS questions_bank (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grade INTEGER NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL, -- 'A', 'B', 'C', 'D'
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  is_approved BOOLEAN DEFAULT TRUE,
  source TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE questions_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read questions" ON questions_bank FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public manage questions" ON questions_bank FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. ARENA PLAYERS
CREATE TABLE IF NOT EXISTS arena_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  grade INTEGER NOT NULL,
  total_games INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE arena_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read players" ON arena_players FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public manage players" ON arena_players FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3. ARENA SCORES (LEADERBOARD)
CREATE TABLE IF NOT EXISTS arena_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES arena_players(id),
  username TEXT NOT NULL,
  grade INTEGER NOT NULL,
  subject TEXT NOT NULL,
  score INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  total INTEGER NOT NULL,
  best_streak INTEGER DEFAULT 0,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE arena_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read scores" ON arena_scores FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public manage scores" ON arena_scores FOR ALL TO anon USING (true) WITH CHECK (true);
