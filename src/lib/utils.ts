import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parses a chapter title that may contain both original language and English.
 * Supported formats:
 * - "原文 (English Translation)" — parenthetical format
 * - "Ελληνικά (English Translation)" — parenthetical format
 * - "Πουλολόγος (Poulologos (Tale of the Birds))" — nested parens
 * - "Հdelays — English Translation" — em-dash format (Armenian texts)
 * Returns the original-language portion and the English portion separately.
 */
export function parseChapterTitle(title: string | null): {
  original: string;
  english: string | null;
} {
  if (!title) return { original: "Untitled", english: null };

  // Check for em-dash format first: "Original — English"
  // The em-dash (—) is distinct from hyphen (-) or en-dash (–)
  const emDashMatch = title.match(/^(.+?) — (.+)$/);
  if (emDashMatch) {
    const original = emDashMatch[1].trim();
    const english = emDashMatch[2].trim();
    if (original.length > 0 && english.length > 0) {
      return { original, english };
    }
  }

  // Find the last top-level opening paren that has a matching close at end of string.
  // This handles nested parens like "(Poulologos (Tale of the Birds))"
  const lastClose = title.lastIndexOf(")");
  if (lastClose === title.length - 1 && lastClose > 0) {
    // Walk backwards to find the matching open paren
    let depth = 0;
    let openPos = -1;
    for (let i = lastClose; i >= 0; i--) {
      if (title[i] === ")") depth++;
      else if (title[i] === "(") {
        depth--;
        if (depth === 0) {
          openPos = i;
          break;
        }
      }
    }
    if (openPos > 0) {
      const original = title.slice(0, openPos).trim();
      const english = title.slice(openPos + 1, lastClose).trim();
      if (original.length > 0 && english.length > 0) {
        return { original, english };
      }
    }
  }

  // No parenthetical English — return title as-is
  return { original: title, english: null };
}

/**
 * Format an author name with locale awareness.
 * For zh locale: shows original script first (if available), English in parens.
 * For en locale: shows English name first, original script in parens.
 */
export function formatAuthorName(
  author: { name: string; nameOriginalScript?: string | null },
  locale: string
): { primary: string; secondary: string | null } {
  if (!author.nameOriginalScript) {
    return { primary: author.name, secondary: null };
  }
  if (locale === "zh") {
    return { primary: author.nameOriginalScript, secondary: author.name };
  }
  return { primary: author.name, secondary: author.nameOriginalScript };
}

/**
 * Format a text title with locale awareness.
 * For zh locale: shows original script first (if available), English in parens.
 * For en locale: shows English title first, original script in parens.
 */
export function formatTextTitle(
  text: { title: string; titleOriginalScript?: string | null },
  locale: string
): { primary: string; secondary: string | null } {
  if (!text.titleOriginalScript) {
    return { primary: text.title, secondary: null };
  }
  if (locale === "zh") {
    return { primary: text.titleOriginalScript, secondary: text.title };
  }
  return { primary: text.title, secondary: text.titleOriginalScript };
}
