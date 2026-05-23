-- ── AziLearn Competitions System Schema Migration ──

-- Drop existing tables if they exist to start fresh and clean (safe for scratch builds)
-- DROP TABLE IF EXISTS matchmaking_queue;
-- DROP TABLE IF EXISTS math_duel_rooms;
-- DROP TABLE IF EXISTS speed_round_rooms;
-- DROP TABLE IF EXISTS group_battle_rooms;
-- DROP TABLE IF EXISTS group_battle_players;

-- 1. Matchmaking Queue Table
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID,
  username TEXT NOT NULL,
  grade TEXT NOT NULL, -- e.g. "Grade 6", "Grade 7", etc.
  game_type TEXT NOT NULL, -- "math_duel", "speed_round", etc.
  status TEXT NOT NULL DEFAULT 'waiting', -- "waiting", "matched"
  matched_room_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select matchmaking" ON matchmaking_queue FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert matchmaking" ON matchmaking_queue FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update matchmaking" ON matchmaking_queue FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete matchmaking" ON matchmaking_queue FOR DELETE TO anon USING (true);

-- 2. Math Duel Rooms Table
CREATE TABLE IF NOT EXISTS math_duel_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,
  player1_username TEXT,
  player2_username TEXT,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting', -- "waiting", "active", "finished"
  current_round INTEGER DEFAULT 1,
  max_rounds INTEGER DEFAULT 5,
  round_timer INTEGER DEFAULT 30,
  questions JSONB DEFAULT '[]', -- List of math questions
  answers JSONB DEFAULT '[]', -- Record of who submitted what in each round
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE math_duel_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select math_duel" ON math_duel_rooms FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert math_duel" ON math_duel_rooms FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update math_duel" ON math_duel_rooms FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 3. Speed Round Rooms Table
CREATE TABLE IF NOT EXISTS speed_round_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,
  player1_username TEXT,
  player2_username TEXT,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting', -- "waiting", "active", "finished"
  questions JSONB DEFAULT '[]', -- Synchronized questions list
  player1_answers JSONB DEFAULT '[]', -- To track player 1's performance
  player2_answers JSONB DEFAULT '[]', -- To track player 2's performance
  started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE speed_round_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select speed_round" ON speed_round_rooms FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert speed_round" ON speed_round_rooms FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update speed_round" ON speed_round_rooms FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 4. Group Battle Rooms Table
CREATE TABLE IF NOT EXISTS group_battle_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,
  host_username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- "waiting", "active", "finished"
  questions JSONB DEFAULT '[]',
  current_question_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE group_battle_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select group_battle" ON group_battle_rooms FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert group_battle" ON group_battle_rooms FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update group_battle" ON group_battle_rooms FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 5. Group Battle Players Table
CREATE TABLE IF NOT EXISTS group_battle_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL,
  username TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  answers JSONB DEFAULT '[]', -- Track individual answers submitted
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_group_player UNIQUE (room_code, username)
);

ALTER TABLE group_battle_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select group_players" ON group_battle_players FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert group_players" ON group_battle_players FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update group_players" ON group_battle_players FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete group_players" ON group_battle_players FOR DELETE TO anon USING (true);

-- 6. Enable Realtime Subscriptions
-- Ensure we carry out safe publication adjustments
BEGIN;
  -- Try to add tables individually, ignoring errors if some are already registered
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
COMMIT;
