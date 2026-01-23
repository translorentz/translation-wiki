import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/server/auth";
import { getServerTRPC } from "@/trpc/server";
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

  const chapterNumber = parseInt(chapterSlug.replace("chapter-", ""));
  const chapterInfo = textData.chapters.find(
    (c) => c.chapterNumber === chapterNumber
  );
  const chapterTitle =
    chapterInfo?.title ?? `Chapter ${chapterNumber}`;

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

  // Fetch the text to get its ID and chapter list
  const textData = await trpc.texts.getBySlug({
    langCode: lang,
    authorSlug: author,
    textSlug,
  });

  if (!textData) {
    notFound();
  }

  // Parse chapter number from slug (e.g., "chapter-5" -> 5)
  const chapterNumber = parseInt(chapterSlug.replace("chapter-", ""));
  if (isNaN(chapterNumber)) {
    notFound();
  }

  // Fetch chapter data with translations
  const chapter = await trpc.chapters.getByTextAndNumber({
    textId: textData.id,
    chapterNumber,
  });

  if (!chapter) {
    notFound();
  }

  // Get the current translation content (if any)
  const translation = chapter.translations?.[0];
  const translationContent = translation?.currentVersion?.content as {
    paragraphs: { index: number; text: string }[];
  } | null;

  // Navigation: previous and next chapters
  const prevChapter = textData.chapters.find(
    (c) => c.chapterNumber === chapterNumber - 1
  );
  const nextChapter = textData.chapters.find(
    (c) => c.chapterNumber === chapterNumber + 1
  );

  const basePath = `/${lang}/${author}/${textSlug}`;

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
          Chapters
        </h3>
        <TableOfContents
          chapters={textData.chapters}
          currentChapter={chapterNumber}
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
          <h1 className="mt-1 text-2xl font-bold">
            {chapter.title ?? `Chapter ${chapterNumber}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            Chapter {chapterNumber} of {textData.totalChapters}
          </p>
          <div className="mt-3 flex gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`${basePath}/${chapterSlug}/edit`}>Edit</Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${basePath}/${chapterSlug}/history`}>History</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${basePath}/${chapterSlug}/discussion`}>Discussion</Link>
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
        />

        {/* Endorsement */}
        {translation?.currentVersion && (
          <div className="mt-4 flex items-center gap-2">
            <EndorseButton
              translationVersionId={translation.currentVersion.id}
            />
            {translation.currentVersion.author && (
              <span className="text-xs text-muted-foreground">
                Translated by {translation.currentVersion.author.username}
              </span>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="mt-8 flex items-center justify-between border-t border-border pt-4">
          {prevChapter ? (
            <Button variant="outline" asChild>
              <Link href={`${basePath}/${prevChapter.slug}`}>
                Previous
              </Link>
            </Button>
          ) : (
            <div />
          )}
          {nextChapter ? (
            <Button variant="outline" asChild>
              <Link href={`${basePath}/${nextChapter.slug}`}>
                Next
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
