/**
 * Shared i18n utilities — usable from both server and client modules.
 * This file must NOT have a "use client" or "use server" directive.
 */

import en, { type TranslationKey, type Translations } from "./locales/en";
import zh from "./locales/zh";

export type { TranslationKey, Translations };

export type Locale = "en" | "zh";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "zh", label: "\u4E2D\u6587" },
];

export const LOCALE_COOKIE = "NEXT_LOCALE";

const dictionaries = { en, zh } as const;

export { dictionaries };

/**
 * Create a translator function for a given locale.
 * Pure function — safe to call from server or client.
 */
export function getTranslator(locale: Locale) {
  const dict = dictionaries[locale] ?? en;

  function t(key: TranslationKey): string {
    return dict[key] ?? en[key] ?? key;
  }

  return t;
}

/**
 * Get a localized genre display name.
 */
export function getGenreDisplayName(
  genre: string,
  t: (key: TranslationKey) => string,
): string {
  const key = `genre.${genre}` as TranslationKey;
  const result = t(key);
  return result === key ? genre : result;
}
