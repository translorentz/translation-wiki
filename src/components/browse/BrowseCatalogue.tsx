"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/i18n";
import { localeToTargetLang } from "@/lib/utils";
import { CategoryBrowser } from "@/components/navigation/CategoryBrowser";
import { LocalizedBrowseFilters } from "@/components/browse/LocalizedBrowseFilters";

// Flat, serialisable text summary passed from the server page. Deliberately
// excludes long fields (descriptions) to keep the RSC payload lean.
export interface BrowseText {
  title: string;
  titleOriginalScript: string | null;
  titleZh: string | null;
  titleEs: string | null;
  slug: string;
  totalChapters: number;
  genre: string;
  sortOrder: number | null;
  compositionYearDisplay: string | null;
  compositionYearDisplayEs: string | null;
  author: {
    name: string;
    nameOriginalScript: string | null;
    nameEs: string | null;
    slug: string;
    era: string | null;
    eraEs: string | null;
  };
  language: {
    code: string;
    name: string;
    displayName: string;
  };
}

interface LanguageGroup {
  code: string;
  name: string;
  displayName: string;
  authors: {
    name: string;
    nameOriginalScript: string | null;
    nameEs: string | null;
    slug: string;
    era: string | null;
    eraEs?: string | null;
    texts: Omit<BrowseText, "author" | "language">[];
  }[];
}

/**
 * Client-side catalogue for the Browse page. The server renders one
 * unfiltered, locale-independent shell (ISR-cacheable); this component reads
 * the ?lang= / ?genre= filters from the URL with useSearchParams() and does
 * all filtering, counting, and grouping in the browser. Moving the
 * searchParams read out of the server component is what lets /texts flip
 * from per-request dynamic rendering to an edge-cached static shell.
 *
 * It also restores locale-aware native-language hiding (texts whose source
 * language matches the viewer's UI language are hidden), which had been
 * stuck on the English rule since the SSR locale was pinned to "en".
 */
export function BrowseCatalogue({ allTexts }: { allTexts: BrowseText[] }) {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const lang = searchParams.get("lang") ?? undefined;
  const genre = searchParams.get("genre") ?? undefined;

  const {
    languages,
    sortedGenres,
    sortedLanguages,
    totalForGenreAll,
    totalForLangAll,
    filteredCount,
  } = useMemo(() => {
    // Hide texts whose source language matches the viewer's UI language —
    // a Chinese reader doesn't need translations of Chinese sources.
    const nativeLang = localeToTargetLang(locale);
    const visibleTexts = allTexts.filter((t) => t.language.code !== nativeLang);

    let filteredTexts = visibleTexts;
    if (genre) {
      filteredTexts = filteredTexts.filter((t) => t.genre === genre);
    }
    if (lang) {
      filteredTexts = filteredTexts.filter((t) => t.language.code === lang);
    }

    // Genre counts respect an active language filter, and vice versa.
    const textsForGenreCounts = lang
      ? visibleTexts.filter((t) => t.language.code === lang)
      : visibleTexts;
    const genreCounts = new Map<string, number>();
    for (const t of textsForGenreCounts) {
      genreCounts.set(t.genre, (genreCounts.get(t.genre) || 0) + 1);
    }
    const sortedGenres = Array.from(genreCounts.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    const textsForLangCounts = genre
      ? visibleTexts.filter((t) => t.genre === genre)
      : visibleTexts;
    const langCounts = new Map<string, { count: number; name: string }>();
    for (const text of textsForLangCounts) {
      const code = text.language.code;
      if (!langCounts.has(code)) {
        langCounts.set(code, { count: 0, name: text.language.name });
      }
      langCounts.get(code)!.count++;
    }
    const sortedLanguages = Array.from(langCounts.entries())
      .filter(([, data]) => data.count > 0)
      .sort((a, b) => b[1].count - a[1].count);

    // Group filtered texts by language, then author.
    const languageMap = new Map<string, LanguageGroup>();
    for (const text of filteredTexts) {
      const langCode = text.language.code;
      if (!languageMap.has(langCode)) {
        languageMap.set(langCode, {
          code: langCode,
          name: text.language.name,
          displayName: text.language.displayName,
          authors: [],
        });
      }
      const langGroup = languageMap.get(langCode)!;
      let authorGroup = langGroup.authors.find((a) => a.slug === text.author.slug);
      if (!authorGroup) {
        authorGroup = {
          name: text.author.name,
          nameOriginalScript: text.author.nameOriginalScript,
          nameEs: text.author.nameEs,
          slug: text.author.slug,
          era: text.author.era,
          eraEs: text.author.eraEs,
          texts: [],
        };
        langGroup.authors.push(authorGroup);
      }
      // Strip nested objects — CategoryBrowser's text cards don't need them.
      const { author: _a, language: _l, ...textFields } = text;
      authorGroup.texts.push(textFields);
    }

    // Sort texts within each author by sortOrder (canonical order), then title.
    for (const langGroup of languageMap.values()) {
      for (const authorGroup of langGroup.authors) {
        authorGroup.texts.sort((a, b) => {
          if (a.sortOrder !== null && b.sortOrder !== null) {
            return a.sortOrder - b.sortOrder;
          }
          if (a.sortOrder !== null) return -1;
          if (b.sortOrder !== null) return 1;
          return a.title.localeCompare(b.title);
        });
      }
      // Authors with sortOrder texts first (by min sortOrder), then A→Z.
      langGroup.authors.sort((a, b) => {
        const minOrderA = Math.min(...a.texts.map((t) => t.sortOrder ?? Infinity));
        const minOrderB = Math.min(...b.texts.map((t) => t.sortOrder ?? Infinity));
        if (minOrderA !== Infinity && minOrderB !== Infinity) {
          return minOrderA - minOrderB;
        }
        if (minOrderA !== Infinity) return -1;
        if (minOrderB !== Infinity) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    // Languages by descending text count.
    const languages = Array.from(languageMap.values()).sort((a, b) => {
      const countA = a.authors.reduce((sum, author) => sum + author.texts.length, 0);
      const countB = b.authors.reduce((sum, author) => sum + author.texts.length, 0);
      return countB - countA;
    });

    return {
      languages,
      sortedGenres,
      sortedLanguages,
      totalForGenreAll: textsForGenreCounts.length,
      totalForLangAll: textsForLangCounts.length,
      filteredCount: filteredTexts.length,
    };
  }, [allTexts, lang, genre, locale]);

  return (
    <>
      <LocalizedBrowseFilters
        sortedGenres={sortedGenres}
        sortedLanguages={sortedLanguages}
        activeGenre={genre}
        activeLang={lang}
        totalForGenreAll={totalForGenreAll}
        totalForLangAll={totalForLangAll}
        filteredCount={filteredCount}
      />
      <CategoryBrowser languages={languages} />
    </>
  );
}
