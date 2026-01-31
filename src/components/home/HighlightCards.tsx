import Link from "next/link";
import { Card } from "@/components/ui/card";

const HIGHLIGHTS = [
  {
    slug: "xiaolin-guangji",
    authorSlug: "youzhi-daoren",
    langCode: "zh",
    originalTitle: "笑林廣記",
    englishTitle: "Expanded Records of the Forest of Laughter",
    teaser: "Bawdy jokes and social satire from late imperial China.",
    meta: "Chinese, 1787",
  },
  {
    slug: "cento-anni",
    authorSlug: "giuseppe-rovani",
    langCode: "it",
    originalTitle: "Cent'anni",
    englishTitle: "A Hundred Years (Cento Anni)",
    teaser: "A panoramic novel of Milan across a century of upheaval.",
    meta: "Italian, 1858",
  },
  {
    slug: "epitome-historiarum",
    authorSlug: "john-zonaras",
    langCode: "grc",
    originalTitle: "Ἐπιτομὴ ἱστοριῶν",
    englishTitle: "Epitome of Histories",
    teaser: "World history from Creation to 1118, by a Byzantine monk.",
    meta: "Byzantine Greek, c. 1150",
  },
  {
    slug: "dongpo-zhilin",
    authorSlug: "su-shi",
    langCode: "zh",
    originalTitle: "東坡志林",
    englishTitle: "Dongpo's Records from the Bamboo Grove",
    teaser: "Anecdotes, dreams, and meditations by Su Shi in exile.",
    meta: "Chinese, c. 1097",
  },
];

export function HighlightCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {HIGHLIGHTS.map((h) => (
        <Link
          key={h.slug}
          href={`/${h.langCode}/${h.authorSlug}/${h.slug}`}
        >
          <Card className="px-4 py-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-lg leading-tight">{h.originalTitle}</p>
            <p className="mt-1 text-sm font-medium">{h.englishTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{h.teaser}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{h.meta}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
