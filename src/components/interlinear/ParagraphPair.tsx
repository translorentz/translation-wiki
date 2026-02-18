"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

interface ParagraphPairProps {
  index: number;
  sourceText: string | null;
  translationText: string | null;
  sourceLanguage: string;
  isPoetry?: boolean;
  hideSource?: boolean;
}

const LANGUAGE_FONTS: Record<string, string> = {
  zh: "font-serif",
  grc: "font-serif",
  la: "font-serif",
  hy: "font-serif",
  ta: "font-serif",
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
  hideSource,
}: ParagraphPairProps) {
  const { t } = useTranslation();
  const sourceFontClass = LANGUAGE_FONTS[sourceLanguage] ?? "font-sans";

  // For poetry, show line numbers every 5th line (traditional verse numbering)
  const showLineNumber = isPoetry && index % 5 === 0;

  return (
    <div
      id={`paragraph-${index}`}
      className={cn(
        "group relative grid gap-x-6",
        // When hiding source on mobile, use single column; otherwise maintain responsive grid
        hideSource
          ? "grid-cols-1"
          : "grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
        isPoetry
          ? "border-b border-border/20 py-1.5 last:border-b-0"
          : "border-b border-border/50 py-3 last:border-b-0",
        // Only add left padding for line numbers when showing source in poetry mode
        isPoetry && !hideSource && "pl-10 md:pl-12"
      )}
    >
      {/* Line number gutter - only show when source is visible */}
      {isPoetry && !hideSource ? (
        <span
          className={cn(
            "absolute -ml-10 select-none text-xs tabular-nums text-muted-foreground md:-ml-12",
            showLineNumber ? "opacity-100" : "opacity-0"
          )}
        >
          {index}
        </span>
      ) : !isPoetry && !hideSource ? (
        <span className="col-span-full text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 md:col-span-1 md:absolute md:-ml-8 md:mt-1">
          {index}
        </span>
      ) : null}

      {/* Source paragraph - conditionally rendered with animation */}
      <div
        className={cn(
          "whitespace-pre-line leading-relaxed transition-all duration-200",
          sourceFontClass,
          sourceLanguage === "zh" && "text-lg leading-loose",
          sourceLanguage === "grc" && "text-base leading-relaxed",
          isPoetry && "leading-normal",
          // Hide source with smooth transition
          hideSource && "hidden"
        )}
        lang={sourceLanguage}
        aria-hidden={hideSource}
      >
        {sourceText !== null ? (
          renderWithCommentary(sourceText)
        ) : (
          <span className="italic text-muted-foreground">
            {t("interlinear.sourceRemoved")}
          </span>
        )}
      </div>

      {/* Translation paragraph */}
      <div
        className={cn(
          "whitespace-pre-line leading-relaxed transition-all duration-200",
          isPoetry ? "leading-normal" : "",
          // Remove top margin when source is hidden (mobile only)
          hideSource ? "mt-0" : isPoetry ? "mt-0" : "mt-2 md:mt-0"
        )}
      >
        {translationText ? (
          <span>{renderWithCommentary(translationText)}</span>
        ) : (
          <span className="italic text-muted-foreground">
            {t("interlinear.notTranslated")}
          </span>
        )}
      </div>
    </div>
  );
}
