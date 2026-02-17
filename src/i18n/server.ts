import "server-only";

import { cookies } from "next/headers";
import { type Locale, LOCALE_COOKIE, getTranslator } from "./index";

/**
 * Read the UI locale from cookies on the server side.
 * Falls back to "en" if no cookie is set.
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  if (raw === "zh") return "zh";
  return "en";
}

/**
 * Get a translator function for use in server components.
 */
export async function getServerTranslation() {
  const locale = await getLocale();
  const t = getTranslator(locale);
  return { t, locale };
}
