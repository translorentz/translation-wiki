import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // --- Locale routing ---
  // /cn/... is always the Chinese UI locale prefix.
  // /zh/... is always a Chinese source language route (never locale).
  const isCn = pathname.startsWith("/cn/") || pathname === "/cn";
  const effectivePath = isCn ? (pathname.replace(/^\/cn/, "") || "/") : pathname;
  const localePrefix = isCn ? "/cn" : "";

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

  // --- Rewrite /cn/ paths to unprefixed paths + set cn cookie ---
  if (isCn) {
    const url = new URL(effectivePath + req.nextUrl.search, req.nextUrl.origin);
    const response = NextResponse.rewrite(url);
    response.cookies.set("NEXT_LOCALE", "cn", {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
    });
    response.headers.set("x-locale-path", effectivePath);
    return response;
  }

  // --- Non-cn paths: reset stale cn cookie to en ---
  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  const response = NextResponse.next();
  if (cookieLocale === "cn") {
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
