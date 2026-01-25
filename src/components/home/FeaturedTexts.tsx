"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    name: string;
    displayName: string;
  };
}

interface FeaturedTextsProps {
  texts: FeaturedText[];
}

type SortKey = "title" | "author";

/**
 * Groups texts by language, sorted by descending text count (most prolific language first).
 * Within each language, texts are sorted alphabetically by title or author name.
 */
export function FeaturedTexts({ texts }: FeaturedTextsProps) {
  const [sortBy, setSortBy] = useState<SortKey>("title");

  // Group texts by language and sort languages by descending text count
  const languageGroups = useMemo(() => {
    const grouped = new Map<
      string,
      { code: string; name: string; displayName: string; texts: FeaturedText[] }
    >();

    for (const text of texts) {
      const langCode = text.language.code;
      if (!grouped.has(langCode)) {
        grouped.set(langCode, {
          code: langCode,
          name: text.language.name,
          displayName: text.language.displayName,
          texts: [],
        });
      }
      grouped.get(langCode)!.texts.push(text);
    }

    // Sort languages by descending text count
    return Array.from(grouped.values()).sort(
      (a, b) => b.texts.length - a.texts.length
    );
  }, [texts]);

  // Sort texts within each language group
  const sortTexts = (textsToSort: FeaturedText[]) => {
    return [...textsToSort].sort((a, b) => {
      if (sortBy === "author") {
        return a.author.name.localeCompare(b.author.name);
      }
      return a.title.localeCompare(b.title);
    });
  };

  // All language codes for default expanded state
  const allLanguageCodes = languageGroups.map((g) => g.code);

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

      <Accordion type="multiple" defaultValue={allLanguageCodes} className="w-full">
        {languageGroups.map((langGroup) => (
          <AccordionItem key={langGroup.code} value={langGroup.code}>
            <AccordionTrigger className="text-base font-semibold hover:no-underline">
              <span>
                {langGroup.name}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({langGroup.texts.length} {langGroup.texts.length === 1 ? "work" : "works"})
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {sortTexts(langGroup.texts).map((text) => (
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
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {text.compositionEra && <span>{text.compositionEra}</span>}
                        {text.compositionYear != null && (
                          <span>
                            {text.compositionEra ? " " : ""}
                            ({Math.abs(text.compositionYear)} {text.compositionYear < 0 ? "BCE" : "CE"})
                          </span>
                        )}
                        {(text.compositionEra || text.compositionYear != null) && " — "}
                        {text.totalChapters} ch.
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
