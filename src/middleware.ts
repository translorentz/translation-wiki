import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";
import { NextResponse, type NextResponse as NextResponseType } from "next/server";

const { auth } = NextAuth(authConfig);

// Paths that are safe to cache at the Vercel edge.
// Read-only chapter/text/browse pages benefit hugely; auth and edit flows must
// never be cached.
function isCacheablePath(p: string): boolean {
  if (p.startsWith("/api/")) return false;
  if (p.startsWith("/admin")) return false;
  if (p === "/profile" || p.startsWith("/profile/")) return false;
  if (p === "/login" || p.startsWith("/login/")) return false;
  if (p === "/register" || p.startsWith("/register/")) return false;
  if (p === "/contribute") return false;
  if (p === "/search") return false; // query-string variability
  if (p.includes("/edit")) return false; // /edit, /edit-source
  if (p.includes("/history")) return false;
  if (p.includes("/discussion")) return false;
  return true; // /, /texts, /about, /[lang]/[author]/[text], /[lang]/[author]/[text]/[chapter]
}

// Edge cache for 5 min, serve stale for 24h while revalidating in background.
// No browser cache (users get fresh on hard-refresh).
const CACHE_HEADER = "public, s-maxage=300, stale-while-revalidate=86400";

function applyCacheHeader(response: NextResponseType, effectivePath: string, isLoggedIn: boolean) {
  if (isLoggedIn) return; // never cache personalized auth responses
  if (!isCacheablePath(effectivePath)) return;
  response.headers.set("Cache-Control", CACHE_HEADER);
}

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // --- Locale routing ---
  // /cn/... is always the Chinese UI locale prefix.
  // /zh/... is always a Chinese source language route (never locale).
  // /hi/... was the Hindi UI locale prefix; Hindi is delinked — redirect to English equivalent.
  if (pathname.startsWith("/hi/") || pathname === "/hi") {
    const englishPath = pathname.replace(/^\/hi/, "") || "/";
    return NextResponse.redirect(new URL(englishPath + req.nextUrl.search, req.nextUrl.origin));
  }
  const isCn = pathname.startsWith("/cn/") || pathname === "/cn";
  const isEs = pathname.startsWith("/es/") || pathname === "/es";
  const isLocalePrefix = isCn || isEs;
  const effectivePath = isCn
    ? (pathname.replace(/^\/cn/, "") || "/")
    : isEs
    ? (pathname.replace(/^\/es/, "") || "/")
    : pathname;
  const localePrefix = isCn ? "/cn" : isEs ? "/es" : "";

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

  // --- Rewrite locale-prefixed paths to unprefixed paths + set cookie ---
  if (isLocalePrefix) {
    const localeCode = isCn ? "cn" : "es";
    const url = new URL(effectivePath + req.nextUrl.search, req.nextUrl.origin);
    const response = NextResponse.rewrite(url);
    response.cookies.set("NEXT_LOCALE", localeCode, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
    });
    response.headers.set("x-locale-path", effectivePath);
    applyCacheHeader(response, effectivePath, isLoggedIn);
    return response;
  }

  // --- Non-prefixed paths: reset stale locale cookie to en ---
  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  const response = NextResponse.next();
  if (cookieLocale === "cn" || cookieLocale === "hi" || cookieLocale === "es") {
    response.cookies.set("NEXT_LOCALE", "en", {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
    });
  }
  response.headers.set("x-locale-path", pathname);
  applyCacheHeader(response, pathname, isLoggedIn);
  return response;
});

export const config = {
  matcher: [
    // Match all paths except API auth, static assets, and images
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
