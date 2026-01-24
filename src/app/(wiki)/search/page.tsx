"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const trpc = useTRPC();

  const searchResults = useQuery(
    trpc.search.query.queryOptions(
      { q: query, limit: 20 },
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
        className="mb-6"
      />

      {searchResults.isLoading && query.length >= 2 && (
        <p className="text-sm text-muted-foreground">Searching...</p>
      )}

      {searchResults.data && !hasResults && (
        <p className="py-4 text-muted-foreground">
          No results found for &ldquo;{query}&rdquo;
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
                    <p className="font-medium">
                      {result.chapterTitle ??
                        `Chapter ${result.chapterNumber}`}
                    </p>
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
