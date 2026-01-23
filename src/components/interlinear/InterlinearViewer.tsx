"use client";

import { ParagraphPair } from "./ParagraphPair";

interface Paragraph {
  index: number;
  text: string;
}

interface InterlinearViewerProps {
  sourceContent: { paragraphs: Paragraph[] };
  translationContent: { paragraphs: Paragraph[] } | null;
  sourceLanguage: string;
}

export function InterlinearViewer({
  sourceContent,
  translationContent,
  sourceLanguage,
}: InterlinearViewerProps) {
  const translationMap = new Map<number, string>();
  if (translationContent) {
    for (const p of translationContent.paragraphs) {
      translationMap.set(p.index, p.text);
    }
  }

  return (
    <div className="relative">
      {/* Column headers */}
      <div className="sticky top-0 z-10 mb-2 hidden border-b border-border bg-background/95 pb-2 backdrop-blur md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-x-6">
        <div className="text-sm font-medium text-muted-foreground">Source</div>
        <div className="text-sm font-medium text-muted-foreground">
          Translation
        </div>
      </div>

      {/* Paragraph pairs */}
      <div className="space-y-0">
        {sourceContent.paragraphs.map((paragraph) => (
          <ParagraphPair
            key={paragraph.index}
            index={paragraph.index}
            sourceText={paragraph.text}
            translationText={translationMap.get(paragraph.index) ?? null}
            sourceLanguage={sourceLanguage}
          />
        ))}
      </div>

      {sourceContent.paragraphs.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          No content available for this chapter.
        </p>
      )}
    </div>
  );
}
