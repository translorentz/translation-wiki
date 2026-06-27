import type { Metadata } from "next";
import { getPublicServerTRPC } from "@/trpc/server";
import { CategoryBrowser } from "@/components/navigation/CategoryBrowser";
import { LocalizedBrowseFilters } from "@/components/browse/LocalizedBrowseFilters";
import { type Locale } from "@/i18n/shared";
import { localeToTargetLang } from "@/lib/utils";

// Note: this page is dynamic by virtue of reading async `searchParams` for
// ?lang= and ?genre= filters. It cannot be ISR-cached without restructuring
// the filter UI to read URL params client-side. We've removed the now-
// redundant `force-dynamic` export and the cookies()-based getLocale() call,
// but the page itself still renders per request. Render is hardcoded as the
// English shell; client components localise labels post-hydration.
const SSR_LOCALE: Locale = "en";

const TITLE = "Browse — Deltoi";
const DESCRIPTION =
  "Browse the full Deltoi corpus of pre-contemporary texts — over a thousand works in thirty languages, filterable by language and genre.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: "/texts",
    languages: {
      en: "/texts",
      "zh-Hans": "/cn/texts",
      es: "/es/texts",
      "x-default": "/texts",
    },
  },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website" },
  twitter: { title: TITLE, description: DESCRIPTION, card: "summary_large_image" },
};

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
    texts: {
      title: string;
      titleOriginalScript: string | null;
      titleZh: string | null;
      titleEs: string | null;
      slug: string;
      totalChapters: number;
      genre: string;
      sortOrder: number | null;
      compositionYearDisplay: string | null;
      compositionYearDisplayEs?: string | null;
      hasZhTranslation?: boolean;
      hasHiTranslation?: boolean;
      hasEsTranslation?: boolean;
    }[];
  }[];
}

interface BrowsePageProps {
  searchParams: Promise<{ lang?: string; genre?: string }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const { lang, genre } = await searchParams;
  const trpc = await getPublicServerTRPC();
  const allTextsRaw = await trpc.texts.list();
  const locale: Locale = SSR_LOCALE;

  // Hide texts whose source language matches the (default English) viewer's
  // native language.
  const nativeLang = localeToTargetLang(locale);
  const allTexts = allTextsRaw.filter((t) => t.language.code !== nativeLang);

  // Apply both filters independently
  let filteredTexts = allTexts;
  if (genre) {
    filteredTexts = filteredTexts.filter((t) => t.genre === genre);
  }
  if (lang) {
    filteredTexts = filteredTexts.filter((t) => t.language.code === lang);
  }

  // Calculate genre counts - based on language filter if active
  const textsForGenreCounts = lang
    ? allTexts.filter((t) => t.language.code === lang)
    : allTexts;
  const genreCounts = new Map<string, number>();
  for (const t of textsForGenreCounts) {
    const g = t.genre || "uncategorized";
    genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
  }
  const sortedGenres = Array.from(genreCounts.entries())
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  // Calculate language counts - based on genre filter if active
  const textsForLangCounts = genre
    ? allTexts.filter((t) => t.genre === genre)
    : allTexts;
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

  // Group texts by language, then by author (for CategoryBrowser)
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
    let authorGroup = langGroup.authors.find(
      (a) => a.slug === text.author.slug
    );

    if (!authorGroup) {
      authorGroup = {
        name: text.author.name,
        nameOriginalScript: text.author.nameOriginalScript,
        nameEs: text.author.nameEs ?? null,
        slug: text.author.slug,
        era: text.author.era,
        eraEs: text.author.eraEs ?? null,
        texts: [],
      };
      langGroup.authors.push(authorGroup);
    }

    authorGroup.texts.push({
      title: text.title,
      titleOriginalScript: text.titleOriginalScript,
      titleZh: text.titleZh ?? null,
      titleEs: text.titleEs ?? null,
      slug: text.slug,
      totalChapters: text.totalChapters,
      genre: text.genre || "uncategorized",
      sortOrder: text.sortOrder ?? null,
      compositionYearDisplay: text.compositionYearDisplay ?? null,
      compositionYearDisplayEs: text.compositionYearDisplayEs ?? null,
      hasZhTranslation: undefined,
      hasHiTranslation: undefined,
      hasEsTranslation: undefined,
    });
  }

  // Sort texts within each author group by sortOrder (if set), then by title
  for (const langGroup of languageMap.values()) {
    for (const authorGroup of langGroup.authors) {
      authorGroup.texts.sort((a, b) => {
        // If both have sortOrder, use it (ascending)
        if (a.sortOrder !== null && b.sortOrder !== null) {
          return a.sortOrder - b.sortOrder;
        }
        // If only one has sortOrder, it comes first
        if (a.sortOrder !== null) return -1;
        if (b.sortOrder !== null) return 1;
        // Otherwise sort by title
        return a.title.localeCompare(b.title);
      });
    }

    // Sort authors within each language group:
    // - Authors with sortOrder texts come first (ordered by their min sortOrder)
    // - Then authors without sortOrder texts (ordered alphabetically)
    langGroup.authors.sort((a, b) => {
      const minOrderA = Math.min(
        ...a.texts.map((t) => t.sortOrder ?? Infinity)
      );
      const minOrderB = Math.min(
        ...b.texts.map((t) => t.sortOrder ?? Infinity)
      );

      // Both have sortOrder values
      if (minOrderA !== Infinity && minOrderB !== Infinity) {
        return minOrderA - minOrderB;
      }
      // Only A has sortOrder
      if (minOrderA !== Infinity) return -1;
      // Only B has sortOrder
      if (minOrderB !== Infinity) return 1;
      // Neither has sortOrder - sort alphabetically
      return a.name.localeCompare(b.name);
    });
  }

  // Sort languages by descending text count (most prolific first)
  const languages = Array.from(languageMap.values()).sort((a, b) => {
    const countA = a.authors.reduce((sum, author) => sum + author.texts.length, 0);
    const countB = b.authors.reduce((sum, author) => sum + author.texts.length, 0);
    return countB - countA;
  });

  // Count totals for "All" badges
  const totalTextsForGenreAll = textsForGenreCounts.length;
  const totalTextsForLangAll = textsForLangCounts.length;

  return (
    <main className="mx-auto max-w-5xl">
      <LocalizedBrowseFilters
        sortedGenres={sortedGenres}
        sortedLanguages={sortedLanguages}
        activeGenre={genre}
        activeLang={lang}
        totalForGenreAll={totalTextsForGenreAll}
        totalForLangAll={totalTextsForLangAll}
        filteredCount={filteredTexts.length}
      />
      <CategoryBrowser languages={languages} />
    </main>
  );
}
