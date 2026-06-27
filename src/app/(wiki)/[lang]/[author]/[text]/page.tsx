import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicServerTRPC } from "@/trpc/server";
import { type Locale } from "@/i18n/shared";
import { localePath } from "@/lib/utils";
import { ExportButtons } from "@/components/ExportButtons";
import { LocalizedTextHeader } from "@/components/text/LocalizedTextHeader";
import { LocalizedChapterList } from "@/components/text/LocalizedChapterList";
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

// SSR is keyed to the English baseline so the page shell is the same across
// all UI locales (cacheable once at the edge). LocalizedTextHeader and
// LocalizedChapterList re-read locale via useLocale() and re-render with the
// correct locale fields after client hydration. All locale variants already
// come down with the page (titleZh, titleEs, descriptionZh, descriptionEs,
// nameZh, nameEs, etc.) — no extra network call needed.
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

  const textData = await trpc.texts.getBySlug({
    langCode: lang,
    authorSlug: author,
    textSlug,
  });

  if (!textData) {
    notFound();
  }

  // JSON-LD continues to render the English baseline; per-locale variants are
  // discoverable via the hreflang alternates set in generateMetadata. Indexing
  // each locale separately would require multiple JSON-LD blocks and isn't
  // needed for the regression fix.
  const basePath = localePath(`/${lang}/${author}/${textSlug}`, locale);
  const bookJsonLd = buildBookJsonLd({
    title: textData.title,
    authorName: textData.author.name,
    description: textData.description ?? null,
    sourceLangCode: lang,
    uiLocale: locale,
    textPath: `/${lang}/${author}/${textSlug}`,
    compositionYear: textData.compositionYear ?? null,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: localePath("/", locale) },
    { name: "Browse", url: localePath("/texts", locale) },
    { name: textData.author.name, url: basePath.replace(`/${textSlug}`, "") },
    { name: textData.title, url: basePath },
  ]);

  return (
    <main className="mx-auto max-w-4xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(bookJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }} />
      {/* Text metadata */}
      <div className="mb-8">
        <LocalizedTextHeader text={textData} />
        <div className="mt-4">
          <ExportButtons textId={textData.id} textTitle={textData.title} textSlug={textData.slug} />
        </div>
      </div>

      {/* Chapter list */}
      <div>
        <LocalizedChapterList
          chapters={textData.chapters}
          textBasePath={`/${lang}/${author}/${textSlug}`}
          sourceLangCode={lang}
        />
      </div>
    </main>
  );
}
