-- ARENA LIVE BATTLE SYSTEM MIGRATION

-- 1. ARENA ROOMS
CREATE TABLE IF NOT EXISTS arena_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- Short invite code
  type TEXT NOT NULL DEFAULT 'group', -- '1v1', 'group', 'team'
  host_id UUID NOT NULL, -- From arena_players.id
  host_username TEXT NOT NULL,
  grade INTEGER NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'active', 'finished'
  question_count INTEGER DEFAULT 10,
  duration_seconds INTEGER DEFAULT 60,
  questions JSONB DEFAULT '[]', -- List of question objects
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and Realtime
ALTER TABLE arena_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read rooms" ON arena_rooms FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public manage rooms" ON arena_rooms FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. ARENA ROOM PLAYERS
CREATE TABLE IF NOT EXISTS arena_room_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES arena_rooms(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  team TEXT, -- For team games
  score INTEGER DEFAULT 0,
  correct INTEGER DEFAULT 0,
  total_answered INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  is_finished BOOLEAN DEFAULT FALSE,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, username)
);

ALTER TABLE arena_room_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read room players" ON arena_room_players FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public manage room players" ON arena_room_players FOR ALL TO anon USING (true) WITH CHECK (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE arena_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE arena_room_players;
