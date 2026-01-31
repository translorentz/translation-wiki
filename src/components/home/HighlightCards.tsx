import Link from "next/link";
import { Card } from "@/components/ui/card";

const HIGHLIGHTS = [
  {
    slug: "zhu-zi-yu-lei",
    authorSlug: "zhu-xi",
    langCode: "zh",
    originalTitle: "朱子語類",
    englishTitle: "Classified Conversations of Master Zhu",
    teaser: "Neo-Confucian philosophy recorded by Zhu Xi's students.",
  },
  {
    slug: "cento-anni",
    authorSlug: "giuseppe-rovani",
    langCode: "it",
    originalTitle: "Cent'anni",
    englishTitle: "A Hundred Years (Cento Anni)",
    teaser: "A panoramic novel of Milan across a century of upheaval.",
  },
  {
    slug: "epitome-historiarum",
    authorSlug: "john-zonaras",
    langCode: "grc",
    originalTitle: "Ἐπιτομὴ ἱστοριῶν",
    englishTitle: "Epitome of Histories",
    teaser: "World history from Creation to 1118, by a Byzantine monk.",
  },
  {
    slug: "dongpo-zhilin",
    authorSlug: "su-shi",
    langCode: "zh",
    originalTitle: "東坡志林",
    englishTitle: "Dongpo's Records from the Bamboo Grove",
    teaser: "Anecdotes, dreams, and meditations by Su Shi in exile.",
  },
];

export function HighlightCards() {
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Highlights</h2>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {HIGHLIGHTS.map((h) => (
          <Link
            key={h.slug}
            href={`/${h.langCode}/${h.authorSlug}/${h.slug}`}
          >
            <Card className="h-full gap-0 px-2 py-1.5 transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-3 sm:py-2">
              <p className="text-sm leading-tight sm:text-base">{h.originalTitle}</p>
              <p className="mt-0.5 text-[11px] font-medium sm:text-xs">{h.englishTitle}</p>
              <p className="mt-0.5 hidden text-[11px] leading-snug text-muted-foreground sm:block">{h.teaser}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
