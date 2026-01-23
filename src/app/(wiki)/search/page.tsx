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

      {searchResults.data && searchResults.data.length === 0 && (
        <p className="py-4 text-muted-foreground">
          No results found for &ldquo;{query}&rdquo;
        </p>
      )}

      {searchResults.data && searchResults.data.length > 0 && (
        <div className="space-y-2">
          {searchResults.data.map((result) => (
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
    </main>
  );
}
