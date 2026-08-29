-- Applied as Supabase migration version 20260816142147.
-- Keep question-media uploads owner-scoped while supporting every file type
-- offered by the manual-fix asset picker. SVG is intentionally excluded from
-- direct upload because publicly served active SVG content can be unsafe.

DROP POLICY IF EXISTS "question_media_insert" ON storage.objects;

CREATE POLICY "question_media_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'question-media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND lower(storage.extension(name)) = ANY (
      ARRAY[
        'jpg', 'jpeg', 'png', 'webp', 'gif',
        'mp3', 'wav', 'ogg', 'm4a', 'aac',
        'mp4', 'webm', 'mov', 'm4v', 'ogv',
        'pdf', 'doc', 'docx', 'ppt', 'pptx'
      ]
    )
  );
