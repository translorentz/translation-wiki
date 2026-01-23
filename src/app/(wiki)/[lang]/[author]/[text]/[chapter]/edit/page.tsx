import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerTRPC } from "@/trpc/server";
import { TextEditor } from "@/components/editor/TextEditor";

interface EditPageProps {
  params: Promise<{
    lang: string;
    author: string;
    text: string;
    chapter: string;
  }>;
}

export default async function EditPage({ params }: EditPageProps) {
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

  const sourceContent = (chapter.sourceContent as {
    paragraphs: { index: number; text: string }[];
  }) ?? { paragraphs: [] };

  // Get existing translation content if any
  const translation = chapter.translations?.[0];
  const existingContent = translation?.currentVersion?.content as {
    paragraphs: { index: number; text: string }[];
  } | null;

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
        <h1 className="mt-1 text-2xl font-bold">
          Edit: {chapter.title ?? `Chapter ${chapterNumber}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          {textData.title} — Chapter {chapterNumber}
        </p>
      </div>

      <TextEditor
        chapterId={chapter.id}
        sourceContent={sourceContent}
        existingTranslation={existingContent}
        sourceLanguage={lang}
        returnPath={returnPath}
      />
    </main>
  );
}
