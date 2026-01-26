"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useMemo } from "react";

interface TextSummary {
  title: string;
  titleOriginalScript: string | null;
  slug: string;
  totalChapters: number;
  genre?: string;
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
  defaultTab?: string;
  showAllLanguages?: boolean;
}

/**
 * Displays texts grouped by language in a tabbed interface.
 * Languages are sorted by descending text count (most prolific first).
 * Tabs show text count for each language.
 * When showAllLanguages is true, displays all languages at once (no tabs).
 */
export function CategoryBrowser({ languages, defaultTab: defaultTabProp, showAllLanguages }: CategoryBrowserProps) {
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
        No texts available yet.
      </p>
    );
  }

  // If showAllLanguages is true, render all languages at once (grouped by language)
  if (showAllLanguages) {
    return (
      <div className="space-y-8">
        {sortedLanguages.map((lang) => (
          <div key={lang.code}>
            <h2 className="mb-4 text-xl font-bold border-b pb-2">
              {lang.name}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({textCounts.get(lang.code) ?? 0} texts)
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
                            {text.totalChapters} ch.
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

  // Default tabbed view
  const validTab = defaultTabProp && sortedLanguages.some((l) => l.code === defaultTabProp);
  const defaultTab = validTab ? defaultTabProp : sortedLanguages[0].code;

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      {/* Mobile: scrollable horizontal container */}
      <div className="mb-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <TabsList className="inline-flex w-max sm:w-auto sm:flex-wrap">
          {sortedLanguages.map((lang) => (
            <TabsTrigger
              key={lang.code}
              value={lang.code}
              className="whitespace-nowrap"
            >
              <span className="mr-1">{lang.name}</span>
              <span className="text-xs text-muted-foreground">
                ({textCounts.get(lang.code) ?? 0})
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {sortedLanguages.map((lang) => (
        <TabsContent key={lang.code} value={lang.code}>
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
                          {text.totalChapters} ch.
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
        </TabsContent>
      ))}
    </Tabs>
  );
}
