"use client";

import { createContext, useContext } from "react";
import en, { type TranslationKey } from "./locales/en";
import zh from "./locales/zh";

export type Locale = "en" | "zh";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "zh", label: "\u4E2D\u6587" },
];

const dictionaries = { en, zh } as const;

// ---- React Context ----

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

// ---- Server-side helpers (called from server components) ----

export function getTranslator(locale: Locale) {
  const dict = dictionaries[locale] ?? en;

  function t(key: TranslationKey): string {
    return dict[key] ?? en[key] ?? key;
  }

  return t;
}

export function getGenreDisplayName(
  genre: string,
  t: (key: TranslationKey) => string,
): string {
  const key = `genre.${genre}` as TranslationKey;
  const result = t(key);
  // If the key wasn't found (returns the key itself), fall back to raw genre string
  return result === key ? genre : result;
}

// ---- Cookie name ----
export const LOCALE_COOKIE = "NEXT_LOCALE";
