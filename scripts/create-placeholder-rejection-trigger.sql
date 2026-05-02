-- Placeholder-rejection trigger for translation_versions.
--
-- Layer 2 of the placeholder defense. Layer 1 lives in scripts/translate-batch.ts
-- (PLACEHOLDER REJECT guard). This trigger is the last-line guarantee that no
-- INSERT or UPDATE of `content` on translation_versions can ever land a paragraph
-- containing "Translation pending", "automated translation failed", or "[ERROR]".
--
-- Background: 2026-05-02 incident. 472 chapters across en/zh/es had been silently
-- saved with placeholder strings baked into translation_versions.content. They
-- were invisible to gap-check tooling (current_version_id was non-NULL) and
-- reached real readers on the live site. Per User directive, the correct
-- response when a paragraph cannot be translated is to LEAVE THE CHAPTER
-- UNTRANSLATED, so the next pipeline run can split the source paragraph and
-- retry. Never substitute a placeholder.
--
-- See CLAUDE.md "NEVER SAVE PLACEHOLDER TEXT TO TRANSLATIONS" for the full rule.

CREATE OR REPLACE FUNCTION reject_placeholder_translation_versions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  para_text TEXT;
BEGIN
  IF NEW.content IS NULL THEN
    RETURN NEW;
  END IF;
  FOR para_text IN
    SELECT p->>'text' FROM jsonb_array_elements(NEW.content->'paragraphs') p
  LOOP
    IF para_text ~* 'Translation pending|automated translation failed|\[ERROR\]' THEN
      RAISE EXCEPTION 'PLACEHOLDER_REJECT: translation_versions row for translation_id=% contains placeholder text. Refused — clear current_version_id and re-run with sentence-boundary paragraph splitting per CLAUDE.md "Truncation Error Resolution Order".', NEW.translation_id;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reject_placeholder_translations ON translation_versions;

CREATE TRIGGER reject_placeholder_translations
BEFORE INSERT OR UPDATE OF content ON translation_versions
FOR EACH ROW
EXECUTE FUNCTION reject_placeholder_translation_versions();
