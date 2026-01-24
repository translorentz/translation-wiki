"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FeaturedText {
  title: string;
  titleOriginalScript: string | null;
  slug: string;
  totalChapters: number;
  compositionYear: number | null;
  compositionEra: string | null;
  author: {
    name: string;
    nameOriginalScript: string | null;
    slug: string;
  };
  language: {
    code: string;
  };
}

interface FeaturedTextsProps {
  texts: FeaturedText[];
}

type SortKey = "title" | "author";

export function FeaturedTexts({ texts }: FeaturedTextsProps) {
  const [sortBy, setSortBy] = useState<SortKey>("title");

  const sorted = [...texts].sort((a, b) => {
    if (sortBy === "author") {
      return a.author.name.localeCompare(b.author.name);
    }
    return a.title.localeCompare(b.title);
  });

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort:</span>
        <Button
          variant={sortBy === "title" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setSortBy("title")}
        >
          Title
        </Button>
        <Button
          variant={sortBy === "author" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setSortBy("author")}
        >
          Author
        </Button>
      </div>

      <div className="space-y-2">
        {sorted.map((text) => (
          <Link
            key={text.slug}
            href={`/${text.language.code}/${text.author.slug}/${text.slug}`}
          >
            <Card className="px-4 py-2.5 transition-colors hover:bg-muted/50">
              <h3 className="text-base font-semibold leading-tight">
                {text.title}
                {text.titleOriginalScript && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({text.titleOriginalScript})
                  </span>
                )}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {text.author.name}
                {text.author.nameOriginalScript && (
                  <span className="ml-1">({text.author.nameOriginalScript})</span>
                )}
                {text.compositionEra && (
                  <span className="ml-1">— {text.compositionEra}</span>
                )}
                <span className="ml-1">— {text.totalChapters} ch.</span>
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
