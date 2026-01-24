"use client";

import { cn } from "@/lib/utils";

interface ParagraphPairProps {
  index: number;
  sourceText: string;
  translationText: string | null;
  sourceLanguage: string;
  isPoetry?: boolean;
}

const LANGUAGE_FONTS: Record<string, string> = {
  zh: "font-serif",
  grc: "font-serif",
  la: "font-serif",
};

/**
 * Renders text with [bracketed commentary] displayed in dark maroon.
 * Splits on square brackets, alternating between main text and commentary.
 */
function renderWithCommentary(text: string): React.ReactNode {
  // Split on bracket groups, keeping the brackets as delimiters
  const parts = text.split(/(\[[^\]]*\])/g);
  if (parts.length === 1) return text; // No brackets found

  return parts.map((part, i) => {
    if (part.startsWith("[") && part.endsWith("]")) {
      return (
        <span key={i} className="text-[#6b2130]">
          {part}
        </span>
      );
    }
    return part;
  });
}

export function ParagraphPair({
  index,
  sourceText,
  translationText,
  sourceLanguage,
  isPoetry,
}: ParagraphPairProps) {
  const sourceFontClass = LANGUAGE_FONTS[sourceLanguage] ?? "font-sans";

  // For poetry, show line numbers every 5th line (traditional verse numbering)
  const showLineNumber = isPoetry && index % 5 === 0;

  return (
    <div
      className={cn(
        "group relative grid grid-cols-1 gap-x-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
        isPoetry
          ? "border-b border-border/20 py-1.5 pl-10 last:border-b-0 md:pl-12"
          : "border-b border-border/50 py-3 last:border-b-0"
      )}
    >
      {/* Line number gutter */}
      {isPoetry ? (
        <span
          className={cn(
            "absolute -ml-10 select-none text-xs tabular-nums text-muted-foreground md:-ml-12",
            showLineNumber ? "opacity-100" : "opacity-0"
          )}
        >
          {index}
        </span>
      ) : (
        <span className="col-span-full text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 md:col-span-1 md:absolute md:-ml-8 md:mt-1">
          {index}
        </span>
      )}

      {/* Source paragraph */}
      <div
        className={cn(
          "whitespace-pre-line leading-relaxed",
          sourceFontClass,
          sourceLanguage === "zh" && "text-lg leading-loose",
          sourceLanguage === "grc" && "text-base leading-relaxed",
          isPoetry && "leading-normal"
        )}
        lang={sourceLanguage}
      >
        {renderWithCommentary(sourceText)}
      </div>

      {/* Translation paragraph */}
      <div className={cn("whitespace-pre-line leading-relaxed", isPoetry ? "mt-0 leading-normal" : "mt-2 md:mt-0")}>
        {translationText ? (
          <span>{renderWithCommentary(translationText)}</span>
        ) : (
          <span className="italic text-muted-foreground">
            Not yet translated
          </span>
        )}
      </div>
    </div>
  );
}
