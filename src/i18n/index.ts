"use client";

import { createContext, useContext } from "react";
import en, { type TranslationKey } from "./locales/en";
import zh from "./locales/zh";

export type { TranslationKey };

export type Locale = "en" | "zh";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "zh", label: "\u4E2D\u6587" },
];

export const LOCALE_COOKIE = "NEXT_LOCALE";

const dictionaries = { en, zh } as const;

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
