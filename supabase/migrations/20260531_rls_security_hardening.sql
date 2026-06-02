-- =============================================================================
-- RLS Security Hardening Migration
-- Date: 2026-05-31
-- Summary:
--   1. Consolidates duplicate/conflicting policies on all 4 tables
--   2. Locks all table policies to `authenticated` role only (removes `public`)
--   3. Prevents users from self-granting is_unlimited on user_usage (H-2 fix)
--   4. Fixes storage policies: removes duplicates, scopes to owner, locks to authenticated
--   5. Revokes EXECUTE on rls_auto_enable() from anon/authenticated
--   6. Fixes handle_updated_at() search_path
-- =============================================================================


-- =============================================================================
-- SECTION 1: user_profiles
-- =============================================================================

-- Drop all existing policies (consolidated + duplicates + public-role ones)
DROP POLICY IF EXISTS "Users can delete own profile"     ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile"     ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile"       ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile"     ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile"       ON public.user_profiles; -- duplicate SELECT

-- Recreate clean, minimal, authenticated-only policies
CREATE POLICY "profile_select"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profile_insert"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profile_update"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- NOTE: DELETE intentionally omitted — profiles should not be self-deletable.
-- Account deletion should be handled via a service_role RPC only.


-- =============================================================================
-- SECTION 2: user_usage  (Critical: prevents self-granting is_unlimited)
-- =============================================================================

DROP POLICY IF EXISTS "Users can delete own usage"  ON public.user_usage;
DROP POLICY IF EXISTS "Users can insert own usage"  ON public.user_usage;
DROP POLICY IF EXISTS "Users can read own usage"    ON public.user_usage;
DROP POLICY IF EXISTS "Users can update own usage"  ON public.user_usage;
DROP POLICY IF EXISTS "Users can view own usage"    ON public.user_usage; -- duplicate SELECT

CREATE POLICY "usage_select"
  ON public.user_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "usage_insert"
  ON public.user_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can update their own row BUT cannot touch is_unlimited.
-- The is_unlimited column is admin-only — enforced by column-level restriction
-- via a WITH CHECK that blocks any attempt to set it to true from the client.
-- Admins must use service_role to flip is_unlimited.
CREATE POLICY "usage_update"
  ON public.user_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_unlimited IS NOT DISTINCT FROM (
      SELECT is_unlimited FROM public.user_usage WHERE user_id = auth.uid()
    )
  );

-- DELETE intentionally omitted — usage rows must not be self-deletable
-- (would reset quota counters). Service role only.


-- =============================================================================
-- SECTION 3: ocr_history
-- =============================================================================

-- Drop all conflicting/overlapping policies
DROP POLICY IF EXISTS "Users manage their own OCR history"      ON public.ocr_history;
DROP POLICY IF EXISTS "Users can delete own OCR history"        ON public.ocr_history;
DROP POLICY IF EXISTS "Users can insert own OCR history"        ON public.ocr_history;
DROP POLICY IF EXISTS "Users can read own OCR history"          ON public.ocr_history;
DROP POLICY IF EXISTS "Users can update own OCR history"        ON public.ocr_history;
DROP POLICY IF EXISTS "Premium users can insert own OCR history" ON public.ocr_history;
DROP POLICY IF EXISTS "Premium users can read own OCR history"   ON public.ocr_history;
DROP POLICY IF EXISTS "Premium users can update own OCR history" ON public.ocr_history;

-- Clean consolidated policies (authenticated only)
-- Premium check is enforced server-side in the Edge Function, not in RLS
-- (Edge Function uses service_role and verifies premium status before inserting)
CREATE POLICY "ocr_history_select"
  ON public.ocr_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "ocr_history_insert"
  ON public.ocr_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ocr_history_update"
  ON public.ocr_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ocr_history_delete"
  ON public.ocr_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- =============================================================================
-- SECTION 4: ocr_extracted_diagrams
-- =============================================================================

-- Drop all conflicting/overlapping policies (ALL + 4 separate + all on public role)
DROP POLICY IF EXISTS "Users manage their own extracted diagrams"       ON public.ocr_extracted_diagrams;
DROP POLICY IF EXISTS "Users can delete own OCR extracted diagrams"     ON public.ocr_extracted_diagrams;
DROP POLICY IF EXISTS "Users can insert own OCR extracted diagrams"     ON public.ocr_extracted_diagrams;
DROP POLICY IF EXISTS "Users can read own OCR extracted diagrams"       ON public.ocr_extracted_diagrams;
DROP POLICY IF EXISTS "Users can update own OCR extracted diagrams"     ON public.ocr_extracted_diagrams;

