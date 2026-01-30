import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerTRPC } from "@/trpc/server";
import { Card } from "@/components/ui/card";
import { parseChapterTitle } from "@/lib/utils";
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

  const textData = await trpc.texts.getBySlug({
    langCode: lang,
    authorSlug: author,
    textSlug,
  });

  if (!textData) {
    notFound();
  }

  const basePath = `/${lang}/${author}/${textSlug}`;

  return (
    <main className="mx-auto max-w-4xl">
      {/* Text metadata */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{textData.title}</h1>
        {textData.titleOriginalScript && (
          <p className="mt-1 text-xl text-muted-foreground">
            {textData.titleOriginalScript}
          </p>
        )}
        <p className="mt-2 text-muted-foreground">
          by{" "}
          <span className="font-medium text-foreground">
            {textData.author.name}
          </span>
          {textData.author.nameOriginalScript && (
            <span className="ml-1">({textData.author.nameOriginalScript})</span>
          )}
        </p>
        {textData.description && (
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {textData.description}
          </p>
        )}
        <div className="mt-4">
          <ExportButtons textId={textData.id} textTitle={textData.title} />
        </div>
      </div>

      {/* Chapter list */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">
          Chapters ({textData.chapters.length})
        </h2>
        <div className="space-y-1">
          {textData.chapters.map((chapter) => {
            const { original, english } = parseChapterTitle(chapter.title);
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
                      {original}
                      {english && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          {english}
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
            No chapters have been added yet.
          </p>
        )}
      </div>
    </main>
  );
}
