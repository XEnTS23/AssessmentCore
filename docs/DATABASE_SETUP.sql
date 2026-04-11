-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_usage table to track exports
CREATE TABLE IF NOT EXISTS user_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  exports_count INTEGER DEFAULT 0,
  last_export_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can only read their own usage data
CREATE POLICY "Users can read own usage" ON user_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own usage data
CREATE POLICY "Users can update own usage" ON user_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow inserting usage records
CREATE POLICY "Users can insert own usage" ON user_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Batch Creator Access Gate ────────────────────────────────────────────────

-- Add missing columns to user_usage (run these if the table already exists)
ALTER TABLE user_usage ADD COLUMN IF NOT EXISTS total_questions_converted INTEGER DEFAULT 0;
ALTER TABLE user_usage ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT FALSE;
ALTER TABLE user_usage ADD COLUMN IF NOT EXISTS batch_creator_access BOOLEAN DEFAULT FALSE;

-- Create batch_creator_tokens table
-- The team inserts rows here manually (via Supabase dashboard) after a customer pays.
-- The `token` value is what gets emailed to the customer.
-- When a customer enters their token in the app, it is matched against this table,
-- marked as redeemed, and batch_creator_access is set to true on their user_usage row.
CREATE TABLE IF NOT EXISTS batch_creator_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token       TEXT UNIQUE NOT NULL,          -- the secret sent to the customer
  note        TEXT,                           -- team note: customer name, payment ref, date
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active   BOOLEAN DEFAULT TRUE            -- set false to revoke a token
);

-- RLS for batch_creator_tokens:
-- Authenticated users may SELECT (needed for the token lookup during redemption).
-- No user may INSERT, UPDATE, or DELETE — only service_role (team) can do that.
ALTER TABLE batch_creator_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can look up tokens" ON batch_creator_tokens
  FOR SELECT USING (auth.role() = 'authenticated');

-- To provision a new token, team runs in Supabase SQL Editor or Table Editor:
--   INSERT INTO batch_creator_tokens (token, note)
--   VALUES (gen_random_uuid()::text, 'Customer Name – paid 2026-03-22');
-- Then copy the token value and email it to the customer.
