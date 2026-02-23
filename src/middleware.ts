import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

/**
 * Known first path segments that indicate /zh/ is a UI locale prefix,
 * NOT the source language code "zh" in /zh/{author}/{text}.
 *
 * Chinese source texts live at /zh/{author}/{text} where "zh" is the
 * source language. These must NOT be intercepted by locale routing.
 * The middleware distinguishes them by checking the segment after /zh/:
 * - Static routes (texts, search, login, etc.) → locale prefix
 * - Source language codes (grc, la, ta, etc.) → locale prefix
 * - Anything else (author slugs like li-zhi) → Chinese source text
 */
const ZH_LOCALE_SEGMENTS = new Set([
  // Static app routes
  "texts", "search", "login", "register", "profile", "admin",
  // Source language codes used in /[lang]/[author]/[text]
  "grc", "la", "ta", "it", "pl", "cs", "sr", "ru", "fr", "hy",
  "ms", "te", "ja", "fa", "el", "de", "xcl", "chg", "ko", "am",
  "gez", "tr", "vi", "zh",
]);

/** Is this /zh/... path a UI locale prefix (true) or a Chinese source text URL (false)? */
function isZhLocalePrefix(pathname: string): boolean {
  if (pathname === "/zh") return true;
  if (!pathname.startsWith("/zh/")) return false;
  const firstSegment = pathname.slice(4).split("/")[0];
  return ZH_LOCALE_SEGMENTS.has(firstSegment);
}

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // --- Locale routing ---
  // Only treat /zh/... as locale prefix if the first segment is a known
  // route or language code. Otherwise it's a Chinese source text URL.
  const isZh = isZhLocalePrefix(pathname);
  const effectivePath = isZh ? (pathname.replace(/^\/zh/, "") || "/") : pathname;
  const localePrefix = isZh ? "/zh" : "";

  // Protect edit routes — require authentication
  if (effectivePath.includes("/edit") && !isLoggedIn) {
    const loginUrl = new URL(`${localePrefix}/login`, req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect admin routes — require authentication
  if (effectivePath.startsWith("/admin") && !isLoggedIn) {
    const loginUrl = new URL(`${localePrefix}/login`, req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // --- Rewrite /zh/ paths to unprefixed paths + set zh cookie ---
  if (isZh) {
    const url = new URL(effectivePath + req.nextUrl.search, req.nextUrl.origin);
    const response = NextResponse.rewrite(url);
    response.cookies.set("NEXT_LOCALE", "zh", {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
    });
    response.headers.set("x-locale-path", effectivePath);
    return response;
  }

  // --- Non-zh paths: reset stale zh cookie to en ---
  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  const response = NextResponse.next();
  if (cookieLocale === "zh") {
    response.cookies.set("NEXT_LOCALE", "en", {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
    });
  }
  response.headers.set("x-locale-path", pathname);
  return response;
});

export const config = {
  matcher: [
    // Match all paths except API auth, static assets, and images
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
