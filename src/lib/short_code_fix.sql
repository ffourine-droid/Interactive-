-- Add short_code column to assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE;

-- Create an index for fast lookups
CREATE INDEX IF NOT EXISTS idx_assignments_short_code ON assignments(short_code);

-- Backfill existing assignments if any
UPDATE assignments 
SET short_code = UPPER(SUBSTRING(id::text FROM 1 FOR 6))
WHERE short_code IS NULL;
