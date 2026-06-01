import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicServerTRPC } from "@/trpc/server";
import { getTranslator, type Locale } from "@/i18n/shared";
import { Card } from "@/components/ui/card";
import { formatChapterTitle, formatAuthorName, formatTextTitle, localePath, localizedYearDisplay } from "@/lib/utils";
import { ExportButtons } from "@/components/ExportButtons";
import { buildBookJsonLd, buildBreadcrumbJsonLd, jsonLdScript } from "@/lib/jsonld";

// ISR — revalidate every 5 minutes. Combined with generateStaticParams()
// below, this promotes the dynamic-segment route from "dynamic on demand"
// (the Next 16 default for [param] segments without static params) to "SSG
// with revalidate", which is the only way the response gets the
// public, s-maxage=300 Cache-Control header that Cloudflare's Cache Rule
// can honour. Without generateStaticParams, `revalidate` is dead code on
// a dynamic-segment route.
export const revalidate = 300;

// Allow newly seeded texts (added after the build) to render on-demand and
// ISR-cache thereafter. This is the Next default; setting it explicitly so
// the contract is visible.
export const dynamicParams = true;

// SSR locale is fixed; client components localise post-hydration.
const SSR_LOCALE: Locale = "en";

// Enumerate every (lang, author, text) triple in the corpus so Next prerenders
// each text page at build time. Each newly-pushed deploy refreshes the list.
// Any text seeded between deploys still renders on-demand via dynamicParams.
export async function generateStaticParams() {
  const trpc = await getPublicServerTRPC();
  const texts = await trpc.texts.list();
  return texts.map((t) => ({
    lang: t.language.code,
    author: t.author.slug,
    text: t.slug,
  }));
}

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
  const trpc = await getPublicServerTRPC();
  const textData = await trpc.texts.getBySlug({
    langCode: lang,
    authorSlug: author,
    textSlug,
  });

  if (!textData) return { title: "Text Not Found" };

  // SSR metadata renders the English baseline. /cn/... and /es/... variants
  // are surfaced via the alternates.languages block so search engines find
  // them.
  const localizedTitle = textData.title;
  const localizedDescription = textData.description;
  const localizedAuthorName = textData.author.name;

  const fallbackDescription = `Read and translate ${localizedTitle} by ${localizedAuthorName}`;

  const canonicalPath = `/${lang}/${author}/${textSlug}`;
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

  const trpc = await getPublicServerTRPC();
  const locale: Locale = SSR_LOCALE;
  const t = getTranslator(locale);

  const textData = await trpc.texts.getBySlug({
    langCode: lang,
    authorSlug: author,
    textSlug,
  });

  if (!textData) {
    notFound();
  }

  const basePath = localePath(`/${lang}/${author}/${textSlug}`, locale);
  const description = textData.description;
  const titleDisplay = formatTextTitle(textData, locale);
  const authorDisplay = formatAuthorName(textData.author, locale);

  const localizedTextTitleForLd = textData.title;
  const localizedAuthorNameForLd = textData.author.name;
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
    { name: "Home", url: localePath("/", locale) },
    { name: "Browse", url: localePath("/texts", locale) },
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
