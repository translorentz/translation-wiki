import type { Metadata } from "next";
import { getPublicServerTRPC } from "@/trpc/server";
import { HomeBody, type HomeText } from "@/components/home/HomeBody";

// ISR — revalidate hourly. The homepage's data (text list, language/genre
// counts) changes only when a text is seeded, and the underlying texts.list
// unstable_cache has tag-based invalidation for that event. The server
// renders one locale-independent shell; HomeBody localises everything
// client-side (labels, counts, native-language hiding) via useLocale().
export const revalidate = 3600;

const TITLE = "Deltoi — Interlinear Translations of Classical Texts";
const DESCRIPTION =
  "A collaborative wiki of interlinear translations of pre-contemporary texts in over thirty source languages, side-by-side with English, Chinese, and Spanish.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      "zh-Hans": "/cn",
      es: "/es",
      "x-default": "/",
    },
  },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/", type: "website" },
  twitter: { title: TITLE, description: DESCRIPTION, card: "summary_large_image" },
};

export default async function HomePage() {
  const trpc = await getPublicServerTRPC();
  const allTextsRaw = await trpc.texts.list();

  // Flatten to a lean serialisable shape. No locale filtering here — the
  // native-language hiding rule depends on the viewer's UI locale, which
  // only the client knows; HomeBody applies it via useLocale().
  const texts: HomeText[] = allTextsRaw.map((text) => ({
    title: text.title,
    titleOriginalScript: text.titleOriginalScript,
    titleZh: text.titleZh ?? null,
    titleEs: text.titleEs ?? null,
    slug: text.slug,
    totalChapters: text.totalChapters,
    genre: text.genre || "uncategorized",
    compositionYear: text.compositionYear,
    compositionYearDisplay: text.compositionYearDisplay,
    compositionYearDisplayEs: text.compositionYearDisplayEs ?? null,
    compositionEra: text.compositionEra,
    author: {
      name: text.author.name,
      nameOriginalScript: text.author.nameOriginalScript,
      nameEs: text.author.nameEs ?? null,
      slug: text.author.slug,
    },
    language: {
      code: text.language.code,
      name: text.language.name,
      displayName: text.language.displayName,
    },
  }));

  return <HomeBody texts={texts} />;
}
