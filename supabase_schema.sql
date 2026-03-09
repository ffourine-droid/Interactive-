-- SQL for the subscriptions table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('daily', 'weekly', 'monthly')),
  amount_paid INTEGER NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Index for faster lookups by phone number
CREATE INDEX IF NOT EXISTS idx_subscriptions_phone ON subscriptions(phone_number);

-- Ensure the experiments table has a subject column (Optional)
-- If you want to display subject names, run this:
-- ALTER TABLE experiments ADD COLUMN IF NOT EXISTS subject TEXT;
