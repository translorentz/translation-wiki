"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useMemo } from "react";

interface TextSummary {
  title: string;
  titleOriginalScript: string | null;
  slug: string;
  totalChapters: number;
  genre?: string;
  compositionYearDisplay?: string | null;
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
        No texts match the current filters.
      </p>
    );
  }

  // If only one language, show without header (cleaner for filtered view)
  if (sortedLanguages.length === 1) {
    const lang = sortedLanguages[0];
    return (
      <div className="space-y-6">
        {lang.authors.map((author) => (
          <div key={author.slug}>
            <h3 className="mb-2 text-lg font-semibold">
              {author.name}
              {author.nameOriginalScript && (
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  {author.nameOriginalScript}
                </span>
              )}
              {author.era && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({author.era})
                </span>
              )}
            </h3>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {author.texts.map((text) => (
                <Link
                  key={text.slug}
                  href={`/${lang.code}/${author.slug}/${text.slug}`}
                >
                  <Card className="px-3 py-2 transition-colors hover:bg-muted/50">
                    <p className="text-sm font-medium leading-tight">{text.title}</p>
                    {text.titleOriginalScript && (
                      <p className="text-xs text-muted-foreground">
                        {text.titleOriginalScript}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {text.compositionYearDisplay && <>{text.compositionYearDisplay} &middot; </>}{text.totalChapters} ch.
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {lang.authors.length === 0 && (
          <p className="text-muted-foreground">
            No texts in this language yet.
          </p>
        )}
      </div>
    );
  }

  // Multiple languages: show grouped by language header
  return (
    <div className="space-y-8">
      {sortedLanguages.map((lang) => (
        <div key={lang.code}>
          <h2 className="mb-4 text-xl font-bold border-b pb-2">
            {lang.name}
            <span className="ml-2 text-base font-normal text-muted-foreground">
              ({textCounts.get(lang.code) ?? 0} text{(textCounts.get(lang.code) ?? 0) !== 1 ? "s" : ""})
            </span>
          </h2>
          <div className="space-y-6">
            {lang.authors.map((author) => (
              <div key={author.slug}>
                <h3 className="mb-2 text-lg font-semibold">
                  {author.name}
                  {author.nameOriginalScript && (
                    <span className="ml-2 text-base font-normal text-muted-foreground">
                      {author.nameOriginalScript}
                    </span>
                  )}
                  {author.era && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({author.era})
                    </span>
                  )}
                </h3>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {author.texts.map((text) => (
                    <Link
                      key={text.slug}
                      href={`/${lang.code}/${author.slug}/${text.slug}`}
                    >
                      <Card className="px-3 py-2 transition-colors hover:bg-muted/50">
                        <p className="text-sm font-medium leading-tight">{text.title}</p>
                        {text.titleOriginalScript && (
                          <p className="text-xs text-muted-foreground">
                            {text.titleOriginalScript}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {text.compositionYearDisplay && <>{text.compositionYearDisplay} &middot; </>}{text.totalChapters} ch.
                        </p>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {lang.authors.length === 0 && (
              <p className="text-muted-foreground">
                No texts in this language yet.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
