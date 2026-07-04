import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicServerTRPC } from "@/trpc/server";
import { getTranslator, type Locale } from "@/i18n/shared";
import { parseChapterTitle, formatChapterTitle, localePath, localeToTargetLang } from "@/lib/utils";
import { LocalizedTranslationSection } from "@/components/interlinear/LocalizedTranslationSection";
import { TableOfContents } from "@/components/navigation/TableOfContents";
import { Button } from "@/components/ui/button";
import { ChapterEditAffordances } from "@/components/chapter/ChapterEditAffordances";
import { buildChapterJsonLd, buildBreadcrumbJsonLd, jsonLdScript } from "@/lib/jsonld";

// ISR — revalidate hourly. Combined with generateStaticParams below, this
// promotes the route from "ƒ Dynamic" to "● SSG with on-demand fallback".
// Chapters not in the static list are rendered on first request and
// ISR-cached. 1h matches the chapters unstable_cache TTL — translation
// pipeline scripts write directly to the DB and rely on TTL expiry.
export const revalidate = 3600;
export const dynamicParams = true;

// Server-render every chapter page as the English baseline. Non-English UI
// readers see English chapter content on first paint; the LocaleProvider
// switches header / footer labels client-side. The interlinear viewer's
// translation column is the English translation; a future bundle may add
// a client-side refetch keyed on useLocale() to swap in the user's preferred
// translation.
const SSR_LOCALE: Locale = "en";
const SSR_TARGET_LANG = localeToTargetLang(SSR_LOCALE);

// Returning an empty array opts the route into SSG-with-revalidate without
// enumerating the ~38K (lang, author, text, chapter) tuples at build time —
// which would blow build duration past Vercel's limits. Each unique chapter
// renders on first request and is then served from ISR cache.
export async function generateStaticParams() {
  return [];
}

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
  const trpc = await getPublicServerTRPC();
  const textData = await trpc.texts.getBySlug({
    langCode: lang,
    authorSlug: author,
    textSlug,
  });

  if (!textData) return { title: "Chapter Not Found" };

  const chapterInfo = textData.chapters.find((c) => c.slug === chapterSlug);

  // English baseline metadata. The alternates.languages block surfaces the
  // /cn/... and /es/... variants to search engines.
  const { original, english } = parseChapterTitle(chapterInfo?.title ?? null);
  const chapterTitle = english ? `${original} (${english})` : original;
  const textTitle = textData.title;
  const authorName = textData.author.name;
  const titleSuffix = `Read the translation of ${chapterTitle} from ${textTitle} by ${authorName}`;

  const canonicalPath = `/${lang}/${author}/${textSlug}/${chapterSlug}`;
  const pageTitle = `${chapterTitle} — ${textTitle}`;
  return {
    title: pageTitle,
    description: titleSuffix,
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
      title: pageTitle,
      description: titleSuffix,
      type: "article",
    },
    twitter: {
      title: pageTitle,
      description: titleSuffix,
      card: "summary_large_image",
    },
  };
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { lang, author, text: textSlug, chapter: chapterSlug } = await params;

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

  const chapter = await trpc.chapters.getByTextAndSlug({
    textId: textData.id,
    slug: chapterSlug,
    targetLanguage: SSR_TARGET_LANG,
  });

  if (!chapter) {
    notFound();
  }

  const translation = chapter.translations?.[0];
  const translationContent = translation?.currentVersion?.content as {
    paragraphs: { index: number; text: string }[];
  } | null;

  const currentIdx = textData.chapters.findIndex((c) => c.slug === chapterSlug);
  const prevChapter = currentIdx > 0 ? textData.chapters[currentIdx - 1] : undefined;
  const nextChapter =
    currentIdx < textData.chapters.length - 1 ? textData.chapters[currentIdx + 1] : undefined;

  const basePath = localePath(`/${lang}/${author}/${textSlug}`, locale);

  const textTitleForLd = textData.title;
  const authorNameForLd = textData.author.name;
  const chapterTitleForLd = chapter.title || `Chapter ${chapter.chapterNumber}`;
  const chapterJsonLd = buildChapterJsonLd({
    textTitle: textTitleForLd,
    textPath: `/${lang}/${author}/${textSlug}`,
    chapterTitle: chapterTitleForLd,
    chapterPath: `/${lang}/${author}/${textSlug}/${chapterSlug}`,
    chapterNumber: chapter.chapterNumber,
    sourceLangCode: lang,
    uiLocale: locale,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: localePath("/", locale) },
    { name: "Browse", url: localePath("/texts", locale) },
    { name: authorNameForLd, url: basePath.replace(`/${textSlug}`, "") },
    { name: textTitleForLd, url: basePath },
    { name: chapterTitleForLd, url: `${basePath}/${chapterSlug}` },
  ]);

  return (
    <div className="flex gap-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(chapterJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }} />
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
          {t("textDetail.chapters")}
        </h3>
        <TableOfContents
          chapters={textData.chapters}
          currentChapter={chapter.chapterNumber}
          textSlug={textSlug}
          authorSlug={author}
          langCode={lang}
        />
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        <div className="mb-6">
          <Link
            href={basePath}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {textData.title}
          </Link>
          {(() => {
            const { primary, secondary } = formatChapterTitle(chapter, locale, lang);
            return (
              <h1 className="mt-1 text-2xl font-bold">
                {primary}
                {secondary && (
                  <span className="ml-2 text-lg font-normal text-muted-foreground">
                    {secondary}
                  </span>
                )}
              </h1>
            );
          })()}
          <p className="text-sm text-muted-foreground">
            {t("chapter.chapterOf").replace("{n}", String(chapter.chapterNumber)).replace("{m}", String(textData.totalChapters))}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ChapterEditAffordances basePath={basePath} chapterSlug={chapterSlug} />
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${basePath}/${chapterSlug}/history`}>{t("chapter.history")}</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${basePath}/${chapterSlug}/discussion`}>{t("chapter.discussion")}</Link>
            </Button>
          </div>
        </div>

        <LocalizedTranslationSection
          textId={textData.id}
          chapterSlug={chapterSlug}
          sourceContent={
            (chapter.sourceContent as {
              paragraphs: { index: number; text: string }[];
            }) ?? { paragraphs: [] }
          }
          sourceLanguage={lang}
          textType={textData.textType}
          initialTranslationContent={translationContent ?? null}
          initialTranslationVersionId={translation?.currentVersion?.id ?? null}
          initialTranslationAuthorUsername={
            translation?.currentVersion?.author?.username ?? null
          }
          initialEndorsementCount={chapter.endorsementCount ?? 0}
        />

        <nav className="mt-8 flex items-center justify-between border-t border-border pt-4">
          {prevChapter ? (
            <Button variant="outline" asChild>
              <Link href={`${basePath}/${prevChapter.slug}`}>
                {t("chapter.previous")}
              </Link>
            </Button>
          ) : (
            <div />
          )}
          {nextChapter ? (
            <Button variant="outline" asChild>
              <Link href={`${basePath}/${nextChapter.slug}`}>
                {t("chapter.next")}
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
