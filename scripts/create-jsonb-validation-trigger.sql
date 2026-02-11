-- GUARDRAIL: Prevent double-encoded JSONB in chapters.source_content
--
-- This trigger automatically fixes double-encoded JSONB on INSERT/UPDATE.
-- If source_content is stored as a JSON string (jsonb_typeof = 'string'),
-- it unwraps it to the actual object.
--
-- Run this once to create the trigger:
--   psql $DATABASE_URL -f scripts/create-jsonb-validation-trigger.sql

CREATE OR REPLACE FUNCTION fix_double_encoded_source_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if source_content is a JSON string (double-encoded)
  IF jsonb_typeof(NEW.source_content) = 'string' THEN
    -- Log the fix for debugging
    RAISE NOTICE 'Fixing double-encoded source_content for chapter %', NEW.slug;
    -- Unwrap the string to get the actual object
    NEW.source_content := (NEW.source_content#>>'{}')::jsonb;
  END IF;

  -- Validate the result has paragraphs
  IF NEW.source_content IS NOT NULL AND
     jsonb_typeof(NEW.source_content->'paragraphs') IS NULL THEN
    RAISE EXCEPTION 'source_content must have a paragraphs array, got: %',
      jsonb_typeof(NEW.source_content);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS fix_source_content_encoding ON chapters;

-- Create the trigger
CREATE TRIGGER fix_source_content_encoding
  BEFORE INSERT OR UPDATE OF source_content ON chapters
  FOR EACH ROW
  EXECUTE FUNCTION fix_double_encoded_source_content();

-- Verify
SELECT 'Trigger created: fix_source_content_encoding' AS status;
