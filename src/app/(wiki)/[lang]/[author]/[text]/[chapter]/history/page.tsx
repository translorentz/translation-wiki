import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerTRPC } from "@/trpc/server";
import { parseChapterTitle } from "@/lib/utils";
import { HistoryViewer } from "@/components/history/HistoryViewer";

interface HistoryPageProps {
  params: Promise<{
    lang: string;
    author: string;
    text: string;
    chapter: string;
  }>;
}

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { lang, author, text: textSlug, chapter: chapterSlug } = await params;

  const trpc = await getServerTRPC();

  const textData = await trpc.texts.getBySlug({
    langCode: lang,
    authorSlug: author,
    textSlug,
  });

  if (!textData) {
    notFound();
  }

  const chapterNumber = parseInt(chapterSlug.replace("chapter-", ""));
  if (isNaN(chapterNumber)) {
    notFound();
  }

  const chapter = await trpc.chapters.getByTextAndNumber({
    textId: textData.id,
    chapterNumber,
  });

  if (!chapter) {
    notFound();
  }

  // Get translation record for this chapter
  const translation = chapter.translations?.[0];

  let versions: Awaited<ReturnType<typeof trpc.translations.getHistory>> = [];
  if (translation) {
    versions = await trpc.translations.getHistory({
      translationId: translation.id,
    });
  }

  const chapterPath = `/${lang}/${author}/${textSlug}/${chapterSlug}`;

  return (
    <main className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link
          href={chapterPath}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to chapter
        </Link>
        {(() => {
          const { original, english } = parseChapterTitle(chapter.title);
          return (
            <h1 className="mt-1 text-2xl font-bold">
              History: {original}
              {english && (
                <span className="ml-2 text-lg font-normal text-muted-foreground">
                  {english}
                </span>
              )}
            </h1>
          );
        })()}
        <p className="text-sm text-muted-foreground">
          {textData.title} — {versions.length} version
          {versions.length !== 1 ? "s" : ""}
        </p>
      </div>

      {versions.length > 0 ? (
        <HistoryViewer versions={versions} />
      ) : (
        <p className="py-8 text-center text-muted-foreground">
          No translation history for this chapter yet.
        </p>
      )}
    </main>
  );
}
