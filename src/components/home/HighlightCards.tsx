"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { localePath } from "@/lib/utils";

type Highlight = {
  slug: string;
  authorSlug: string;
  langCode: string;
  originalTitle: string;
  secondaryTitle: string;
  teaserKey:
    | "highlights.zhuziyulei"
    | "highlights.daad"
    | "highlights.urshalim"
    | "highlights.romaike"
    | "highlights.capponi"
    | "highlights.paluba"
    | "highlights.shahnameh";
};

const HIGHLIGHTS_EN: Highlight[] = [
  {
    slug: "zhuziyulei",
    authorSlug: "zhu-xi",
    langCode: "zh",
    originalTitle: "朱子語類",
    secondaryTitle: "Classified Conversations of Master Zhu",
    teaserKey: "highlights.zhuziyulei",
  },
  {
    slug: "urshalim-al-jadida",
    authorSlug: "farah-antun",
    langCode: "ar",
    originalTitle: "أورشليم الجديدة",
    secondaryTitle: "The New Jerusalem",
    teaserKey: "highlights.urshalim",
  },
  {
    slug: "romaike-historia",
    authorSlug: "nicephorus-gregoras",
    langCode: "grc",
    originalTitle: "Ρωμαϊκὴ Ἱστορία",
    secondaryTitle: "Roman History",
    teaserKey: "highlights.romaike",
  },
  {
    slug: "storia-repubblica-firenze",
    authorSlug: "gino-capponi",
    langCode: "it",
    originalTitle: "Storia della Repubblica di Firenze",
    secondaryTitle: "History of the Republic of Florence",
    teaserKey: "highlights.capponi",
  },
];

const HIGHLIGHTS_ZH: Highlight[] = [
  {
    slug: "paluba",
    authorSlug: "karol-irzykowski",
    langCode: "pl",
    originalTitle: "Pałuba",
    secondaryTitle: "女巫",
    teaserKey: "highlights.paluba",
  },
  {
    slug: "urshalim-al-jadida",
    authorSlug: "farah-antun",
    langCode: "ar",
    originalTitle: "أورشليم الجديدة",
    secondaryTitle: "新耶路撒冷",
    teaserKey: "highlights.urshalim",
  },
  {
    slug: "romaike-historia",
    authorSlug: "nicephorus-gregoras",
    langCode: "grc",
    originalTitle: "Ρωμαϊκὴ Ἱστορία",
    secondaryTitle: "罗马史",
    teaserKey: "highlights.romaike",
  },
  {
    slug: "shahnameh",
    authorSlug: "ferdowsi",
    langCode: "fa",
    originalTitle: "شاهنامه",
    secondaryTitle: "列王纪",
    teaserKey: "highlights.shahnameh",
  },
];

const HIGHLIGHTS_HI: Highlight[] = [
  {
    slug: "zhuziyulei",
    authorSlug: "zhu-xi",
    langCode: "zh",
    originalTitle: "朱子語類",
    secondaryTitle: "Classified Conversations of Master Zhu",
    teaserKey: "highlights.zhuziyulei",
  },
  {
    slug: "daad",
    authorSlug: "chekri-ganem",
    langCode: "fr",
    originalTitle: "Da’ad",
    secondaryTitle: "Da’ad",
    teaserKey: "highlights.daad",
  },
  {
    slug: "romaike-historia",
    authorSlug: "nicephorus-gregoras",
    langCode: "grc",
    originalTitle: "Ρωμαϊκὴ Ἱστορία",
    secondaryTitle: "Roman History",
    teaserKey: "highlights.romaike",
  },
  {
    slug: "shahnameh",
    authorSlug: "ferdowsi",
    langCode: "fa",
    originalTitle: "شاهنامه",
    secondaryTitle: "Shahnameh",
    teaserKey: "highlights.shahnameh",
  },
];

const HIGHLIGHTS_ES: Highlight[] = [
  {
    slug: "zhuziyulei",
    authorSlug: "zhu-xi",
    langCode: "zh",
    originalTitle: "朱子語類",
    secondaryTitle: "Conversaciones Clasificadas del Maestro Zhu",
    teaserKey: "highlights.zhuziyulei",
  },
  {
    slug: "urshalim-al-jadida",
    authorSlug: "farah-antun",
    langCode: "ar",
    originalTitle: "أورشليم الجديدة",
    secondaryTitle: "La Nueva Jerusalén",
    teaserKey: "highlights.urshalim",
  },
  {
    slug: "romaike-historia",
    authorSlug: "nicephorus-gregoras",
    langCode: "grc",
    originalTitle: "Ρωμαϊκὴ Ἱστορία",
    secondaryTitle: "Historia Romana",
    teaserKey: "highlights.romaike",
  },
  {
    slug: "storia-repubblica-firenze",
    authorSlug: "gino-capponi",
    langCode: "it",
    originalTitle: "Storia della Repubblica di Firenze",
    secondaryTitle: "Historia de la República de Florencia",
    teaserKey: "highlights.capponi",
  },
];

// Now a client component — reads locale from LocaleProvider context so the
// server can render a locale-agnostic shell (initially HIGHLIGHTS_EN), and
// the client swaps in the right carousel post-hydration.
export function HighlightCards() {
  const { t, locale } = useTranslation();
  const highlights =
    locale === "cn"
      ? HIGHLIGHTS_ZH
      : locale === "hi"
      ? HIGHLIGHTS_HI
      : locale === "es"
      ? HIGHLIGHTS_ES
      : HIGHLIGHTS_EN;

  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("home.highlights")}
      </h2>
      <div className={`grid gap-2 sm:gap-3 ${highlights.length <= 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
        {highlights.map((h) => (
          <Link
            key={h.slug}
            href={localePath(`/${h.langCode}/${h.authorSlug}/${h.slug}`, locale)}
            prefetch={false}
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
