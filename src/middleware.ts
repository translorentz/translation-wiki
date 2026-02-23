import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // --- Locale routing ---
  const isZh = pathname.startsWith("/zh/") || pathname === "/zh";
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
