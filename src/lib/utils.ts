import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parses a chapter title that may contain both original language and English.
 * Formats: "原文 (English Translation)" or "Ελληνικά (English Translation)"
 * Handles nested parens: "Πουλολόγος (Poulologos (Tale of the Birds))"
 * Returns the original-language portion and the English portion separately.
 */
export function parseChapterTitle(title: string | null): {
  original: string;
  english: string | null;
} {
  if (!title) return { original: "Untitled", english: null };

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
