"use client";

import { useEffect } from "react";
import { ParagraphPair } from "./ParagraphPair";
import { MobileSourceToggle } from "./MobileSourceToggle";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface Paragraph {
  index: number;
  text: string | null;
}

interface InterlinearViewerProps {
  sourceContent: { paragraphs: Paragraph[] };
  translationContent: { paragraphs: Paragraph[] } | null;
  sourceLanguage: string;
  textType?: string;
}

export function InterlinearViewer({
  sourceContent,
  translationContent,
  sourceLanguage,
  textType,
}: InterlinearViewerProps) {
  const isPoetry = textType === "poetry";
  const isMobile = useIsMobile(768);
  const [hideSource, setHideSource] = useLocalStorage("hideSourceText", false);

  const translationMap = new Map<number, string | null>();
  if (translationContent) {
    for (const p of translationContent.paragraphs) {
      translationMap.set(p.index, p.text);
    }
  }

  // Only apply hideSource on mobile
  const effectiveHideSource = isMobile && hideSource;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlight = params.get('highlight');
    if (highlight) {
      setTimeout(() => {
        const el = document.getElementById(`paragraph-${highlight}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('bg-yellow-100/50');
          setTimeout(() => el.classList.remove('bg-yellow-100/50'), 2000);
        }
      }, 300);
    }
  }, []);

  return (
    <div className="relative">
      {/* Column headers - hidden when source is hidden on mobile */}
      <div
        className={`sticky top-0 z-10 mb-2 hidden border-b border-border bg-background/95 pb-2 backdrop-blur md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-x-6 ${isPoetry ? "pl-10 md:pl-12" : ""}`}
      >
        <div className="text-sm font-medium text-muted-foreground">Source</div>
        <div className="text-sm font-medium text-muted-foreground">
          Translation
        </div>
      </div>

      {/* Paragraph pairs */}
      <div className="space-y-0">
        {sourceContent.paragraphs.map((paragraph) => {
          const translationText = translationMap.get(paragraph.index) ?? null;
          // Skip rendering if both source and translation are null/empty
          if (paragraph.text === null && !translationText) {
            return null;
          }
          return (
            <ParagraphPair
              key={paragraph.index}
              index={paragraph.index}
              sourceText={paragraph.text}
              translationText={translationText}
              sourceLanguage={sourceLanguage}
              isPoetry={isPoetry}
              hideSource={effectiveHideSource}
            />
          );
        })}
      </div>

      {sourceContent.paragraphs.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          No content available for this chapter.
        </p>
      )}

      {/* Mobile-only toggle button */}
      {isMobile && (
        <MobileSourceToggle
          hideSource={hideSource}
          onToggle={() => setHideSource(!hideSource)}
        />
      )}
    </div>
  );
}
