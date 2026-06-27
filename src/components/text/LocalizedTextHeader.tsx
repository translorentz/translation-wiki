"use client";

import { useTranslation } from "@/i18n";
import { formatAuthorName, formatTextTitle, localizedYearDisplay } from "@/lib/utils";

// All fields the text-page header needs to render in any locale. The SSR
// fetch (cachedTextBySlug) already returns every locale variant on the row,
// so we just pass the whole shape to the client and let useLocale() pick
// the right one — no DB refetch needed.
interface TextHeaderData {
  title: string;
  titleOriginalScript: string | null;
  titleZh: string | null;
  titleEs: string | null;
  description: string | null;
  descriptionZh: string | null;
  descriptionEs: string | null;
  descriptionHi: string | null;
  compositionYearDisplay: string | null;
  compositionYearDisplayEs: string | null;
  author: {
    name: string;
    nameOriginalScript: string | null;
    nameZh: string | null;
    nameEs: string | null;
    nameHi: string | null;
  };
}

interface Props {
  text: TextHeaderData;
}

/**
 * Renders the text-page header (title, secondary title, author, year,
 * description) with locale awareness. SSR renders the English baseline;
 * after client hydration this component re-reads locale from the
 * LocaleProvider context and re-renders with the correct fields. No
 * network call — all locale data already came down with the page.
 */
export function LocalizedTextHeader({ text }: Props) {
  const { t, locale } = useTranslation();
  const titleDisplay = formatTextTitle(text, locale);
  const authorDisplay = formatAuthorName(text.author, locale);

  const description =
    (locale === "cn" && text.descriptionZh) ||
    (locale === "hi" && text.descriptionHi) ||
    (locale === "es" && text.descriptionEs) ||
    text.description;

  return (
    <>
      <h1 className="text-3xl font-bold">{titleDisplay.primary}</h1>
      {titleDisplay.secondary && (
        <p className="mt-1 text-xl text-muted-foreground">
          {titleDisplay.secondary}
        </p>
      )}
      <p className="mt-2 text-muted-foreground">
        {locale !== "cn" && <>{t("common.by")} </>}
        <span className="font-medium text-foreground">
          {authorDisplay.primary}
        </span>
        {authorDisplay.secondary && (
          <span className="ml-1">({authorDisplay.secondary})</span>
        )}
        {(() => {
          const y = localizedYearDisplay(text, locale);
          return y && <span className="ml-2">&middot; {y}</span>;
        })()}
      </p>
      {description && (
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </>
  );
}
