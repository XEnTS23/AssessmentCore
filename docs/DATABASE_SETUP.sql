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

-- ─── OCR History ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ocr_history (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  export_file_name TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  source_file_name TEXT,
  source_file_type TEXT,
  total_pages INTEGER DEFAULT 0,
  total_questions_extracted INTEGER DEFAULT 0,
  extraction_status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ocr_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.ocr_history TO authenticated;

CREATE POLICY "Users can read own OCR history" ON ocr_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OCR history" ON ocr_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OCR history" ON ocr_history
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Stores cropped diagram assets extracted from OCR for the latest run.
-- These are reused in Batch Creator as URL-based image sources.
CREATE TABLE IF NOT EXISTS ocr_extracted_diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id UUID NOT NULL,
  question_number INTEGER NOT NULL,
  question_id TEXT,
  source_page_label TEXT,
  diagram_index INTEGER NOT NULL,
  description TEXT,
  box JSONB,
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ocr_extracted_diagrams_user ON ocr_extracted_diagrams(user_id);
CREATE INDEX IF NOT EXISTS idx_ocr_extracted_diagrams_user_question ON ocr_extracted_diagrams(user_id, question_number, diagram_index);

ALTER TABLE ocr_extracted_diagrams ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_extracted_diagrams TO authenticated;

CREATE POLICY "Users can read own OCR extracted diagrams" ON ocr_extracted_diagrams
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OCR extracted diagrams" ON ocr_extracted_diagrams
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own OCR extracted diagrams" ON ocr_extracted_diagrams
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own OCR extracted diagrams" ON ocr_extracted_diagrams
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Keep OCR history timestamps current when the latest run is replaced.
CREATE OR REPLACE FUNCTION update_ocr_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ocr_history_updated_at_trigger ON ocr_history;
CREATE TRIGGER update_ocr_history_updated_at_trigger
  BEFORE UPDATE ON ocr_history
  FOR EACH ROW
  EXECUTE FUNCTION update_ocr_history_updated_at();

-- Storage bucket for reusable OCR XLSX exports.
-- Creates or updates the bucket so it accepts the XLSX MIME type generated by
-- OCRProcessor.tsx.
--
-- Then run these Storage RLS policies so each user can only access files under
-- their own folder: {auth.uid()}/latest.xlsx
INSERT INTO storage.buckets (
  id,
  name,
  public,
  allowed_mime_types
)
VALUES (
  'ocr-exports',
  'ocr-exports',
  false,
  ARRAY[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  allowed_mime_types = CASE
    WHEN storage.buckets.allowed_mime_types IS NULL THEN
      ARRAY[
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]::text[]
    WHEN NOT (
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' =
      ANY(storage.buckets.allowed_mime_types)
    ) THEN
      array_append(
        storage.buckets.allowed_mime_types,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
    ELSE storage.buckets.allowed_mime_types
  END;

CREATE POLICY "Users can read own OCR exports" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'ocr-exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can insert own OCR exports" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'ocr-exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own OCR exports" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ocr-exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'ocr-exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage bucket for cropped OCR diagrams reused in Batch Creator mapping.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  allowed_mime_types
)
VALUES (
  'ocr-diagrams',
  'ocr-diagrams',
  true,
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  allowed_mime_types = CASE
    WHEN storage.buckets.allowed_mime_types IS NULL THEN
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
    ELSE storage.buckets.allowed_mime_types
  END;

CREATE POLICY "Users can read own OCR diagram files" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'ocr-diagrams'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can insert own OCR diagram files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'ocr-diagrams'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own OCR diagram files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ocr-diagrams'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'ocr-diagrams'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own OCR diagram files" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'ocr-diagrams'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

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
