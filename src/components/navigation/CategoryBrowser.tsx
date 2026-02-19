"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useMemo } from "react";
import { useTranslation } from "@/i18n";
import { cn, formatAuthorName, formatTextTitle } from "@/lib/utils";

interface TextSummary {
  title: string;
  titleOriginalScript: string | null;
  titleZh: string | null;
  slug: string;
  totalChapters: number;
  genre?: string;
  compositionYearDisplay?: string | null;
  hasZhTranslation?: boolean;
}

interface AuthorSummary {
  name: string;
  nameOriginalScript: string | null;
  slug: string;
  era: string | null;
  texts: TextSummary[];
}

interface LanguageGroup {
  code: string;
  name: string;
  displayName: string;
  authors: AuthorSummary[];
}

interface CategoryBrowserProps {
  languages: LanguageGroup[];
}

/**
 * Displays texts grouped by language.
 * Languages are sorted by descending text count (most prolific first).
 * Each language section shows text count.
 * When only one language is provided (after filtering), shows just that language's content.
 * When multiple languages, shows all grouped by language header.
 */
export function CategoryBrowser({ languages }: CategoryBrowserProps) {
  const { t, locale } = useTranslation();

  // Sort languages by descending text count
  const sortedLanguages = useMemo(() => {
    return [...languages].sort((a, b) => {
      const countA = a.authors.reduce((sum, author) => sum + author.texts.length, 0);
      const countB = b.authors.reduce((sum, author) => sum + author.texts.length, 0);
      return countB - countA;
    });
  }, [languages]);

  // Calculate text count per language for display
  const textCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lang of sortedLanguages) {
      counts.set(
        lang.code,
        lang.authors.reduce((sum, author) => sum + author.texts.length, 0)
      );
    }
    return counts;
  }, [sortedLanguages]);

  if (sortedLanguages.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        {t("featured.noMatch")}
      </p>
    );
  }

  // If only one language, show without header (cleaner for filtered view)
  if (sortedLanguages.length === 1) {
    const lang = sortedLanguages[0];
    return (
      <div className="space-y-6">
        {lang.authors.map((author) => {
          const authorDisplay = formatAuthorName(author, locale);
          return (
            <div key={author.slug}>
              <h3 className="mb-2 text-lg font-semibold">
                {authorDisplay.primary}
                {authorDisplay.secondary && (
                  <span className="ml-2 text-base font-normal text-muted-foreground">
                    {authorDisplay.secondary}
                  </span>
                )}
                {author.era && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({author.era})
                  </span>
                )}
              </h3>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {author.texts.map((text) => {
                  const titleDisplay = formatTextTitle(text, locale);
                  const isUntranslated = locale === "zh" && text.hasZhTranslation === false;
                  return (
                    <Link
                      key={text.slug}
                      href={`/${lang.code}/${author.slug}/${text.slug}`}
                    >
                      <Card className="px-3 py-2 transition-colors hover:bg-muted/50">
                        <p className={cn(
                          "text-sm font-medium leading-tight",
                          isUntranslated && "text-[#800000]"
                        )}>{titleDisplay.primary}</p>
                        {titleDisplay.secondary && (
                          <p className="text-xs text-muted-foreground">
                            {titleDisplay.secondary}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {text.compositionYearDisplay && <>{text.compositionYearDisplay} &middot; </>}{text.totalChapters} {t("featured.ch")}
                        </p>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        {lang.authors.length === 0 && (
          <p className="text-muted-foreground">
            {t("featured.noTexts")}
          </p>
        )}
      </div>
    );
  }

  // Multiple languages: show grouped by language header
  return (
    <div className="space-y-8">
      {sortedLanguages.map((lang) => {
        const langTextCount = textCounts.get(lang.code) ?? 0;
        return (
          <div key={lang.code}>
            <h2 className="mb-4 text-xl font-bold border-b pb-2">
              {t(`sourcelang.${lang.code}` as Parameters<typeof t>[0])}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({langTextCount === 1
                  ? t("featured.text").replace("{count}", "1")
                  : t("featured.texts").replace("{count}", String(langTextCount))})
              </span>
            </h2>
            <div className="space-y-6">
              {lang.authors.map((author) => {
                const authorDisplay = formatAuthorName(author, locale);
                return (
                  <div key={author.slug}>
                    <h3 className="mb-2 text-lg font-semibold">
                      {authorDisplay.primary}
                      {authorDisplay.secondary && (
                        <span className="ml-2 text-base font-normal text-muted-foreground">
                          {authorDisplay.secondary}
                        </span>
                      )}
                      {author.era && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({author.era})
                        </span>
                      )}
                    </h3>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {author.texts.map((text) => {
                        const titleDisplay = formatTextTitle(text, locale);
                        const isUntranslated = locale === "zh" && text.hasZhTranslation === false;
                        return (
                          <Link
                            key={text.slug}
                            href={`/${lang.code}/${author.slug}/${text.slug}`}
                          >
                            <Card className="px-3 py-2 transition-colors hover:bg-muted/50">
                              <p className={cn(
                                "text-sm font-medium leading-tight",
                                isUntranslated && "text-[#800000]"
                              )}>{titleDisplay.primary}</p>
                              {titleDisplay.secondary && (
                                <p className="text-xs text-muted-foreground">
                                  {titleDisplay.secondary}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {text.compositionYearDisplay && <>{text.compositionYearDisplay} &middot; </>}{text.totalChapters} {t("featured.ch")}
                              </p>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {lang.authors.length === 0 && (
                <p className="text-muted-foreground">
                  {t("featured.noTexts")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
