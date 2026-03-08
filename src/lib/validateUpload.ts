import { z } from "zod";

// ============================================================
// Paragraph schema — shared by source and translation content
// ============================================================

const paragraphSchema = z.object({
  index: z.number().int().min(0),
  text: z.string().min(1, "Paragraph text must not be empty"),
});

// ============================================================
// Chapter schema
// ============================================================

const chapterSchema = z.object({
  title: z.string().min(1, "Chapter title is required"),
  paragraphs: z
    .array(paragraphSchema)
    .min(1, "Each chapter must have at least one paragraph"),
});

// ============================================================
// Translation chapter schema
// ============================================================

const translationChapterSchema = z.object({
  chapterNumber: z
    .number()
    .int()
    .min(1, "Chapter number must be a positive integer"),
  paragraphs: z
    .array(paragraphSchema)
    .min(1, "Each translated chapter must have at least one paragraph"),
});

// ============================================================
// Source text upload schema
// ============================================================

export const sourceUploadSchema = z.object({
  language: z.string().min(1, "Language code is required"),
  authorName: z.string().min(1, "Author name is required"),
  authorSlug: z.string().min(1, "Author slug is required"),
  title: z.string().min(1, "Text title is required"),
  slug: z.string().min(1, "Text slug is required"),
  description: z.string().optional(),
  textType: z.enum(["prose", "poetry"]).default("prose"),
  genre: z
    .enum([
      "philosophy",
      "theology",
      "devotional",
      "commentary",
      "literature",
      "poetry",
      "history",
      "science",
      "ritual",
      "uncategorized",
    ])
    .default("uncategorized"),
  compositionYear: z.number().int().optional(),
  compositionYearDisplay: z.string().optional(),
  chapters: z.array(chapterSchema).min(1, "At least one chapter is required"),
});

// ============================================================
// Translation upload schema
// ============================================================

export const translationUploadSchema = z.object({
  textSlug: z.string().min(1, "Text slug is required"),
  targetLanguage: z
    .string()
    .min(1, "Target language is required (e.g. 'en' or 'zh')"),
  chapters: z
    .array(translationChapterSchema)
    .min(1, "At least one translated chapter is required"),
});

// ============================================================
// Type exports
// ============================================================

export type SourceUpload = z.infer<typeof sourceUploadSchema>;
export type TranslationUpload = z.infer<typeof translationUploadSchema>;

// ============================================================
// Validation helpers
// ============================================================

/**
 * Validate that paragraph indices are sequential starting from 0.
 */
export function validateParagraphIndices(
  paragraphs: { index: number; text: string }[]
): string | null {
  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].index !== i) {
      return `Paragraph index mismatch: expected ${i}, got ${paragraphs[i].index}`;
    }
  }
  return null;
}

/**
 * Validate all chapters in a source upload have sequential paragraph indices.
 */
export function validateSourceUpload(
  data: SourceUpload
): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  // Slug format check
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
    errors.push(
      `Text slug "${data.slug}" must be lowercase alphanumeric with hyphens (e.g. "my-text")`
    );
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.authorSlug)) {
    errors.push(
      `Author slug "${data.authorSlug}" must be lowercase alphanumeric with hyphens`
    );
  }

  for (let i = 0; i < data.chapters.length; i++) {
    const err = validateParagraphIndices(data.chapters[i].paragraphs);
    if (err) {
      errors.push(`Chapter ${i + 1} ("${data.chapters[i].title}"): ${err}`);
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

/**
 * Validate all chapters in a translation upload have sequential paragraph indices.
 */
export function validateTranslationUpload(
  data: TranslationUpload
): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  for (const ch of data.chapters) {
    const err = validateParagraphIndices(ch.paragraphs);
    if (err) {
      errors.push(`Chapter ${ch.chapterNumber}: ${err}`);
    }
  }

  // Check for duplicate chapter numbers
  const seen = new Set<number>();
  for (const ch of data.chapters) {
    if (seen.has(ch.chapterNumber)) {
      errors.push(`Duplicate chapter number: ${ch.chapterNumber}`);
    }
    seen.add(ch.chapterNumber);
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
