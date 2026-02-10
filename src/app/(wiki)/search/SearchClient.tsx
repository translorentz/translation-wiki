"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { parseChapterTitle } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-900">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const trpc = useTRPC();

  const RESULTS_PER_PAGE = 20;

  // Initialize state from URL params
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() => {
    const langParam = searchParams.get("lang");
    return langParam ? langParam.split(",").filter(Boolean) : [];
  });
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
  });

  // Fetch available languages
  const languagesQuery = useQuery(
    trpc.search.languages.queryOptions()
  );

  // Update URL params when query, languages, or page change
  const updateUrl = useCallback(
    (q: string, langs: string[], p: number) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (langs.length > 0) params.set("lang", langs.join(","));
      if (p > 1) params.set("page", p.toString());
      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [pathname, router]
  );

  // Debounced URL update for query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      updateUrl(query, selectedLanguages, page);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selectedLanguages, page, updateUrl]);

  // Reset page when query or languages change
  useEffect(() => {
    setPage(1);
  }, [query, selectedLanguages]);

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  };

  // Fast query: titles and author names only
  const titlesQuery = useQuery(
    trpc.search.titles.queryOptions(
      {
        q: query,
        languages: selectedLanguages.length > 0 ? selectedLanguages : undefined,
        limit: RESULTS_PER_PAGE,
        offset: (page - 1) * RESULTS_PER_PAGE,
      },
      { enabled: query.length >= 2 }
    )
  );

  // Get IDs to exclude from content search
  const excludeTextIds = useMemo(() =>
    titlesQuery.data?.texts.map(t => t.textId) ?? [],
    [titlesQuery.data?.texts]
  );

  const excludeChapterIds = useMemo(() =>
    titlesQuery.data?.chapters.map(c => c.chapterId) ?? [],
    [titlesQuery.data?.chapters]
  );

  // Slow query: content search (only runs after titles query completes)
  const contentQuery = useQuery(
    trpc.search.content.queryOptions(
      {
        q: query,
        languages: selectedLanguages.length > 0 ? selectedLanguages : undefined,
        limit: RESULTS_PER_PAGE,
        offset: (page - 1) * RESULTS_PER_PAGE,
        excludeTextIds,
        excludeChapterIds,
      },
      {
        enabled: query.length >= 2 && titlesQuery.isSuccess,
      }
    )
  );

  // Combine results from both queries
  const hasResults =
    (titlesQuery.data?.texts.length ?? 0) > 0 ||
    (titlesQuery.data?.chapters.length ?? 0) > 0 ||
    (contentQuery.data?.chapters.length ?? 0) > 0;

  const allChapters = useMemo(() => {
    const titleChapters = titlesQuery.data?.chapters ?? [];
    const contentChapters = contentQuery.data?.chapters ?? [];

    // Deduplicate by chapter ID (shouldn't happen, but just in case)
    const seen = new Set(titleChapters.map(c => c.chapterId));
    const uniqueContentChapters = contentChapters.filter(c => !seen.has(c.chapterId));

    return [...titleChapters, ...uniqueContentChapters];
  }, [titlesQuery.data?.chapters, contentQuery.data?.chapters]);

  const hasMore = titlesQuery.data?.hasMore || contentQuery.data?.hasMore || false;

  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold">Search</h1>

      <Input
        type="search"
        placeholder="Search texts and chapters..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4"
      />

      {/* Language filter */}
      {languagesQuery.data && languagesQuery.data.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          {languagesQuery.data.map((lang) => {
            const isSelected = selectedLanguages.includes(lang.code);
            return (
              <button
                key={lang.code}
                onClick={() => toggleLanguage(lang.code)}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
              >
                <Badge
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer select-none"
                >
                  {lang.name}
                </Badge>
              </button>
            );
          })}
          {selectedLanguages.length > 0 && (
            <button
              onClick={() => setSelectedLanguages([])}
              className="text-xs text-muted-foreground underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Loading states */}
      {titlesQuery.isLoading && query.length >= 2 && (
        <p className="text-sm text-muted-foreground">Searching...</p>
      )}

      {/* No results message */}
      {titlesQuery.isSuccess && contentQuery.isSuccess && !hasResults && query.length >= 2 && (
        <p className="py-4 text-muted-foreground">
          No results found for &ldquo;{query}&rdquo;
          {selectedLanguages.length > 0 && " with the selected language filter"}
        </p>
      )}

      {/* Results */}
      {(titlesQuery.isSuccess || contentQuery.isSuccess) && hasResults && (
        <div className="space-y-4">
          {/* Text-level matches (title or author name) */}
          {titlesQuery.data && titlesQuery.data.texts.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Texts
              </h2>
              {titlesQuery.data.texts.map((result) => (
                <Link
                  key={result.textId}
                  href={`/${result.langCode}/${result.authorSlug}/${result.textSlug}`}
                >
                  <Card className="px-4 py-3 transition-colors hover:bg-muted/50">
                    <p className="font-medium">{result.textTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.authorName} — {result.totalChapters} chapter
                      {result.totalChapters !== 1 ? "s" : ""}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Chapter-level matches */}
          {allChapters.length > 0 && (
            <div className="space-y-2">
              {titlesQuery.data && titlesQuery.data.texts.length > 0 && (
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Chapters
                </h2>
              )}
              {allChapters.map((result) => (
                <Link
                  key={result.chapterId}
                  href={`/${result.langCode}/${result.authorSlug}/${result.textSlug}/${result.chapterSlug}${'matchParagraphIndex' in result && result.matchParagraphIndex != null ? `?highlight=${result.matchParagraphIndex}` : ''}`}
                >
                  <Card className="px-4 py-3 transition-colors hover:bg-muted/50">
                    {(() => {
                      const { original, english } = parseChapterTitle(
                        result.chapterTitle ?? null
                      );
                      return (
                        <p className="font-medium">
                          {original}
                          {english && (
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                              {english}
                            </span>
                          )}
                        </p>
                      );
                    })()}
                    <p className="text-sm text-muted-foreground">
                      {result.textTitle} — {result.authorName}
                    </p>
                    {'snippet' in result && typeof result.snippet === 'string' && result.snippet && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        ...{highlightMatch(result.snippet, query)}...
                      </p>
                    )}
                  </Card>
                </Link>
              ))}

              {/* Content search loading indicator */}
              {contentQuery.isLoading && (
                <p className="text-sm text-muted-foreground py-2">
                  Searching inside texts...
                </p>
              )}
            </div>
          )}

          {/* Pagination controls */}
          {allChapters.length > 0 && (
            <div className="flex items-center justify-between border-t pt-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
