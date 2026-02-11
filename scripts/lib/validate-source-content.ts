/**
 * GUARDRAIL: Validate source_content structure before and after database operations
 *
 * This module prevents the double-encoded JSONB issue that has caused multiple incidents:
 * - Tamil texts (2026-02-08): 17 texts had string-type source_content
 * - Lektsii V2 (2026-02-10): 78 chapters had 690K char strings instead of objects
 *
 * ROOT CAUSE: Using JSON.stringify() when inserting JSONB, which causes double-encoding.
 *
 * CORRECT: INSERT INTO chapters (source_content) VALUES ($1::jsonb) with object
 * WRONG:   INSERT INTO chapters (source_content) VALUES ($1::jsonb) with JSON.stringify(object)
 */

import postgres from "postgres";

export interface SourceContentValidation {
  isValid: boolean;
  contentType: string;
  paragraphCount: number | null;
  error?: string;
}

/**
 * Validate that source_content is properly structured JSONB (not double-encoded)
 */
export async function validateSourceContent(
  sql: ReturnType<typeof postgres>,
  textSlug: string
): Promise<{ valid: number; invalid: number; issues: string[] }> {
  const result = await sql`
    SELECT c.chapter_number, c.slug,
           jsonb_typeof(c.source_content) as content_type,
           jsonb_typeof(c.source_content->'paragraphs') as para_type,
           jsonb_array_length(c.source_content->'paragraphs') as para_count
    FROM chapters c
    JOIN texts t ON c.text_id = t.id
    WHERE t.slug = ${textSlug}
    ORDER BY c.chapter_number
  `;

  let valid = 0;
  let invalid = 0;
  const issues: string[] = [];

  for (const row of result) {
    if (row.content_type !== "object") {
      invalid++;
      issues.push(
        `Ch ${row.chapter_number}: source_content is '${row.content_type}' instead of 'object' (DOUBLE-ENCODED)`
      );
    } else if (row.para_type !== "array") {
      invalid++;
      issues.push(
        `Ch ${row.chapter_number}: paragraphs is '${row.para_type}' instead of 'array'`
      );
    } else if (row.para_count === 0) {
      invalid++;
      issues.push(`Ch ${row.chapter_number}: paragraphs array is empty`);
    } else {
      valid++;
    }
  }

  return { valid, invalid, issues };
}

/**
 * Fix double-encoded source_content by unwrapping the JSON string
 */
export async function fixDoubleEncodedContent(
  sql: ReturnType<typeof postgres>,
  textSlug: string
): Promise<number> {
  const result = await sql`
    UPDATE chapters c
    SET source_content = (c.source_content#>>'{}')::jsonb
    FROM texts t
    WHERE c.text_id = t.id
    AND t.slug = ${textSlug}
    AND jsonb_typeof(c.source_content) = 'string'
  `;
  return result.count;
}

/**
 * MANDATORY: Call this after seeding chapters to verify no double-encoding
 */
export async function assertValidSourceContent(
  sql: ReturnType<typeof postgres>,
  textSlug: string
): Promise<void> {
  const { valid, invalid, issues } = await validateSourceContent(sql, textSlug);

  if (invalid > 0) {
    console.error(`\n❌ SOURCE CONTENT VALIDATION FAILED for ${textSlug}`);
    console.error(`   Valid: ${valid}, Invalid: ${invalid}`);
    for (const issue of issues.slice(0, 10)) {
      console.error(`   - ${issue}`);
    }
    if (issues.length > 10) {
      console.error(`   ... and ${issues.length - 10} more issues`);
    }
    throw new Error(
      `DOUBLE-ENCODED JSONB DETECTED: ${invalid} chapters in ${textSlug} have invalid source_content. ` +
      `Fix with: UPDATE chapters SET source_content = (source_content#>>'{}')::jsonb WHERE jsonb_typeof(source_content) = 'string'`
    );
  }

  console.log(`✅ Source content validated: ${valid} chapters OK`);
}

/**
 * Prepare source_content object for database insertion
 * ALWAYS use this instead of raw JSON.stringify
 */
export function prepareSourceContent(paragraphs: string[]): object {
  // Return the object directly - do NOT stringify it
  // The database driver (postgres.js) will handle JSON serialization
  return {
    paragraphs: paragraphs.map((text, index) => ({ index, text })),
  };
}
