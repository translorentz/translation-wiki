"use client";

import { type ReactNode, useEffect, useSyncExternalStore } from "react";
import { LocaleContext, type Locale } from "@/i18n";

function readLocaleFromPath(): Locale {
  if (typeof window === "undefined") return "en";
  const path = window.location.pathname;
  if (path === "/cn" || path.startsWith("/cn/")) return "cn";
  if (path === "/es" || path.startsWith("/es/")) return "es";
  if (path === "/hi" || path.startsWith("/hi/")) return "hi";
  return "en";
}

function localeToHtmlLang(locale: Locale): string {
  if (locale === "cn") return "zh-Hans";
  if (locale === "es") return "es";
  if (locale === "hi") return "hi";
  return "en";
}

// Locale changes only on full-page navigation — LanguageSwitcher uses
// window.location.href which triggers a full reload.
function subscribe(): () => void {
  return () => {};
}

function getServerSnapshot(): Locale {
  return "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore<Locale>(
    subscribe,
    readLocaleFromPath,
    getServerSnapshot,
  );

  useEffect(() => {
    const langCode = localeToHtmlLang(locale);
    if (document.documentElement.lang !== langCode) {
      document.documentElement.lang = langCode;
    }
  }, [locale]);

  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}