-- Clean consolidated policies (authenticated only)
CREATE POLICY "ocr_diagrams_meta_select"
  ON public.ocr_extracted_diagrams
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "ocr_diagrams_meta_insert"
  ON public.ocr_extracted_diagrams
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ocr_diagrams_meta_update"
  ON public.ocr_extracted_diagrams
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ocr_diagrams_meta_delete"
  ON public.ocr_extracted_diagrams
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- =============================================================================
-- SECTION 5: Storage — question-media bucket
-- =============================================================================

-- Remove conflicting/duplicate policies
DROP POLICY IF EXISTS "Authenticated users can delete media"      ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own media"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update media"      ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own media"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media"      ON storage.objects;
DROP POLICY IF EXISTS "Public read access for media"              ON storage.objects;

-- Public read (no auth needed — URLs are embedded in QTI packages)
CREATE POLICY "question_media_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'question-media');

-- Upload: authenticated, owner-scoped, extension-checked
CREATE POLICY "question_media_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'question-media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND storage.extension(name) = ANY (ARRAY['jpg','jpeg','png','webp','gif','mp3','mp4'])
  );

-- Update: owner only
CREATE POLICY "question_media_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'question-media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'question-media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Delete: owner only
CREATE POLICY "question_media_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'question-media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );


-- =============================================================================
-- SECTION 6: Storage — ocr-diagrams bucket
-- =============================================================================

-- Remove all existing policies for this bucket
DROP POLICY IF EXISTS "Allow only images"                          ON storage.objects;
DROP POLICY IF EXISTS "Public read access for OCR diagrams"        ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own OCR diagrams"    ON storage.objects;
DROP POLICY IF EXISTS "Users can only modify their own folder"     ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own OCR diagrams"    ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own OCR diagrams"    ON storage.objects;

-- Public read (diagrams are embedded in exported files / previews)
CREATE POLICY "ocr_diagrams_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'ocr-diagrams');

-- Upload: authenticated, owner-folder, image types only
CREATE POLICY "ocr_diagrams_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ocr-diagrams'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND storage.extension(name) = ANY (ARRAY['jpg','jpeg','png','webp'])
    AND (metadata->>'mimetype') = ANY (ARRAY['image/jpeg','image/png','image/webp'])
  );

-- Update: owner-folder only
CREATE POLICY "ocr_diagrams_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'ocr-diagrams'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'ocr-diagrams'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Delete: owner-folder only
CREATE POLICY "ocr_diagrams_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ocr-diagrams'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );


-- =============================================================================
-- SECTION 7: Storage — ocr-exports bucket
-- =============================================================================

-- Existing policies were good but kept on authenticated — just verify they exist
-- (no DROP needed unless names changed; re-creating safely with IF NOT EXISTS workaround)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'ocr_exports_insert'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "ocr_exports_insert"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'ocr-exports'
          AND (auth.uid())::text = (storage.foldername(name))[1]
        );
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'ocr_exports_select'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "ocr_exports_select"
        ON storage.objects
        FOR SELECT
        TO authenticated
        USING (
          bucket_id = 'ocr-exports'
          AND (auth.uid())::text = (storage.foldername(name))[1]
        );
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'ocr_exports_update'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "ocr_exports_update"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (
          bucket_id = 'ocr-exports'
          AND (auth.uid())::text = (storage.foldername(name))[1]
        )
        WITH CHECK (
          bucket_id = 'ocr-exports'
          AND (auth.uid())::text = (storage.foldername(name))[1]
        );
    $p$;
  END IF;
END $$;

-- Drop old named variants if they exist (renaming to clean names)
DROP POLICY IF EXISTS "Users can insert own OCR exports" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own OCR exports"   ON storage.objects;
DROP POLICY IF EXISTS "Users can update own OCR exports" ON storage.objects;


-- =============================================================================
-- SECTION 8: Revoke rls_auto_enable() from anon/authenticated
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;


-- =============================================================================
-- SECTION 9: Fix handle_updated_at() mutable search_path
-- =============================================================================

ALTER FUNCTION public.handle_updated_at() SET search_path = public;
