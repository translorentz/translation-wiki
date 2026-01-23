"use client";

import { cn } from "@/lib/utils";

interface ParagraphPairProps {
  index: number;
  sourceText: string;
  translationText: string | null;
  sourceLanguage: string;
}

const LANGUAGE_FONTS: Record<string, string> = {
  zh: "font-serif",
  grc: "font-serif",
  la: "font-serif",
};

export function ParagraphPair({
  index,
  sourceText,
  translationText,
  sourceLanguage,
}: ParagraphPairProps) {
  const sourceFontClass = LANGUAGE_FONTS[sourceLanguage] ?? "font-sans";

  return (
    <div className="group grid grid-cols-1 gap-x-6 border-b border-border/50 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Index gutter */}
      <span className="col-span-full text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 md:col-span-1 md:absolute md:-ml-8 md:mt-1">
        {index + 1}
      </span>

      {/* Source paragraph */}
      <div
        className={cn(
          "leading-relaxed",
          sourceFontClass,
          sourceLanguage === "zh" && "text-lg leading-loose",
          sourceLanguage === "grc" && "text-base leading-relaxed"
        )}
        lang={sourceLanguage}
      >
        {sourceText}
      </div>

      {/* Translation paragraph */}
      <div className="mt-2 leading-relaxed md:mt-0">
        {translationText ? (
          <span>{translationText}</span>
        ) : (
          <span className="italic text-muted-foreground">
            Not yet translated
          </span>
        )}
      </div>
    </div>
  );
}
