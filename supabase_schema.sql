-- CLEAN SLATE SQL for AZILEARN Payment System
-- This script drops the existing table to ensure it is created correctly.
-- WARNING: This will delete any existing data in the 'payments' table.

-- 1. Fix experiments table if subject column is missing
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS subject TEXT;

-- 2. Drop existing table to fix any previous broken attempts
DROP TABLE IF EXISTS payments CASCADE;

-- 3. Create the payments table correctly
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_code TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  plan TEXT NOT NULL,           -- 'lesson' or 'monthly'
  lesson_id TEXT,               -- if plan = 'lesson', which lesson slug
  phone_number TEXT,            -- optional, user-entered
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE  -- null for lesson, 30 days for monthly
);

-- 4. Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Anyone can insert a new payment submission (Public Submission)
CREATE POLICY "Allow public insert" ON payments
  FOR INSERT TO anon WITH CHECK (true);

-- Anyone can read a payment by transaction code (Access Verification)
CREATE POLICY "Allow public read by code" ON payments
  FOR SELECT TO anon USING (true);

-- 6. Index for faster lookups by transaction code
CREATE INDEX idx_payments_code ON payments(transaction_code);
