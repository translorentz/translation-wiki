"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { getGenreDisplayName } from "@/i18n/shared";
import { localePath, localeToTargetLang } from "@/lib/utils";
import { FeaturedTexts } from "@/components/home/FeaturedTexts";
import { HighlightCards } from "@/components/home/HighlightCards";

// Lean serialisable shape passed from the server page. Superset of the
// FeaturedTexts prop shape, plus `genre` for the sidebar category counts.
export interface HomeText {
  title: string;
  titleOriginalScript: string | null;
  titleZh: string | null;
  titleEs: string | null;
  slug: string;
  totalChapters: number;
  genre: string;
  compositionYear: number | null;
  compositionYearDisplay: string | null;
  compositionYearDisplayEs: string | null;
  compositionEra: string | null;
  author: {
    name: string;
    nameOriginalScript: string | null;
    nameEs: string | null;
    slug: string;
  };
  language: {
    code: string;
    name: string;
    displayName: string;
  };
}

/**
 * Locale-aware homepage body. The server page renders one locale-independent
 * shell (ISR-cacheable across /, /cn, /es); this component re-reads the UI
 * locale from LocaleProvider context and localises everything below the
 * navigation: hero copy, sidebar headings, language/genre link labels and
 * counts, and the featured-texts list.
 *
 * It also applies the native-language hiding rule with the REAL locale:
 * texts whose source language matches the viewer's UI language are excluded
 * from the sidebar counts and the featured list (a Chinese reader doesn't
 * need translations of Chinese sources). This rule had been pinned to the
 * English baseline since the SSR locale was hardcoded, which is why /cn was
 * showing "Chinese (411)" at the top of the language list.
 */
export function HomeBody({ texts }: { texts: HomeText[] }) {
  const { t, locale } = useTranslation();

  const { visibleTexts, languageLinks, genreLinks } = useMemo(() => {
    const nativeLang = localeToTargetLang(locale);
    const visibleTexts = texts.filter((x) => x.language.code !== nativeLang);

    const languageCounts = new Map<string, { name: string; count: number }>();
    for (const text of visibleTexts) {
      const existing = languageCounts.get(text.language.code);
      if (existing) {
        existing.count++;
      } else {
        languageCounts.set(text.language.code, {
          name: text.language.name,
          count: 1,
        });
      }
    }
    const languageLinks = Array.from(languageCounts.entries())
      .map(([code, data]) => {
        const key = `sourcelang.${code}` as Parameters<typeof t>[0];
        const localized = t(key);
        return {
          code,
          label: localized !== key ? localized : data.name,
          count: data.count,
        };
      })
      .sort((a, b) => b.count - a.count);

    const genreCounts = new Map<string, number>();
    for (const text of visibleTexts) {
      genreCounts.set(text.genre, (genreCounts.get(text.genre) || 0) + 1);
    }
    const genreLinks = Array.from(genreCounts.entries())
      .filter(([, count]) => count > 0)
      .map(([code, count]) => ({
        code,
        label: getGenreDisplayName(code, t),
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return { visibleTexts, languageLinks, genreLinks };
  }, [texts, locale, t]);

  return (
    <div className="px-4 pt-6 pb-16 sm:px-6 sm:pt-10 lg:px-8">
      {/* Hero */}
      <div className="mx-auto mb-16 max-w-5xl">
        <h1 className="font-[family-name:var(--font-lora)] text-4xl font-bold tracking-tight sm:text-5xl">
          {t("home.title")}
        </h1>
        <p className="mt-4 max-w-2xl font-[family-name:var(--font-lora)] text-lg text-muted-foreground">
          {t("home.subtitle")}
        </p>
        <div className="mt-8 flex gap-4">
          <Button variant="outline" asChild>
            <Link href={localePath("/texts", locale)} prefetch={false}>
              {t("home.browseTexts")}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={localePath("/search", locale)} prefetch={false}>
              {t("home.searchTexts")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Highlights */}
      <div className="mx-auto mb-8 max-w-5xl">
        <HighlightCards />
      </div>

      {/* Main content: sidebar + featured texts */}
      <div className="mx-auto flex max-w-5xl gap-8">
        {/* Sidebar */}
        <aside className="hidden w-48 shrink-0 md:block">
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            {t("home.exploreByLanguage")}
          </h2>
          <ul className="space-y-2">
            {languageLinks.map((lang) => (
              <li key={lang.code}>
                <Link
                  href={localePath(`/texts?lang=${lang.code}`, locale)}
                  prefetch={false}
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
                  href={localePath(`/texts?genre=${genre.code}`, locale)}
                  prefetch={false}
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
          <FeaturedTexts texts={visibleTexts} />
        </section>
      </div>
    </div>
  );
}
