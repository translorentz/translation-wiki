import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/server/auth";
import { getServerTRPC } from "@/trpc/server";
import { getLocale, getServerTranslation } from "@/i18n/server";
import { formatChapterTitle } from "@/lib/utils";
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
  const locale = await getLocale();
  const { t } = await getServerTranslation();

  const textData = await trpc.texts.getBySlug({
    langCode: lang,
    authorSlug: author,
    textSlug,
  });

  if (!textData) {
    notFound();
  }

  const chapter = await trpc.chapters.getByTextAndSlug({
    textId: textData.id,
    slug: chapterSlug,
    targetLanguage: locale,
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
          {t("page.backToChapter")}
        </Link>
        {(() => {
          const { primary, secondary } = formatChapterTitle(chapter, locale, lang);
          return (
            <h1 className="mt-1 text-2xl font-bold">
              {t("page.editSourcePrefix")} {primary}
              {secondary && (
                <span className="ml-2 text-lg font-normal text-muted-foreground">
                  {secondary}
                </span>
              )}
            </h1>
          );
        })()}
        <p className="text-sm text-muted-foreground">
          {textData.title} — {t("page.chapterN").replace("{n}", String(chapter.chapterNumber))}
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
