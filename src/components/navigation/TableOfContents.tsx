"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { cn, formatChapterTitle } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/i18n";

interface Chapter {
  chapterNumber: number;
  title: string | null;
  titleZh?: string | null;
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
  const { locale } = useTranslation();
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
  }, [currentChapter]);

  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <nav aria-label="Table of contents">
        <ul className="space-y-0.5 pr-4">
          {chapters.map((chapter) => {
            const isActive = chapter.chapterNumber === currentChapter;
            const href = `/${langCode}/${authorSlug}/${textSlug}/${chapter.slug}`;
            const { primary, secondary } = formatChapterTitle(chapter, locale, langCode);

            return (
              <li key={chapter.chapterNumber}>
                <Link
                  ref={isActive ? activeRef : undefined}
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
                  <span>{primary}</span>
                  {secondary && (
                    <span className="ml-1 text-xs opacity-70">
                      {secondary}
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
