"use client";

import { createContext, useContext } from "react";
import en, { type TranslationKey } from "./locales/en";
import cn from "./locales/cn";
import hi from "./locales/hi";

export type { TranslationKey };

export type Locale = "en" | "cn" | "hi";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "cn", label: "\u4E2D\u6587" },
  { code: "hi", label: "\u0939\u093F\u0928\u094D\u0926\u0940" },
];

export const LOCALE_COOKIE = "NEXT_LOCALE";

const dictionaries = { en, cn, hi } as const;

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
