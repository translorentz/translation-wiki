import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/server/auth";
import { getServerTRPC } from "@/trpc/server";
import { getServerTranslation } from "@/i18n/server";
import { parseChapterTitle, formatChapterTitle } from "@/lib/utils";
import { InterlinearViewer } from "@/components/interlinear/InterlinearViewer";
import { TableOfContents } from "@/components/navigation/TableOfContents";
import { Button } from "@/components/ui/button";
import { EndorseButton } from "@/components/endorsement/EndorseButton";

interface ChapterPageProps {
  params: Promise<{
    lang: string;
    author: string;
    text: string;
    chapter: string;
  }>;
}

export async function generateMetadata({
  params,
}: ChapterPageProps): Promise<Metadata> {
  const { lang, author, text: textSlug, chapter: chapterSlug } = await params;
  const trpc = await getServerTRPC();
  const textData = await trpc.texts.getBySlug({
    langCode: lang,
    authorSlug: author,
    textSlug,
  });

  if (!textData) return { title: "Chapter Not Found" };

  const chapterInfo = textData.chapters.find(
    (c) => c.slug === chapterSlug
  );
  const { original, english } = parseChapterTitle(chapterInfo?.title ?? null);
  const chapterTitle = english ? `${original} (${english})` : original;

  return {
    title: `${chapterTitle} — ${textData.title} — Deltoi`,
    description: `Read the translation of ${chapterTitle} from ${textData.title} by ${textData.author.name}`,
  };
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { lang, author, text: textSlug, chapter: chapterSlug } = await params;

  const session = await auth();
  const canEdit = session?.user?.role === "editor" || session?.user?.role === "admin";

  const trpc = await getServerTRPC();
  const { t, locale } = await getServerTranslation();

  // Fetch the text to get its ID and chapter list
  const textData = await trpc.texts.getBySlug({
    langCode: lang,
    authorSlug: author,
    textSlug,
  });

  if (!textData) {
    notFound();
  }

  // Fetch chapter data with translations for the current locale
  const chapter = await trpc.chapters.getByTextAndSlug({
    textId: textData.id,
    slug: chapterSlug,
    targetLanguage: locale,
  });

  if (!chapter) {
    notFound();
  }

  // Get the current translation content (if any)
  const translation = chapter.translations?.[0];
  const translationContent = translation?.currentVersion?.content as {
    paragraphs: { index: number; text: string }[];
  } | null;

  // Navigation: previous and next chapters by ordering
  const currentIdx = textData.chapters.findIndex(
    (c) => c.slug === chapterSlug
  );
  const prevChapter = currentIdx > 0 ? textData.chapters[currentIdx - 1] : undefined;
  const nextChapter = currentIdx < textData.chapters.length - 1 ? textData.chapters[currentIdx + 1] : undefined;

  const basePath = `/${lang}/${author}/${textSlug}`;

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
          {t("textDetail.chapters")}
        </h3>
        <TableOfContents
          chapters={textData.chapters}
          currentChapter={chapter.chapterNumber}
          textSlug={textSlug}
          authorSlug={author}
          langCode={lang}
        />
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={basePath}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {textData.title}
          </Link>
          {(() => {
            const { primary, secondary } = formatChapterTitle(chapter, locale, lang);
            return (
              <h1 className="mt-1 text-2xl font-bold">
                {primary}
                {secondary && (
                  <span className="ml-2 text-lg font-normal text-muted-foreground">
                    {secondary}
                  </span>
                )}
              </h1>
            );
          })()}
          <p className="text-sm text-muted-foreground">
            {t("chapter.chapterOf").replace("{n}", String(chapter.chapterNumber)).replace("{m}", String(textData.totalChapters))}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {canEdit && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`${basePath}/${chapterSlug}/edit`}>{t("chapter.editTranslation")}</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`${basePath}/${chapterSlug}/edit-source`}>{t("chapter.editSource")}</Link>
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${basePath}/${chapterSlug}/history`}>{t("chapter.history")}</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${basePath}/${chapterSlug}/discussion`}>{t("chapter.discussion")}</Link>
            </Button>
          </div>
        </div>

        {/* Interlinear content */}
        <InterlinearViewer
          sourceContent={
            (chapter.sourceContent as {
              paragraphs: { index: number; text: string }[];
            }) ?? { paragraphs: [] }
          }
          translationContent={translationContent ?? null}
          sourceLanguage={lang}
          textType={textData.textType}
        />

        {/* Endorsement */}
        {translation?.currentVersion && (
          <div className="mt-4 flex items-center gap-2">
            <EndorseButton
              translationVersionId={translation.currentVersion.id}
            />
            {translation.currentVersion.author && (
              <span className="text-xs text-muted-foreground">
                {t("chapter.translatedBy").replace("{name}", translation.currentVersion.author.username)}
              </span>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="mt-8 flex items-center justify-between border-t border-border pt-4">
          {prevChapter ? (
            <Button variant="outline" asChild>
              <Link href={`${basePath}/${prevChapter.slug}`}>
                {t("chapter.previous")}
              </Link>
            </Button>
          ) : (
            <div />
          )}
          {nextChapter ? (
            <Button variant="outline" asChild>
              <Link href={`${basePath}/${nextChapter.slug}`}>
                {t("chapter.next")}
              </Link>
            </Button>
          ) : (
            <div />
          )}
        </nav>
      </main>
    </div>
  );
}
