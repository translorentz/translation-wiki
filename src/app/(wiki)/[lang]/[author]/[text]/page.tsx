import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerTRPC } from "@/trpc/server";
import { getServerTranslation, getLocale } from "@/i18n/server";
import { Card } from "@/components/ui/card";
import { formatChapterTitle, formatAuthorName, formatTextTitle, localePath, localizedYearDisplay } from "@/lib/utils";
import { ExportButtons } from "@/components/ExportButtons";
import { buildBookJsonLd, buildBreadcrumbJsonLd, jsonLdScript } from "@/lib/jsonld";

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
  const locale = await getLocale();
  const trpc = await getServerTRPC();
  const textData = await trpc.texts.getBySlug({
    langCode: lang,
    authorSlug: author,
    textSlug,
  });

  if (!textData) return { title: "Text Not Found" };

  const localizedTitle =
    (locale === "es" && textData.titleEs) ||
    (locale === "cn" && textData.titleZh) ||
    textData.title;
  const localizedDescription =
    (locale === "es" && textData.descriptionEs) ||
    (locale === "cn" && textData.descriptionZh) ||
    textData.description;
  const localizedAuthorName =
    (locale === "es" && textData.author.nameEs) ||
    (locale === "cn" && textData.author.nameZh) ||
    textData.author.name;

  const fallbackDescription =
    locale === "es"
      ? `Lee y traduce ${localizedTitle} por ${localizedAuthorName}`
      : locale === "cn"
      ? `阅读并翻译${localizedTitle},作者${localizedAuthorName}`
      : `Read and translate ${localizedTitle} by ${localizedAuthorName}`;

  const canonicalPath = `/${lang}/${author}/${textSlug}`;
  // The root layout's title.template appends " — Deltoi", so return only the
  // page-specific title here (otherwise we get "— Deltoi — Deltoi").
  return {
    title: localizedTitle,
    description: localizedDescription ?? fallbackDescription,
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: canonicalPath,
        "zh-Hans": `/cn${canonicalPath}`,
        es: `/es${canonicalPath}`,
        "x-default": canonicalPath,
      },
    },
    openGraph: {
      title: localizedTitle,
      description: localizedDescription ?? fallbackDescription,
      type: "article",
    },
    twitter: {
      title: localizedTitle,
      description: localizedDescription ?? fallbackDescription,
      card: "summary_large_image",
    },
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

  const basePath = localePath(`/${lang}/${author}/${textSlug}`, locale);
  const description = (locale === "cn" && textData.descriptionZh)
    || (locale === "hi" && textData.descriptionHi)
    || (locale === "es" && textData.descriptionEs)
    || textData.description;
  const titleDisplay = formatTextTitle(textData, locale);
  const authorDisplay = formatAuthorName(textData.author, locale);

  const localizedTextTitleForLd =
    (locale === "es" && textData.titleEs) ||
    (locale === "cn" && textData.titleZh) ||
    textData.title;
  const localizedAuthorNameForLd =
    (locale === "es" && textData.author.nameEs) ||
    (locale === "cn" && textData.author.nameZh) ||
    textData.author.name;
  const bookJsonLd = buildBookJsonLd({
    title: localizedTextTitleForLd,
    authorName: localizedAuthorNameForLd,
    description: description ?? null,
    sourceLangCode: lang,
    uiLocale: locale,
    textPath: `/${lang}/${author}/${textSlug}`,
    compositionYear: textData.compositionYear ?? null,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: locale === "cn" ? "首页" : locale === "es" ? "Inicio" : "Home", url: localePath("/", locale) },
    { name: locale === "cn" ? "浏览" : locale === "es" ? "Catálogo" : "Browse", url: localePath("/texts", locale) },
    { name: localizedAuthorNameForLd, url: basePath.replace(`/${textSlug}`, "") },
    { name: localizedTextTitleForLd, url: basePath },
  ]);

  return (
    <main className="mx-auto max-w-4xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(bookJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }} />
      {/* Text metadata */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{titleDisplay.primary}</h1>
        {titleDisplay.secondary && (
          <p className="mt-1 text-xl text-muted-foreground">
            {titleDisplay.secondary}
          </p>
        )}
        <p className="mt-2 text-muted-foreground">
          {locale !== "cn" && <>{t("common.by")} </>}
          <span className="font-medium text-foreground">
            {authorDisplay.primary}
          </span>
          {authorDisplay.secondary && (
            <span className="ml-1">({authorDisplay.secondary})</span>
          )}
          {(() => { const y = localizedYearDisplay(textData, locale); return y && (
            <span className="ml-2">&middot; {y}</span>
          ); })()}
        </p>
        {description && (
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        <div className="mt-4">
          <ExportButtons textId={textData.id} textTitle={textData.title} textSlug={textData.slug} />
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
