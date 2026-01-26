import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getServerTRPC } from "@/trpc/server";
import { FeaturedTexts } from "@/components/home/FeaturedTexts";

export default async function HomePage() {
  const trpc = await getServerTRPC();
  const allTexts = await trpc.texts.list();

  // Derive language links dynamically from the texts in the database
  // Count texts per language and sort by descending count (most prolific first)
  const languageCounts = new Map<string, { name: string; count: number }>();
  for (const t of allTexts) {
    const existing = languageCounts.get(t.language.code);
    if (existing) {
      existing.count++;
    } else {
      languageCounts.set(t.language.code, { name: t.language.name, count: 1 });
    }
  }
  const languageLinks = Array.from(languageCounts.entries())
    .map(([code, data]) => ({ code, label: data.name, count: data.count }))
    .sort((a, b) => b.count - a.count);

  // Count texts per genre and sort by descending count
  const genreDisplayNames: Record<string, string> = {
    philosophy: "Philosophy",
    commentary: "Commentary",
    literature: "Literature",
    history: "History",
    science: "Science",
    uncategorized: "Uncategorized",
  };
  const genreCounts = new Map<string, number>();
  for (const t of allTexts) {
    const genre = t.genre || "uncategorized";
    genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
  }
  const genreLinks = Array.from(genreCounts.entries())
    .filter(([, count]) => count > 0)
    .map(([code, count]) => ({
      code,
      label: genreDisplayNames[code] || code,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const featuredTexts = allTexts.map((t) => ({
    title: t.title,
    titleOriginalScript: t.titleOriginalScript,
    slug: t.slug,
    totalChapters: t.totalChapters,
    compositionYear: t.compositionYear,
    compositionEra: t.compositionEra,
    author: {
      name: t.author.name,
      nameOriginalScript: t.author.nameOriginalScript,
      slug: t.author.slug,
    },
    language: {
      code: t.language.code,
      name: t.language.name,
      displayName: t.language.displayName,
    },
  }));

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Deltoi
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          A collaborative wiki of interlinear translations of pre-contemporary texts.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The goal of this project is to allow translators and scholars to
          comment on, collaborate on, edit, criticise, check, and endorse
          translations of important texts that are not yet available in the
          English language. The initial translations on this website are made
          using artificial intelligence; this project aims to build upon that
          foundation to produce proper and accessible translations.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button asChild>
            <Link href="/texts">Browse Texts</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/search">Search Texts</Link>
          </Button>
        </div>
      </div>

      {/* Main content: sidebar + featured texts */}
      <div className="mx-auto flex max-w-5xl gap-8">
        {/* Sidebar */}
        <aside className="hidden w-48 shrink-0 md:block">
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            Explore By Language
          </h2>
          <ul className="space-y-2">
            {languageLinks.map((lang) => (
              <li key={lang.code}>
                <Link
                  href={`/texts?lang=${lang.code}`}
                  className="text-sm text-foreground transition-colors hover:text-primary"
                >
                  {lang.label}{" "}
                  <span className="text-muted-foreground">({lang.count})</span>
                </Link>
              </li>
            ))}
          </ul>

          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase text-muted-foreground">
            Explore By Category
          </h2>
          <ul className="space-y-2">
            {genreLinks.map((genre) => (
              <li key={genre.code}>
                <Link
                  href={`/texts?genre=${genre.code}`}
                  className="text-sm text-foreground transition-colors hover:text-primary"
                >
                  {genre.label}{" "}
                  <span className="text-muted-foreground">({genre.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Featured texts */}
        <section className="min-w-0 flex-1">
          <h2 className="mb-4 text-2xl font-semibold">Featured Texts</h2>
          <FeaturedTexts texts={featuredTexts} />
        </section>
      </div>
    </div>
  );
}
