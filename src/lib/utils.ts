import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Locale } from "@/i18n/shared"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Prepend /cn/, /hi/, or /es/ to a path when locale is non-English.
 * English paths have no prefix.
 * Idempotent: strips any existing locale prefix before prepending.
 */
export function localePath(path: string, locale: Locale | string): string {
  const basePath = path.replace(/^\/(cn|hi|es)/, "") || "/";
  if (locale === "cn") return `/cn${basePath}`;
  if (locale === "hi") return `/hi${basePath}`;
  if (locale === "es") return `/es${basePath}`;
  return basePath;
}

/**
 * Map a UI locale code to a DB target_language code.
 * The UI uses "cn" for Chinese, but the DB stores target_language = "zh".
 * Spanish uses "es" in both UI and DB.
 */
export function localeToTargetLang(locale: Locale | string): string {
  return locale === "cn" ? "zh" : locale;
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
  author: { name: string; nameOriginalScript?: string | null; nameHi?: string | null; nameEs?: string | null },
  locale: string
): { primary: string; secondary: string | null } {
  if (!author.nameOriginalScript) {
    if (locale === "es" && author.nameEs) {
      return { primary: author.nameEs, secondary: author.name };
    }
    return { primary: author.name, secondary: null };
  }
  if (locale === "cn") {
    return { primary: author.nameOriginalScript, secondary: author.name };
  }
  if (locale === "hi" && author.nameHi) {
    return { primary: author.nameHi, secondary: author.nameOriginalScript || author.name };
  }
  if (locale === "es" && author.nameEs) {
    return { primary: author.nameEs, secondary: author.nameOriginalScript || author.name };
  }
  return { primary: author.name, secondary: author.nameOriginalScript };
}

/**
 * Format a text title with locale awareness.
 * For zh locale: shows original script first (if available), English in parens.
 * For en locale: shows English title first, original script in parens.
 */
export function formatTextTitle(
  text: { title: string; titleOriginalScript?: string | null; titleZh?: string | null; titleHi?: string | null; titleEs?: string | null },
  locale: string
): { primary: string; secondary: string | null } {
  if (locale === "cn") {
    // Chinese site: show Chinese title first, original language title in grey
    const zhTitle = text.titleZh ?? text.titleOriginalScript;
    if (zhTitle) {
      // For Chinese-language texts, titleOriginalScript IS Chinese — show English as secondary
      // For other languages, show the original script as secondary
      const secondary = text.titleZh
        ? (text.titleOriginalScript ?? text.title)
        : text.title;
      // Avoid showing the same string twice
      return { primary: zhTitle, secondary: zhTitle === secondary ? null : secondary };
    }
    return { primary: text.title, secondary: null };
  }
  if (locale === "hi") {
    const hiTitle = text.titleHi ?? text.titleOriginalScript;
    if (hiTitle) {
      const secondary = text.titleHi
        ? (text.titleOriginalScript ?? text.title)
        : text.title;
      return { primary: hiTitle, secondary: hiTitle === secondary ? null : secondary };
    }
    return { primary: text.title, secondary: null };
  }
  if (locale === "es") {
    const esTitle = text.titleEs ?? text.titleOriginalScript;
    if (esTitle) {
      const secondary = text.titleEs
        ? (text.titleOriginalScript ?? text.title)
        : text.title;
      return { primary: esTitle, secondary: esTitle === secondary ? null : secondary };
    }
    return { primary: text.title, secondary: null };
  }
  if (!text.titleOriginalScript) {
    return { primary: text.title, secondary: null };
  }
  return { primary: text.title, secondary: text.titleOriginalScript };
}

/**
 * Format a chapter title with locale awareness.
 * For zh locale with Chinese-source texts: hides grey text (original IS Chinese).
 * For zh locale with other texts: shows Chinese title translation if available.
 * For en locale: shows English translation (current behaviour).
 */
export function formatChapterTitle(
  chapter: { title: string | null; titleZh?: string | null; titleHi?: string | null; titleEs?: string | null },
  locale: string,
  sourceLangCode?: string
): { primary: string; secondary: string | null } {
  const { original, english } = parseChapterTitle(chapter.title);

  if (locale === "cn") {
    // Chinese-source texts: original IS Chinese, no grey text needed
    if (sourceLangCode === "zh") {
      return { primary: original, secondary: null };
    }
    // Non-Chinese texts: show Chinese title as primary if available
    if (chapter.titleZh) {
      return { primary: chapter.titleZh, secondary: original };
    }
    // Fallback: show original with English as secondary
    return { primary: original, secondary: english };
  }

  if (locale === "hi") {
    // Hindi/Sanskrit-source texts: no grey text needed
    if (sourceLangCode === "sa" || sourceLangCode === "hi") {
      return { primary: original, secondary: null };
    }
    // Non-Hindi texts: show Hindi title as primary if available
    if (chapter.titleHi) {
      return { primary: chapter.titleHi, secondary: original };
    }
    return { primary: original, secondary: english };
  }

  if (locale === "es") {
    // Spanish-source texts: original IS Spanish, no grey text needed
    if (sourceLangCode === "es") {
      return { primary: original, secondary: null };
    }
    // Non-Spanish texts: show Spanish title as primary if available
    if (chapter.titleEs) {
      return { primary: chapter.titleEs, secondary: original };
    }
    return { primary: original, secondary: english };
  }

  return { primary: original, secondary: english };
}
