"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useLocale, useTranslation } from "@/i18n";
import { localeToTargetLang } from "@/lib/utils";
import { InterlinearViewer } from "./InterlinearViewer";
import { EndorseButton } from "@/components/endorsement/EndorseButton";

interface ParagraphContent {
  paragraphs: { index: number; text: string | null }[];
}

interface Props {
  textId: number;
  chapterSlug: string;
  sourceContent: ParagraphContent;
  sourceLanguage: string;
  textType?: string;
  /**
   * English baseline translation captured at SSR time. Used (a) as the
   * immediate content while the locale-specific refetch is in flight, and
   * (b) as the fallback when the user's locale has no translation for this
   * chapter — better to show English than a blank column.
   */
  initialTranslationContent: ParagraphContent | null;
  initialTranslationVersionId: number | null;
  initialTranslationAuthorUsername: string | null;
}

/**
 * Client wrapper that swaps in the correct locale translation after hydration.
 *
 * The chapter page renders the English translation server-side (so the page
 * shell is ISR-cacheable across all locales). For users whose UI locale is
 * not English, this component re-fetches the chapter with the correct target
 * language via tRPC and replaces the visible translation column + the
 * EndorseButton's version target with the locale-correct version once the
 * data arrives. While the refetch is pending, the English baseline is shown
 * — better than a blank column.
 */
export function LocalizedTranslationSection({
  textId,
  chapterSlug,
  sourceContent,
  sourceLanguage,
  textType,
  initialTranslationContent,
  initialTranslationVersionId,
  initialTranslationAuthorUsername,
}: Props) {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const locale = useLocale();
  const targetLang = localeToTargetLang(locale);
  // SSR is keyed to English; only refetch when the user's locale differs.
  const needsRefetch = targetLang !== "en";

  const query = useQuery({
    ...trpc.chapters.getByTextAndSlug.queryOptions({
      textId,
      slug: chapterSlug,
      targetLanguage: targetLang,
    }),
    enabled: needsRefetch,
  });

  const refetchedTranslation = query.data?.translations?.[0];
  const refetchedVersion = refetchedTranslation?.currentVersion;
  const refetchedContent = refetchedVersion?.content as
    | ParagraphContent
    | undefined;

  // Show the locale-correct content once it loads; otherwise the English
  // baseline. This covers both the "refetch in flight" case and the
  // "locale-specific translation doesn't exist" case (the second falls back
  // to English rather than a blank column).
  const content = refetchedContent ?? initialTranslationContent;
  const versionId = refetchedVersion?.id ?? initialTranslationVersionId;
  const authorUsername =
    refetchedVersion?.author?.username ?? initialTranslationAuthorUsername;

  return (
    <>
      <InterlinearViewer
        sourceContent={sourceContent}
        translationContent={content ?? null}
        sourceLanguage={sourceLanguage}
        textType={textType}
      />
      {versionId !== null && (
        <div className="mt-4 flex items-center gap-2">
          <EndorseButton translationVersionId={versionId} />
          {authorUsername && (
            <span className="text-xs text-muted-foreground">
              {t("chapter.translatedBy").replace("{name}", authorUsername)}
            </span>
          )}
        </div>
      )}
    </>
  );
}
