import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/server/auth";
import { getServerTRPC } from "@/trpc/server";
import { parseChapterTitle } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DiscussionClient } from "./DiscussionClient";

interface DiscussionPageProps {
  params: Promise<{
    lang: string;
    author: string;
    text: string;
    chapter: string;
  }>;
}

export default async function DiscussionPage({ params }: DiscussionPageProps) {
  const { lang, author, text: textSlug, chapter: chapterSlug } = await params;

  const session = await auth();
  const trpc = await getServerTRPC();

  const textData = await trpc.texts.getBySlug({
    langCode: lang,
    authorSlug: author,
    textSlug,
  });

  if (!textData) notFound();

  const chapterNumber = parseInt(chapterSlug.replace("chapter-", ""));
  if (isNaN(chapterNumber)) notFound();

  const chapter = await trpc.chapters.getByTextAndNumber({
    textId: textData.id,
    chapterNumber,
  });

  if (!chapter) notFound();

  const threads = await trpc.discussions.listByChapter({
    chapterId: chapter.id,
  });

  const basePath = `/${lang}/${author}/${textSlug}/${chapterSlug}`;

  return (
    <main className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={basePath}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {(() => {
            const { original, english } = parseChapterTitle(chapter.title);
            return (
              <>
                {original}
                {english && (
                  <span className="ml-1 text-muted-foreground">
                    {english}
                  </span>
                )}
              </>
            );
          })()}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Discussion</h1>
        <p className="text-sm text-muted-foreground">
          {textData.title} — Chapter {chapterNumber}
        </p>
      </div>

      <DiscussionClient
        chapterId={chapter.id}
        threads={threads}
        basePath={`${basePath}/discussion`}
        isLoggedIn={!!session?.user}
      />
    </main>
  );
}
