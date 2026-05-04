import type { Metadata } from "next";
import { Suspense } from "react";
import { getLocale } from "@/i18n/server";
import SearchClient from "./SearchClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title =
    locale === "cn"
      ? "搜索 — Deltoi"
      : locale === "es"
      ? "Búsqueda — Deltoi"
      : "Search — Deltoi";
  const description =
    locale === "cn"
      ? "在 Deltoi 全文检索:数千部古典文献的源文及译文皆可全文搜索。"
      : locale === "es"
      ? "Búsqueda de texto completo en el corpus de Deltoi: textos originales y traducciones de miles de obras clásicas."
      : "Full-text search across the Deltoi corpus — original-language and translation text of thousands of pre-contemporary works.";
  const canonicalPath = "/search";
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: canonicalPath,
        "zh-Hans": `/cn${canonicalPath}`,
        es: `/es${canonicalPath}`,
        "x-default": canonicalPath,
      },
    },
    openGraph: { title, description, type: "website" },
    twitter: { title, description, card: "summary_large_image" },
  };
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchClient />
    </Suspense>
  );
}

function SearchFallback() {
  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold">Search</h1>
      <div className="mb-4 h-10 animate-pulse rounded-md bg-muted" />
      <div className="mb-6 flex gap-2">
        <div className="h-6 w-12 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-14 animate-pulse rounded-full bg-muted" />
      </div>
    </main>
  );
}
