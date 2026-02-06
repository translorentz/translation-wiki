import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/server/auth";
import { getServerTRPC } from "@/trpc/server";
import { parseChapterTitle } from "@/lib/utils";
import { SourceEditor } from "@/components/editor/SourceEditor";

interface EditSourcePageProps {
  params: Promise<{
    lang: string;
    author: string;
    text: string;
    chapter: string;
  }>;
}

export default async function EditSourcePage({ params }: EditSourcePageProps) {
  const { lang, author, text: textSlug, chapter: chapterSlug } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "editor" && session.user.role !== "admin") {
    redirect(`/${lang}/${author}/${textSlug}/${chapterSlug}`);
  }

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

  const sourceContent = (chapter.sourceContent as {
    paragraphs: { index: number; text: string | null }[];
  }) ?? { paragraphs: [] };

  // Get translation content if it exists
  const translation = chapter.translations?.[0];
  const translationContent = translation?.currentVersion?.content as {
    paragraphs: { index: number; text: string | null }[];
  } | null;
  const translationId = translation?.id ?? null;

  const returnPath = `/${lang}/${author}/${textSlug}/${chapterSlug}`;

  return (
    <main className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link
          href={returnPath}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to chapter
        </Link>
        {(() => {
          const { original, english } = parseChapterTitle(chapter.title);
          return (
            <h1 className="mt-1 text-2xl font-bold">
              Edit Source: {original}
              {english && (
                <span className="ml-2 text-lg font-normal text-muted-foreground">
                  {english}
                </span>
              )}
            </h1>
          );
        })()}
        <p className="text-sm text-muted-foreground">
          {textData.title} — Chapter {chapterNumber}
        </p>
      </div>

      <SourceEditor
        chapterId={chapter.id}
        sourceContent={sourceContent}
        translationContent={translationContent}
        translationId={translationId}
        sourceLanguage={lang}
        returnPath={returnPath}
      />
    </main>
  );
}
