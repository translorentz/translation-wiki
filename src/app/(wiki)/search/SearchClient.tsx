"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { parseChapterTitle } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const trpc = useTRPC();

  // Initialize state from URL params
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() => {
    const langParam = searchParams.get("lang");
    return langParam ? langParam.split(",").filter(Boolean) : [];
  });

  // Fetch available languages
  const languagesQuery = useQuery(
    trpc.search.languages.queryOptions()
  );

  // Update URL params when query or languages change
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

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  };

  const searchResults = useQuery(
    trpc.search.query.queryOptions(
      {
        q: query,
        languages: selectedLanguages.length > 0 ? selectedLanguages : undefined,
        limit: 20,
      },
      { enabled: query.length >= 2 }
    )
  );

  const hasResults =
    searchResults.data &&
    (searchResults.data.texts.length > 0 ||
      searchResults.data.chapters.length > 0);

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
                  {lang.displayName}
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

      {searchResults.isLoading && query.length >= 2 && (
        <p className="text-sm text-muted-foreground">Searching...</p>
      )}

      {searchResults.data && !hasResults && query.length >= 2 && (
        <p className="py-4 text-muted-foreground">
          No results found for &ldquo;{query}&rdquo;
          {selectedLanguages.length > 0 && " with the selected language filter"}
        </p>
      )}

      {hasResults && (
        <div className="space-y-4">
          {/* Text-level matches (title or author name) */}
          {searchResults.data!.texts.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Texts
              </h2>
              {searchResults.data!.texts.map((result) => (
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

          {/* Chapter-level matches (chapter title or source content) */}
          {searchResults.data!.chapters.length > 0 && (
            <div className="space-y-2">
              {searchResults.data!.texts.length > 0 && (
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Chapters
                </h2>
              )}
              {searchResults.data!.chapters.map((result) => (
                <Link
                  key={result.chapterId}
                  href={`/${result.langCode}/${result.authorSlug}/${result.textSlug}/${result.chapterSlug}`}
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
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
