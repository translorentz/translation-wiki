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

// Types for accumulated results
type TextResult = {
  textId: number;
  textTitle: string;
  textSlug: string;
  authorName: string;
  authorSlug: string;
  langCode: string;
  totalChapters: number;
};

type ChapterResult = {
  chapterId: number;
  chapterNumber: number;
  chapterTitle: string | null;
  chapterSlug: string;
  textId: number;
  textTitle: string;
  textSlug: string;
  authorName: string;
  authorSlug: string;
  langCode: string;
  snippet?: string | null;
  matchParagraphIndex?: number | null;
};

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

  // Accumulated results for "Load More" functionality
  const [accumulatedTexts, setAccumulatedTexts] = useState<TextResult[]>([]);
  const [accumulatedChapters, setAccumulatedChapters] = useState<ChapterResult[]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch available languages
  const languagesQuery = useQuery(
    trpc.search.languages.queryOptions()
  );

  // Update URL params when query or languages change (no page param needed)
  const updateUrl = useCallback(
    (q: string, langs: string[]) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (langs.length > 0) params.set("lang", langs.join(","));
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
      updateUrl(query, selectedLanguages);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selectedLanguages, updateUrl]);

  // Reset accumulated results when query or languages change
  useEffect(() => {
    setAccumulatedTexts([]);
    setAccumulatedChapters([]);
    setCurrentOffset(0);
    setHasMoreResults(false);
  }, [query, selectedLanguages]);

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  };

  // Fast query: titles and author names only (initial load, offset 0)
  const titlesQuery = useQuery(
    trpc.search.titles.queryOptions(
      {
        q: query,
        languages: selectedLanguages.length > 0 ? selectedLanguages : undefined,
        limit: RESULTS_PER_PAGE,
        offset: 0,
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
        offset: 0,
        excludeTextIds,
        excludeChapterIds,
      },
      {
        enabled: query.length >= 2 && titlesQuery.isSuccess,
      }
    )
  );

  // Update accumulated results when initial queries complete
  useEffect(() => {
    if (titlesQuery.isSuccess && titlesQuery.data && currentOffset === 0) {
      setAccumulatedTexts(titlesQuery.data.texts);

      // Combine title chapters with content chapters
      const titleChapters = titlesQuery.data.chapters.map(ch => ({
        ...ch,
        snippet: null as string | null,
        matchParagraphIndex: null as number | null,
      }));

      if (contentQuery.isSuccess && contentQuery.data) {
        const seenIds = new Set(titleChapters.map(c => c.chapterId));
        const uniqueContentChapters = contentQuery.data.chapters.filter(
          c => !seenIds.has(c.chapterId)
        );
        setAccumulatedChapters([...titleChapters, ...uniqueContentChapters]);
        setHasMoreResults(titlesQuery.data.hasMore || contentQuery.data.hasMore);
      } else {
        setAccumulatedChapters(titleChapters);
        setHasMoreResults(titlesQuery.data.hasMore);
      }
    }
  }, [titlesQuery.isSuccess, titlesQuery.data, contentQuery.isSuccess, contentQuery.data, currentOffset]);

  // Load more handler
  const handleLoadMore = async () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    const newOffset = currentOffset + RESULTS_PER_PAGE;

    try {
      // Get all currently known IDs to exclude
      const allTextIds = accumulatedTexts.map(t => t.textId);
      const allChapterIds = accumulatedChapters.map(c => c.chapterId);

      // Fetch more content results (content search is what has "more" results typically)
      const response = await fetch(`/api/trpc/search.content?input=${encodeURIComponent(JSON.stringify({
        q: query,
        languages: selectedLanguages.length > 0 ? selectedLanguages : undefined,
        limit: RESULTS_PER_PAGE,
        offset: newOffset,
        excludeTextIds: allTextIds,
        excludeChapterIds: allChapterIds,
      }))}`);

      const result = await response.json();

      if (result.result?.data) {
        const newChapters = result.result.data.chapters as ChapterResult[];

        // Deduplicate against existing chapters
        const existingIds = new Set(accumulatedChapters.map(c => c.chapterId));
        const uniqueNewChapters = newChapters.filter(c => !existingIds.has(c.chapterId));

        setAccumulatedChapters(prev => [...prev, ...uniqueNewChapters]);
        setHasMoreResults(result.result.data.hasMore);
        setCurrentOffset(newOffset);
      }
    } catch (error) {
      console.error('Error loading more results:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const hasResults = accumulatedTexts.length > 0 || accumulatedChapters.length > 0;
  const isInitialLoading = titlesQuery.isLoading;
  const isContentLoading = contentQuery.isLoading;

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

      {/* Loading state */}
      {isInitialLoading && query.length >= 2 && (
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
      {hasResults && (
        <div className="space-y-4">
          {/* Text-level matches (title or author name) */}
          {accumulatedTexts.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Texts
              </h2>
              {accumulatedTexts.map((result) => (
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
          {accumulatedChapters.length > 0 && (
            <div className="space-y-2">
              {accumulatedTexts.length > 0 && (
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Chapters
                </h2>
              )}
              {accumulatedChapters.map((result) => (
                <Link
                  key={result.chapterId}
                  href={`/${result.langCode}/${result.authorSlug}/${result.textSlug}/${result.chapterSlug}${result.matchParagraphIndex != null ? `?highlight=${result.matchParagraphIndex}` : ''}`}
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
                    {result.snippet && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        ...{highlightMatch(result.snippet, query)}...
                      </p>
                    )}
                  </Card>
                </Link>
              ))}

              {/* Content search loading indicator */}
              {isContentLoading && (
                <p className="text-sm text-muted-foreground py-2">
                  Searching inside texts...
                </p>
              )}
            </div>
          )}

          {/* Load More button */}
          {hasMoreResults && !isContentLoading && (
            <div className="pt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
