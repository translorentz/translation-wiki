import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getServerTRPC } from "@/trpc/server";
import { FeaturedTexts } from "@/components/home/FeaturedTexts";

const LANGUAGE_LINKS = [
  { code: "zh", label: "Chinese" },
  { code: "grc", label: "Greek" },
  { code: "la", label: "Latin" },
];

export default async function HomePage() {
  const trpc = await getServerTRPC();
  const allTexts = await trpc.texts.list();

  const featuredTexts = allTexts.map((t) => ({
    title: t.title,
    titleOriginalScript: t.titleOriginalScript,
    slug: t.slug,
    totalChapters: t.totalChapters,
    compositionYear: t.compositionYear,
    compositionEra: t.compositionEra,
    author: {
      name: t.author.name,
      nameOriginalScript: t.author.nameOriginalScript,
      slug: t.author.slug,
    },
    language: {
      code: t.language.code,
    },
  }));

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Deltoi
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Collaborative, open-source interlinear translations of pre-1900 texts.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The goal of this project is to allow translators and scholars to
          comment on, collaborate on, edit, criticise, check, and endorse
          translations of important texts that are not yet available in the
          English language. The initial translations on this website are made
          using artificial intelligence; this project aims to build upon that
          foundation to produce proper and accessible translations.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button asChild>
            <Link href="/texts">Browse Texts</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/register">Register to Contribute</Link>
          </Button>
        </div>
      </div>

      {/* Main content: sidebar + featured texts */}
      <div className="mx-auto flex max-w-5xl gap-8">
        {/* Sidebar */}
        <aside className="hidden w-48 shrink-0 md:block">
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            Explore By Language
          </h2>
          <ul className="space-y-2">
            {LANGUAGE_LINKS.map((lang) => (
              <li key={lang.code}>
                <Link
                  href={`/texts?lang=${lang.code}`}
                  className="text-sm text-foreground transition-colors hover:text-primary"
                >
                  {lang.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Featured texts */}
        <section className="min-w-0 flex-1">
          <h2 className="mb-4 text-2xl font-semibold">Featured Texts</h2>
          <FeaturedTexts texts={featuredTexts} />
        </section>
      </div>
    </div>
  );
}
