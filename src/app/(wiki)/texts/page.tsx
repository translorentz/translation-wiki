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
    }[];
  }[];
}

const GENRE_DISPLAY_NAMES: Record<string, string> = {
  philosophy: "Philosophy",
  commentary: "Commentary",
  literature: "Literature",
  history: "History",
  science: "Science",
  uncategorized: "Uncategorized",
};

interface BrowsePageProps {
  searchParams: Promise<{ lang?: string; genre?: string }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const { lang, genre } = await searchParams;
  const trpc = await getServerTRPC();
  const allTexts = await trpc.texts.list();

  // Filter by genre if specified
  const filteredTexts = genre
    ? allTexts.filter((t) => t.genre === genre)
    : allTexts;

  // Calculate genre counts for the filter bar
  const genreCounts = new Map<string, number>();
  for (const t of allTexts) {
    const g = t.genre || "uncategorized";
    genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
  }
  const sortedGenres = Array.from(genreCounts.entries())
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  // Group texts by language, then by author
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
    });
  }

  // Sort languages by descending text count (most prolific first)
  const languages = Array.from(languageMap.values()).sort((a, b) => {
    const countA = a.authors.reduce((sum, author) => sum + author.texts.length, 0);
    const countB = b.authors.reduce((sum, author) => sum + author.texts.length, 0);
    return countB - countA;
  });

  const genreDisplayName = genre ? GENRE_DISPLAY_NAMES[genre] || genre : null;

  return (
    <main className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-3xl font-bold">Browse Texts</h1>

      {/* Genre filter bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/texts">
          <Badge
            variant={!genre ? "default" : "outline"}
            className="cursor-pointer transition-colors hover:bg-primary/80"
          >
            All ({allTexts.length})
          </Badge>
        </Link>
        {sortedGenres.map(([g, count]) => (
          <Link key={g} href={`/texts?genre=${g}`}>
            <Badge
              variant={genre === g ? "default" : "outline"}
              className="cursor-pointer transition-colors hover:bg-primary/80"
            >
              {GENRE_DISPLAY_NAMES[g] || g} ({count})
            </Badge>
          </Link>
        ))}
      </div>

      {/* Active filter indicator */}
      {genreDisplayName && (
        <p className="mb-4 text-sm text-muted-foreground">
          Showing {filteredTexts.length} texts in{" "}
          <span className="font-medium text-foreground">{genreDisplayName}</span>
          {" · "}
          <Link href="/texts" className="text-primary hover:underline">
            Clear filter
          </Link>
        </p>
      )}

      <CategoryBrowser languages={languages} defaultTab={lang} />
    </main>
  );
}
