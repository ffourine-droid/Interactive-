-- CLEAN SLATE SQL for AZILEARN Payment System
-- This script drops the existing table to ensure it is created correctly.
-- WARNING: This will delete any existing data in the 'payments' table.

-- 1. Fix experiments table if columns are missing
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS grade TEXT;

-- 2. Drop existing table to fix any previous broken attempts
DROP TABLE IF EXISTS payments CASCADE;

-- 3. Create the payments table correctly
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,            -- Required for verification
  amount INTEGER NOT NULL,
  plan TEXT NOT NULL,                    -- 'daily', 'weekly', 'monthly'
  lesson_id TEXT,                        -- if plan = 'lesson', which lesson slug
  transaction_code TEXT,                 -- now optional
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 4. Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Anyone can insert a new payment submission (Public Submission)
CREATE POLICY "Allow public insert" ON payments
  FOR INSERT TO anon WITH CHECK (true);

-- Anyone can read a payment by phone number (Access Verification)
CREATE POLICY "Allow public read by phone" ON payments
  FOR SELECT TO anon USING (true);

-- Anyone can update a payment (Admin Approval/Rejection)
CREATE POLICY "Allow public update" ON payments
  FOR UPDATE TO anon USING (true);

-- 6. Index for faster lookups by phone number
CREATE INDEX idx_payments_phone ON payments(phone_number);
