import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getServerTRPC } from "@/trpc/server";
import { FeaturedTexts } from "@/components/home/FeaturedTexts";
import { HighlightCards } from "@/components/home/HighlightCards";
import { getServerTranslation } from "@/i18n/server";
import { getGenreDisplayName, type Locale } from "@/i18n/shared";

export default async function HomePage() {
  const trpc = await getServerTRPC();
  const allTextsRaw = await trpc.texts.list();
  const { t, locale } = await getServerTranslation();

  // Get text IDs with Chinese translations (only needed in zh locale)
  const zhTranslatedIds = locale === "zh"
    ? new Set(await trpc.texts.getTextIdsWithTranslation({ targetLanguage: "zh" }))
    : null;

  // When viewing in Chinese, exclude Chinese-source texts (they don't need Chinese translation)
  const allTexts = locale === "zh"
    ? allTextsRaw.filter((t) => t.language.code !== "zh")
    : allTextsRaw;

  // Derive language links dynamically from the texts in the database
  // Count texts per language and sort by descending count (most prolific first)
  const languageCounts = new Map<string, { name: string; count: number }>();
  for (const text of allTexts) {
    const existing = languageCounts.get(text.language.code);
    if (existing) {
      existing.count++;
    } else {
      languageCounts.set(text.language.code, { name: text.language.name, count: 1 });
    }
  }
  const languageLinks = Array.from(languageCounts.entries())
    .map(([code, data]) => ({ code, label: data.name, count: data.count }))
    .sort((a, b) => b.count - a.count);

  // Count texts per genre and sort by descending count
  const genreCounts = new Map<string, number>();
  for (const text of allTexts) {
    const genre = text.genre || "uncategorized";
    genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
  }
  const genreLinks = Array.from(genreCounts.entries())
    .filter(([, count]) => count > 0)
    .map(([code, count]) => ({
      code,
      label: getGenreDisplayName(code, t),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const featuredTexts = allTexts.map((text) => ({
    title: text.title,
    titleOriginalScript: text.titleOriginalScript,
    titleZh: text.titleZh ?? null,
    slug: text.slug,
    totalChapters: text.totalChapters,
    compositionYear: text.compositionYear,
    compositionYearDisplay: text.compositionYearDisplay,
    compositionEra: text.compositionEra,
    author: {
      name: text.author.name,
      nameOriginalScript: text.author.nameOriginalScript,
      slug: text.author.slug,
    },
    language: {
      code: text.language.code,
      name: text.language.name,
      displayName: text.language.displayName,
    },
    hasZhTranslation: zhTranslatedIds ? zhTranslatedIds.has(text.id) : undefined,
  }));

  // Localise language labels for the sidebar
  const localizedLanguageLinks = languageLinks.map((lang) => {
    const key = `sourcelang.${lang.code}` as Parameters<typeof t>[0];
    const localized = t(key);
    return {
      ...lang,
      label: localized !== key ? localized : lang.label,
    };
  });

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("home.title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("home.subtitle")}
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("home.description")}
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button asChild>
            <Link href="/texts">{t("home.browseTexts")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/search">{t("home.searchTexts")}</Link>
          </Button>
        </div>
      </div>

      {/* Highlights */}
      <div className="mx-auto mb-8 max-w-5xl">
        <HighlightCards locale={locale} />
      </div>

      {/* Main content: sidebar + featured texts */}
      <div className="mx-auto flex max-w-5xl gap-8">
        {/* Sidebar */}
        <aside className="hidden w-48 shrink-0 md:block">
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            {t("home.exploreByLanguage")}
          </h2>
          <ul className="space-y-2">
            {localizedLanguageLinks.map((lang) => (
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
            {t("home.exploreByCategory")}
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
          <h2 className="mb-4 text-2xl font-semibold">{t("home.featuredTexts")}</h2>
          <FeaturedTexts texts={featuredTexts} />
        </section>
      </div>
    </div>
  );
}
