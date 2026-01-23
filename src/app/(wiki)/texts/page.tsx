import { getServerTRPC } from "@/trpc/server";
import { CategoryBrowser } from "@/components/navigation/CategoryBrowser";

interface LanguageGroup {
  code: string;
  name: string;
  displayName: string;
  authors: {
    name: string;
    nameOriginalScript: string | null;
    slug: string;
    era: string | null;
    texts: {
      title: string;
      titleOriginalScript: string | null;
      slug: string;
      totalChapters: number;
    }[];
  }[];
}

export default async function BrowsePage() {
  const trpc = await getServerTRPC();
  const allTexts = await trpc.texts.list();

  // Group texts by language, then by author
  const languageMap = new Map<string, LanguageGroup>();

  for (const text of allTexts) {
    const langCode = text.language.code;

    if (!languageMap.has(langCode)) {
      languageMap.set(langCode, {
        code: langCode,
        name: text.language.name,
        displayName: text.language.displayName,
        authors: [],
      });
    }

    const langGroup = languageMap.get(langCode)!;
    let authorGroup = langGroup.authors.find(
      (a) => a.slug === text.author.slug
    );

    if (!authorGroup) {
      authorGroup = {
        name: text.author.name,
        nameOriginalScript: text.author.nameOriginalScript,
        slug: text.author.slug,
        era: text.author.era,
        texts: [],
      };
      langGroup.authors.push(authorGroup);
    }

    authorGroup.texts.push({
      title: text.title,
      titleOriginalScript: text.titleOriginalScript,
      slug: text.slug,
      totalChapters: text.totalChapters,
    });
  }

  const languages = Array.from(languageMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <main className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold">Browse Texts</h1>
      <CategoryBrowser languages={languages} />
    </main>
  );
}
