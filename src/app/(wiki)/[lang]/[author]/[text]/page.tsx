import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerTRPC } from "@/trpc/server";
import { getServerTranslation } from "@/i18n/server";
import { Card } from "@/components/ui/card";
import { formatChapterTitle, formatAuthorName, formatTextTitle } from "@/lib/utils";
import { ExportButtons } from "@/components/ExportButtons";

interface TextPageProps {
  params: Promise<{
    lang: string;
    author: string;
    text: string;
  }>;
}

export async function generateMetadata({
  params,
}: TextPageProps): Promise<Metadata> {
  const { lang, author, text: textSlug } = await params;
  const trpc = await getServerTRPC();
  const textData = await trpc.texts.getBySlug({
    langCode: lang,
    authorSlug: author,
    textSlug,
  });

  if (!textData) return { title: "Text Not Found" };

  return {
    title: `${textData.title} — Deltoi`,
    description:
      textData.description ??
      `Read and translate ${textData.title} by ${textData.author.name}`,
  };
}

export default async function TextPage({ params }: TextPageProps) {
  const { lang, author, text: textSlug } = await params;

  const trpc = await getServerTRPC();
  const { t, locale } = await getServerTranslation();

  const textData = await trpc.texts.getBySlug({
    langCode: lang,
    authorSlug: author,
    textSlug,
  });

  if (!textData) {
    notFound();
  }

  const basePath = `/${lang}/${author}/${textSlug}`;
  const description = (locale === "zh" && textData.descriptionZh) || textData.description;
  const titleDisplay = formatTextTitle(textData, locale);
  const authorDisplay = formatAuthorName(textData.author, locale);

  return (
    <main className="mx-auto max-w-4xl">
      {/* Text metadata */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{titleDisplay.primary}</h1>
        {titleDisplay.secondary && (
          <p className="mt-1 text-xl text-muted-foreground">
            {titleDisplay.secondary}
          </p>
        )}
        <p className="mt-2 text-muted-foreground">
          {locale !== "zh" && <>{t("common.by")} </>}
          <span className="font-medium text-foreground">
            {authorDisplay.primary}
          </span>
          {authorDisplay.secondary && (
            <span className="ml-1">({authorDisplay.secondary})</span>
          )}
          {textData.compositionYearDisplay && (
            <span className="ml-2">&middot; {textData.compositionYearDisplay}</span>
          )}
        </p>
        {description && (
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        <div className="mt-4">
          <ExportButtons textId={textData.id} textTitle={textData.title} />
        </div>
      </div>

      {/* Chapter list */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">
          {t("textDetail.chaptersCount").replace("{count}", String(textData.chapters.length))}
        </h2>
        <div className="space-y-1">
          {textData.chapters.map((chapter) => {
            const { primary, secondary } = formatChapterTitle(chapter, locale, lang);
            return (
              <Link
                key={chapter.chapterNumber}
                href={`${basePath}/${chapter.slug}`}
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

        {textData.chapters.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            {t("textDetail.noChapters")}
          </p>
        )}
      </div>
    </main>
  );
}
