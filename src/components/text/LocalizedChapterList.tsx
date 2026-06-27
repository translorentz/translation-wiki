"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n";
import { Card } from "@/components/ui/card";
import { formatChapterTitle, localePath } from "@/lib/utils";

interface ChapterEntry {
  chapterNumber: number;
  slug: string;
  title: string | null;
  titleZh: string | null;
  titleEs: string | null;
}

interface Props {
  chapters: ChapterEntry[];
  /** URL path of the parent text without locale prefix, e.g. /grc/foo/bar. */
  textBasePath: string;
  /** Source language code, used by formatChapterTitle to decide secondary text. */
  sourceLangCode: string;
}

/**
 * Renders the chapter index on a text page with locale-correct titles and
 * locale-prefixed hrefs. Each chapter row's title respects useLocale() at
 * render time — Chinese reads chapter.titleZh, Spanish reads chapter.titleEs,
 * etc. The locale-prefixed href routes navigation back through the right
 * /cn/ or /es/ path.
 */
export function LocalizedChapterList({
  chapters,
  textBasePath,
  sourceLangCode,
}: Props) {
  const { t, locale } = useTranslation();
  const basePath = localePath(textBasePath, locale);

  if (chapters.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        {t("textDetail.noChapters")}
      </p>
    );
  }

  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">
        {t("textDetail.chaptersCount").replace("{count}", String(chapters.length))}
      </h2>
      <div className="space-y-1">
        {chapters.map((chapter) => {
          const { primary, secondary } = formatChapterTitle(
            chapter,
            locale,
            sourceLangCode,
          );
          return (
            <Link
              key={chapter.chapterNumber}
              href={`${basePath}/${chapter.slug}`}
              prefetch={false}
              className="block"
            >
              <Card className="px-4 py-3 transition-colors hover:bg-muted/50">
                <div className="flex items-baseline gap-3">
                  <span className="w-8 shrink-0 text-right text-sm text-muted-foreground">
                    {chapter.chapterNumber}
                  </span>
                  <span>
                    {primary}
                    {secondary && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {secondary}
                      </span>
                    )}
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
