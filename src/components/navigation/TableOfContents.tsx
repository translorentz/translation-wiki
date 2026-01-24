"use client";

import Link from "next/link";
import { cn, parseChapterTitle } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Chapter {
  chapterNumber: number;
  title: string | null;
  slug: string;
}

interface TableOfContentsProps {
  chapters: Chapter[];
  currentChapter?: number;
  textSlug: string;
  authorSlug: string;
  langCode: string;
}

export function TableOfContents({
  chapters,
  currentChapter,
  textSlug,
  authorSlug,
  langCode,
}: TableOfContentsProps) {
  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <nav aria-label="Table of contents">
        <ul className="space-y-0.5 pr-4">
          {chapters.map((chapter) => {
            const isActive = chapter.chapterNumber === currentChapter;
            const href = `/${langCode}/${authorSlug}/${textSlug}/${chapter.slug}`;
            const { original, english } = parseChapterTitle(chapter.title);

            return (
              <li key={chapter.chapterNumber}>
                <Link
                  href={href}
                  className={cn(
                    "block rounded-md px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="mr-2 inline-block w-6 text-right text-xs opacity-60">
                    {chapter.chapterNumber}
                  </span>
                  <span>{original}</span>
                  {english && (
                    <span className="ml-1 text-xs opacity-70">
                      {english}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </ScrollArea>
  );
}
