import Link from "next/link";
import { getServerTRPC } from "@/trpc/server";
import { CategoryBrowser } from "@/components/navigation/CategoryBrowser";
import { Badge } from "@/components/ui/badge";

interface LanguageGroup {
  code: string;
  name: string;
  displayName: string;
  authors: {
    name: string;
    nameOriginalScript: string | null;
    slug: string;
    era: string | null;
    texts: {
      title: string;
      titleOriginalScript: string | null;
      slug: string;
      totalChapters: number;
      genre: string;
      sortOrder: number | null;
    }[];
  }[];
}

const GENRE_DISPLAY_NAMES: Record<string, string> = {
  philosophy: "Philosophy",
  commentary: "Commentary",
  literature: "Literature",
  history: "History",
  science: "Science",
  ritual: "Ritual",
  uncategorized: "Uncategorized",
};

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  zh: "Chinese",
  grc: "Greek",
  la: "Latin",
  ta: "Tamil",
  hy: "Armenian",
  it: "Italian",
  ms: "Malay",
  pl: "Polish",
};

interface BrowsePageProps {
  searchParams: Promise<{ lang?: string; genre?: string }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const { lang, genre } = await searchParams;
  const trpc = await getServerTRPC();
  const allTexts = await trpc.texts.list();

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
  for (const t of textsForLangCounts) {
    const code = t.language.code;
    if (!langCounts.has(code)) {
      langCounts.set(code, { count: 0, name: t.language.name });
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
        slug: text.author.slug,
        era: text.author.era,
        texts: [],
      };
      langGroup.authors.push(authorGroup);
    }

    authorGroup.texts.push({
      title: text.title,
      titleOriginalScript: text.titleOriginalScript,
      slug: text.slug,
      totalChapters: text.totalChapters,
      genre: text.genre || "uncategorized",
      sortOrder: text.sortOrder ?? null,
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
  }

  // Sort languages by descending text count (most prolific first)
  const languages = Array.from(languageMap.values()).sort((a, b) => {
    const countA = a.authors.reduce((sum, author) => sum + author.texts.length, 0);
    const countB = b.authors.reduce((sum, author) => sum + author.texts.length, 0);
    return countB - countA;
  });

  // Build filter link helpers
  const buildFilterUrl = (newLang?: string, newGenre?: string) => {
    const params = new URLSearchParams();
    if (newLang) params.set("lang", newLang);
    if (newGenre) params.set("genre", newGenre);
    const qs = params.toString();
    return qs ? `/texts?${qs}` : "/texts";
  };

  // Display names for active filters
  const genreDisplayName = genre ? GENRE_DISPLAY_NAMES[genre] || genre : null;
  const langDisplayName = lang ? LANGUAGE_DISPLAY_NAMES[lang] || langCounts.get(lang)?.name || lang : null;

  // Count totals for "All" badges
  const totalTextsForGenreAll = textsForGenreCounts.length;
  const totalTextsForLangAll = textsForLangCounts.length;

  return (
    <main className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-3xl font-bold">Browse Texts</h1>

      {/* Genre filter bar */}
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="flex items-center text-sm text-muted-foreground mr-2">Genre:</span>
        <Link href={buildFilterUrl(lang, undefined)}>
          <Badge
            variant={!genre ? "default" : "outline"}
            className="cursor-pointer transition-colors hover:bg-primary/80"
          >
            All ({totalTextsForGenreAll})
          </Badge>
        </Link>
        {sortedGenres.map(([g, count]) => (
          <Link key={g} href={buildFilterUrl(lang, g)}>
            <Badge
              variant={genre === g ? "default" : "outline"}
              className="cursor-pointer transition-colors hover:bg-primary/80"
            >
              {GENRE_DISPLAY_NAMES[g] || g} ({count})
            </Badge>
          </Link>
        ))}
      </div>

      {/* Language filter bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="flex items-center text-sm text-muted-foreground mr-2">Language:</span>
        <Link href={buildFilterUrl(undefined, genre)}>
          <Badge
            variant={!lang ? "default" : "outline"}
            className="cursor-pointer transition-colors hover:bg-primary/80"
          >
            All ({totalTextsForLangAll})
          </Badge>
        </Link>
        {sortedLanguages.map(([code, data]) => (
          <Link key={code} href={buildFilterUrl(code, genre)}>
            <Badge
              variant={lang === code ? "default" : "outline"}
              className="cursor-pointer transition-colors hover:bg-primary/80"
            >
              {data.name} ({data.count})
            </Badge>
          </Link>
        ))}
      </div>

      {/* Active filter indicator */}
      {(genreDisplayName || langDisplayName) && (
        <p className="mb-4 text-sm text-muted-foreground">
          Showing {filteredTexts.length} text{filteredTexts.length !== 1 ? "s" : ""}
          {genreDisplayName && (
            <>
              {" "}in <span className="font-medium text-foreground">{genreDisplayName}</span>
            </>
          )}
          {langDisplayName && (
            <>
              {genreDisplayName ? " · " : " in "}
              <span className="font-medium text-foreground">{langDisplayName}</span>
            </>
          )}
          {" · "}
          <Link href="/texts" className="text-primary hover:underline">
            Clear all filters
          </Link>
        </p>
      )}

      <CategoryBrowser languages={languages} />
    </main>
  );
}
