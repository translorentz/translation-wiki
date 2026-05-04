// JSON-LD structured-data builders for schema.org rich results.
// Inject the result via <script type="application/ld+json"> on the page that owns the entity.

const BASE_URL = "https://deltoi.com";

export function localePrefix(locale: string): string {
  if (locale === "cn") return "/cn";
  if (locale === "es") return "/es";
  return "";
}

export function localeToHtmlLang(locale: string): string {
  if (locale === "cn") return "zh-Hans";
  if (locale === "es") return "es";
  return "en";
}

interface CrumbInput {
  name: string;
  url: string;
}

export function buildBreadcrumbJsonLd(crumbs: CrumbInput[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url.startsWith("http") ? c.url : `${BASE_URL}${c.url}`,
    })),
  };
}

interface BookInput {
  title: string;
  authorName: string;
  description: string | null;
  sourceLangCode: string;
  uiLocale: string;
  textPath: string;
  compositionYear: number | null;
}

export function buildBookJsonLd(input: BookInput): object {
  const { title, authorName, description, sourceLangCode, textPath, compositionYear, uiLocale } =
    input;
  const url = `${BASE_URL}${localePrefix(uiLocale)}${textPath}`;
  const inLanguage = sourceLangCode === "grc" ? "grc" : sourceLangCode === "xcl" ? "xcl" : sourceLangCode;
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: title,
    author: { "@type": "Person", name: authorName },
    inLanguage,
    url,
    publisher: { "@type": "Organization", name: "Deltoi", url: BASE_URL },
  };
  if (description) node.description = description;
  if (compositionYear) {
    node.datePublished = compositionYear < 0 ? `${compositionYear}` : `${compositionYear}`;
  }
  // workTranslation indicates that the page also presents a translation in the UI locale.
  if (uiLocale !== "en" || sourceLangCode !== "en") {
    node.workTranslation = {
      "@type": "Book",
      inLanguage: localeToHtmlLang(uiLocale),
      translator: { "@type": "Organization", name: "Deltoi", url: BASE_URL },
    };
  }
  return node;
}

interface ChapterInput {
  textTitle: string;
  textPath: string;
  chapterTitle: string;
  chapterPath: string;
  chapterNumber: number;
  sourceLangCode: string;
  uiLocale: string;
}

export function buildChapterJsonLd(input: ChapterInput): object {
  const {
    textTitle,
    textPath,
    chapterTitle,
    chapterPath,
    chapterNumber,
    sourceLangCode,
    uiLocale,
  } = input;
  const prefix = localePrefix(uiLocale);
  return {
    "@context": "https://schema.org",
    "@type": "Chapter",
    name: chapterTitle,
    position: chapterNumber,
    inLanguage: sourceLangCode,
    url: `${BASE_URL}${prefix}${chapterPath}`,
    isPartOf: {
      "@type": "Book",
      name: textTitle,
      url: `${BASE_URL}${prefix}${textPath}`,
    },
  };
}

export function buildWebsiteJsonLd(uiLocale: string): object {
  const prefix = localePrefix(uiLocale);
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Deltoi",
    url: `${BASE_URL}${prefix || "/"}`,
    inLanguage: localeToHtmlLang(uiLocale),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}${prefix}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function jsonLdScript(data: object): string {
  // JSON.stringify with no indentation. Escape `<` so a stray `</script>` cannot break the page.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
