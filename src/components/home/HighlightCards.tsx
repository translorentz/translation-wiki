import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getTranslator, type Locale } from "@/i18n/shared";

type Highlight = {
  slug: string;
  authorSlug: string;
  langCode: string;
  originalTitle: string;
  secondaryTitle: string;
  teaserKey:
    | "highlights.zhuziyulei"
    | "highlights.centanni"
    | "highlights.romaike"
    | "highlights.dongpozhilin"
    | "highlights.paluba"
    | "highlights.shahnameh";
};

const HIGHLIGHTS_EN: Highlight[] = [
  {
    slug: "zhuziyulei",
    authorSlug: "zhu-xi",
    langCode: "zh",
    originalTitle: "\u6731\u5B50\u8A9E\u985E",
    secondaryTitle: "Classified Conversations of Master Zhu",
    teaserKey: "highlights.zhuziyulei",
  },
  {
    slug: "cento-anni",
    authorSlug: "giuseppe-rovani",
    langCode: "it",
    originalTitle: "Cent\u2019anni",
    secondaryTitle: "A Hundred Years (Cento Anni)",
    teaserKey: "highlights.centanni",
  },
  {
    slug: "romaike-historia",
    authorSlug: "nicephorus-gregoras",
    langCode: "grc",
    originalTitle: "\u03A1\u03C9\u03BC\u03B1\u03CA\u03BA\u1F74 \u1F39\u03C3\u03C4\u03BF\u03C1\u03AF\u03B1",
    secondaryTitle: "Roman History",
    teaserKey: "highlights.romaike",
  },
  {
    slug: "dongpo-zhilin",
    authorSlug: "su-shi",
    langCode: "zh",
    originalTitle: "\u6771\u5761\u5FD7\u6797",
    secondaryTitle: "Dongpo's Records from the Bamboo Grove",
    teaserKey: "highlights.dongpozhilin",
  },
];

const HIGHLIGHTS_ZH: Highlight[] = [
  {
    slug: "paluba",
    authorSlug: "karol-irzykowski",
    langCode: "pl",
    originalTitle: "Pa\u0142uba",
    secondaryTitle: "\u5973\u5DEB",
    teaserKey: "highlights.paluba",
  },
  {
    slug: "shahnameh",
    authorSlug: "ferdowsi",
    langCode: "fa",
    originalTitle: "\u0634\u0627\u0647\u0646\u0627\u0645\u0647",
    secondaryTitle: "\u5217\u738B\u7EAA",
    teaserKey: "highlights.shahnameh",
  },
];

export function HighlightCards({ locale }: { locale: Locale }) {
  const t = getTranslator(locale);
  const highlights = locale === "zh" ? HIGHLIGHTS_ZH : HIGHLIGHTS_EN;

  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("home.highlights")}
      </h2>
      <div className={`grid gap-2 sm:gap-3 ${highlights.length <= 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
        {highlights.map((h) => (
          <Link
            key={h.slug}
            href={`/${h.langCode}/${h.authorSlug}/${h.slug}`}
          >
            <Card className="h-full gap-0 px-2 py-1.5 transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-3 sm:py-2">
              <p className="text-sm leading-tight sm:text-base">{h.originalTitle}</p>
              <p className="mt-0.5 text-[11px] font-medium sm:text-xs">{h.secondaryTitle}</p>
              <p className="mt-0.5 hidden text-[11px] leading-snug text-muted-foreground sm:block">{t(h.teaserKey)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
