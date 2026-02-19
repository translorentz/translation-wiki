import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getTranslator, type Locale } from "@/i18n/shared";

const HIGHLIGHTS = [
  {
    slug: "zhuziyulei",
    authorSlug: "zhu-xi",
    langCode: "zh",
    originalTitle: "\u672E\u5B50\u8A9E\u985E",
    englishTitle: "Classified Conversations of Master Zhu",
    teaserKey: "highlights.zhuziyulei" as const,
  },
  {
    slug: "cento-anni",
    authorSlug: "giuseppe-rovani",
    langCode: "it",
    originalTitle: "Cent\u2019anni",
    englishTitle: "A Hundred Years (Cento Anni)",
    teaserKey: "highlights.centanni" as const,
  },
  {
    slug: "romaike-historia",
    authorSlug: "nicephorus-gregoras",
    langCode: "grc",
    originalTitle: "\u03A1\u03C9\u03BC\u03B1\u03CA\u03BA\u1F74 \u1F39\u03C3\u03C4\u03BF\u03C1\u03AF\u03B1",
    englishTitle: "Roman History",
    teaserKey: "highlights.romaike" as const,
  },
  {
    slug: "dongpo-zhilin",
    authorSlug: "su-shi",
    langCode: "zh",
    originalTitle: "\u6771\u5761\u5FD7\u6797",
    englishTitle: "Dongpo's Records from the Bamboo Grove",
    teaserKey: "highlights.dongpozhilin" as const,
  },
];

export function HighlightCards({ locale }: { locale: Locale }) {
  const t = getTranslator(locale);

  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("home.highlights")}
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {HIGHLIGHTS.map((h) => (
          <Link
            key={h.slug}
            href={`/${h.langCode}/${h.authorSlug}/${h.slug}`}
          >
            <Card className="h-full gap-0 px-2 py-1.5 transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-3 sm:py-2">
              <p className="text-sm leading-tight sm:text-base">{h.originalTitle}</p>
              <p className="mt-0.5 text-[11px] font-medium sm:text-xs">{h.englishTitle}</p>
              <p className="mt-0.5 hidden text-[11px] leading-snug text-muted-foreground sm:block">{t(h.teaserKey)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
