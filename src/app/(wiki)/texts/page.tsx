import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublicServerTRPC } from "@/trpc/server";
import { BrowseCatalogue, type BrowseText } from "@/components/browse/BrowseCatalogue";

// ISR — the page no longer reads searchParams server-side, so it renders one
// unfiltered catalogue shell that is statically prerendered and edge-cached.
// The ?lang= / ?genre= filters are read client-side by BrowseCatalogue via
// useSearchParams(), so /texts, /texts?lang=zh, /texts?genre=poetry all serve
// the same cached HTML and differ only in client-side filtering. This was the
// last hot per-request-dynamic page on the site.
export const revalidate = 3600;

const TITLE = "Browse — Deltoi";
const DESCRIPTION =
  "Browse the full Deltoi corpus of pre-contemporary texts — over a thousand works in thirty languages, filterable by language and genre.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: "/texts",
    languages: {
      en: "/texts",
      "zh-Hans": "/cn/texts",
      es: "/es/texts",
      "x-default": "/texts",
    },
  },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website" },
  twitter: { title: TITLE, description: DESCRIPTION, card: "summary_large_image" },
};

export default async function BrowsePage() {
  const trpc = await getPublicServerTRPC();
  const allTextsRaw = await trpc.texts.list();

  // Flatten to a lean serialisable shape — descriptions and other long fields
  // stay server-side so the RSC payload carries only what the cards render.
  const allTexts: BrowseText[] = allTextsRaw.map((text) => ({
    title: text.title,
    titleOriginalScript: text.titleOriginalScript,
    titleZh: text.titleZh ?? null,
    titleEs: text.titleEs ?? null,
    slug: text.slug,
    totalChapters: text.totalChapters,
    genre: text.genre || "uncategorized",
    sortOrder: text.sortOrder ?? null,
    compositionYearDisplay: text.compositionYearDisplay ?? null,
    compositionYearDisplayEs: text.compositionYearDisplayEs ?? null,
    author: {
      name: text.author.name,
      nameOriginalScript: text.author.nameOriginalScript,
      nameEs: text.author.nameEs ?? null,
      slug: text.author.slug,
      era: text.author.era,
      eraEs: text.author.eraEs ?? null,
    },
    language: {
      code: text.language.code,
      name: text.language.name,
      displayName: text.language.displayName,
    },
  }));

  return (
    <main className="mx-auto max-w-5xl">
      {/* useSearchParams() requires a Suspense boundary during static
          prerender — the fallback shows until the client reads the URL. */}
      <Suspense
        fallback={
          <div className="py-8">
            <div className="mb-4 h-9 w-48 animate-pulse rounded-md bg-muted" />
            <div className="mb-3 flex gap-2">
              <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        }
      >
        <BrowseCatalogue allTexts={allTexts} />
      </Suspense>
    </main>
  );
}
