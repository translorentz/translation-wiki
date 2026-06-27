"use client";

import Link from "next/link";
import { useTranslation, type TranslationKey } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { getGenreDisplayName } from "@/i18n/shared";
import { localePath } from "@/lib/utils";

interface Props {
  /** Sorted (genre-code, count) tuples for the genre filter row. */
  sortedGenres: [string, number][];
  /** Sorted (lang-code, { count, name }) tuples for the language filter row. */
  sortedLanguages: [string, { count: number; name: string }][];
  /** Active filter values from the URL. */
  activeGenre?: string;
  activeLang?: string;
  /** Total text counts for the "All" badges (recomputed by parent). */
  totalForGenreAll: number;
  totalForLangAll: number;
  /** Filtered-text count for the active-filter indicator. */
  filteredCount: number;
}

/**
 * Browse-page heading + filter bars. Server passes locale-independent
 * code/count tuples; this client component renders all the localised
 * labels (h1, "Category"/"Language" sublabels, genre names, language
 * names, "Showing N texts in X" indicator) via useTranslation().
 *
 * Links are absolute hrefs and use localePath() so navigating preserves
 * the user's chosen locale prefix.
 */
export function LocalizedBrowseFilters({
  sortedGenres,
  sortedLanguages,
  activeGenre,
  activeLang,
  totalForGenreAll,
  totalForLangAll,
  filteredCount,
}: Props) {
  const { t, locale } = useTranslation();

  const buildFilterUrl = (newLang?: string, newGenre?: string) => {
    const params = new URLSearchParams();
    if (newLang) params.set("lang", newLang);
    if (newGenre) params.set("genre", newGenre);
    const qs = params.toString();
    const path = qs ? `/texts?${qs}` : "/texts";
    return localePath(path, locale);
  };

  const genreDisplayName = activeGenre ? getGenreDisplayName(activeGenre, t) : null;

  const langDisplayName = activeLang
    ? (() => {
        const key = `sourcelang.${activeLang}` as TranslationKey;
        const localized = t(key);
        const fallback = sortedLanguages.find(([code]) => code === activeLang)?.[1].name ?? activeLang;
        return localized !== key ? localized : fallback;
      })()
    : null;

  return (
    <>
      <h1 className="mb-4 text-3xl font-bold">{t("browse.title")}</h1>

      {/* Category filter bar */}
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="flex items-center text-sm text-muted-foreground mr-2">
          {t("browse.category")}
        </span>
        <Link href={buildFilterUrl(activeLang, undefined)} prefetch={false}>
          <Badge
            variant={!activeGenre ? "default" : "outline"}
            className="cursor-pointer transition-colors hover:bg-primary/80"
          >
            {t("browse.all")} ({totalForGenreAll})
          </Badge>
        </Link>
        {sortedGenres.map(([g, count]) => (
          <Link key={g} href={buildFilterUrl(activeLang, g)} prefetch={false}>
            <Badge
              variant={activeGenre === g ? "default" : "outline"}
              className="cursor-pointer transition-colors hover:bg-primary/80"
            >
              {getGenreDisplayName(g, t)} ({count})
            </Badge>
          </Link>
        ))}
      </div>

      {/* Language filter bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="flex items-center text-sm text-muted-foreground mr-2">
          {t("browse.language")}
        </span>
        <Link href={buildFilterUrl(undefined, activeGenre)} prefetch={false}>
          <Badge
            variant={!activeLang ? "default" : "outline"}
            className="cursor-pointer transition-colors hover:bg-primary/80"
          >
            {t("browse.all")} ({totalForLangAll})
          </Badge>
        </Link>
        {sortedLanguages.map(([code, data]) => {
          const key = `sourcelang.${code}` as TranslationKey;
          const localizedName = t(key);
          const displayName = localizedName !== key ? localizedName : data.name;
          return (
            <Link key={code} href={buildFilterUrl(code, activeGenre)} prefetch={false}>
              <Badge
                variant={activeLang === code ? "default" : "outline"}
                className="cursor-pointer transition-colors hover:bg-primary/80"
              >
                {displayName} ({data.count})
              </Badge>
            </Link>
          );
        })}
      </div>

      {/* Active filter indicator */}
      {(genreDisplayName || langDisplayName) && (
        <p className="mb-4 text-sm text-muted-foreground">
          {t("browse.showing")} {filteredCount}{" "}
          {filteredCount !== 1 ? t("browse.texts") : t("browse.text")}
          {genreDisplayName && (
            <>
              {" "}
              {t("browse.in")}{" "}
              <span className="font-medium text-foreground">{genreDisplayName}</span>
            </>
          )}
          {langDisplayName && (
            <>
              {genreDisplayName ? " · " : ` ${t("browse.in")} `}
              <span className="font-medium text-foreground">{langDisplayName}</span>
            </>
          )}
          {" · "}
          <Link
            href={localePath("/texts", locale)}
            prefetch={false}
            className="text-primary hover:underline"
          >
            {t("browse.clearFilters")}
          </Link>
        </p>
      )}
    </>
  );
}
