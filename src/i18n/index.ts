"use client";

import { createContext, useContext } from "react";
import en, { type TranslationKey } from "./locales/en";
import cn from "./locales/cn";
import hi from "./locales/hi";
import es from "./locales/es";

export type { TranslationKey };

export type Locale = "en" | "cn" | "hi" | "es";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "cn", label: "\u4E2D\u6587" },
  { code: "es", label: "Espa\u00F1ol" },
];

export const LOCALE_COOKIE = "NEXT_LOCALE";

const dictionaries = { en, cn, hi, es } as const;

// ---- React Context (client-only) ----

export const LocaleContext = createContext<Locale>("en");

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useTranslation() {
  const locale = useLocale();
  const dict = dictionaries[locale];

  function t(key: TranslationKey): string {
    return dict[key] ?? en[key] ?? key;
  }

  return { t, locale };
}
