import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";
import { NextResponse, type NextRequest } from "next/server";
import { EDGE_CACHEABLE_QUERIES } from "@/lib/edge-cacheable-queries";

const { auth } = NextAuth(authConfig);

// Whitelisted public tRPC GETs bypass the NextAuth wrapper entirely. The
// auth() wrapper stamps __Host-authjs.csrf-token / __Secure-authjs.callback-url
// set-cookie headers on responses that lack them, and any set-cookie makes a
// response uncacheable at Cloudflare — defeating the tRPC edge caching. The
// route handler sets its own cache-control/cdn-cache-control headers and
// skips the session read for these same batches, so nothing here is needed.
// POSTs (mutations) and non-whitelisted procedures stay on the auth-aware
// path so CSRF init and session checks work as before.
// URL shapes: /api/trpc/proc.name (single) or /api/trpc/a,b,c?batch=1.
function isPublicTrpcGet(req: NextRequest): boolean {
  if (req.method !== "GET") return false;
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/trpc/")) return false;
  const procSegment = decodeURIComponent(pathname.slice("/api/trpc/".length));
  if (!procSegment) return false;
  const paths = procSegment.split(",");
  return paths.every((p) => EDGE_CACHEABLE_QUERIES.has(p));
}

// Origin lockdown — reject any request that did NOT come through Cloudflare.
// Cloudflare's Transform Rule (Modify Request Header → Set static) injects
// x-vercel-origin-secret on every proxied request. Anyone hitting Vercel directly
// (via the .vercel.app preview URL or a discovered 216.150.x.x anycast IP
// with Host: deltoi.com) lacks the header and gets a 403. CF_PASS_TOKEN
// should ONLY be set in Vercel's PRODUCTION env (not Preview, not Development)
// so local dev (`pnpm dev`) and preview deployments stay reachable without it.
function checkCloudflareGate(req: NextRequest): NextResponse | null {
  const expected = process.env.CF_PASS_TOKEN;
  if (!expected) return null;
  const presented = req.headers.get("x-vercel-origin-secret");
  if (presented !== expected) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return null;
}

// Paths that are safe to cache at the Vercel edge.
// Read-only chapter/text/browse pages benefit hugely; auth and edit flows must
// never be cached. These paths also bypass the NextAuth middleware wrapper
// entirely so NextAuth doesn't stamp __Host-authjs.csrf-token /
// __Secure-authjs.callback-url Set-Cookie headers on every response (which
// would otherwise force `cache-control: private, no-store` and defeat caching).
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

// Edge cache for 1h (matching the pages' ISR revalidate), serve stale for 24h
// while revalidating in background. No browser cache (users get fresh on
// hard-refresh). Was 300s, which made Cloudflare re-fetch each page from
// Vercel 12x more often than the underlying ISR content could change.
const CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400";
const COOKIE_OPTS = { path: "/", maxAge: 365 * 24 * 60 * 60, sameSite: "lax" } as const;

// Public-path handler. Does NOT invoke NextAuth, so no CSRF/callback-url
// cookies get stamped on the response. Sets the locale cookie only when its
// value actually changes — an unconditional Set-Cookie also defeats caching.
function handlePublicPath(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const isCn = pathname.startsWith("/cn/") || pathname === "/cn";
  const isEs = pathname.startsWith("/es/") || pathname === "/es";
  const effectivePath = isCn
    ? (pathname.replace(/^\/cn/, "") || "/")
    : isEs
    ? (pathname.replace(/^\/es/, "") || "/")
    : pathname;
  const currentLocale = req.cookies.get("NEXT_LOCALE")?.value;

  let response: NextResponse;
  if (isCn || isEs) {
    const url = new URL(effectivePath + req.nextUrl.search, req.nextUrl.origin);
    response = NextResponse.rewrite(url);
    const localeCode = isCn ? "cn" : "es";
    // Only set cookie when it would actually change. First visit to /cn or /es
    // (no cookie yet) sets it; subsequent visits with the right cookie don't.
    if (currentLocale !== localeCode) {
      response.cookies.set("NEXT_LOCALE", localeCode, COOKIE_OPTS);
    }
  } else {
    response = NextResponse.next();
    // Non-prefixed paths default to English. getLocale() treats absent cookie
    // as "en", so we DON'T set NEXT_LOCALE=en when the cookie is absent —
    // doing so would attach Set-Cookie to every anonymous first visit and
    // defeat caching. Only clear stale non-en cookies (user switched languages).
    if (currentLocale === "cn" || currentLocale === "hi" || currentLocale === "es") {
      response.cookies.set("NEXT_LOCALE", "en", COOKIE_OPTS);
    }
  }

  response.headers.set("x-locale-path", effectivePath);
  response.headers.set("Cache-Control", CACHE_HEADER);
  return response;
}

const authProtectedHandler = auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

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
    if (req.cookies.get("NEXT_LOCALE")?.value !== localeCode) {
      response.cookies.set("NEXT_LOCALE", localeCode, COOKIE_OPTS);
    }
    response.headers.set("x-locale-path", effectivePath);
    return response;
  }

  // --- Non-prefixed paths: reset stale locale cookie to en ---
  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  const response = NextResponse.next();
  if (cookieLocale === "cn" || cookieLocale === "hi" || cookieLocale === "es") {
    response.cookies.set("NEXT_LOCALE", "en", COOKIE_OPTS);
  }
  response.headers.set("x-locale-path", pathname);
  return response;
});

export default function middleware(req: NextRequest) {
  // Origin lockdown — block requests that didn't traverse Cloudflare.
  // Runs before everything else so 403 responses are as cheap as possible.
  const gated = checkCloudflareGate(req);
  if (gated) return gated;

  // Public tRPC reads skip NextAuth so their responses stay cookie-free
  // and Cloudflare-cacheable. See isPublicTrpcGet above.
  if (isPublicTrpcGet(req)) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Hindi delink — handle before anything else
  if (pathname.startsWith("/hi/") || pathname === "/hi") {
    const englishPath = pathname.replace(/^\/hi/, "") || "/";
    return NextResponse.redirect(new URL(englishPath + req.nextUrl.search, req.nextUrl.origin));
  }

  // Determine effective path (strip locale prefix) for the cacheability check.
  const isCn = pathname.startsWith("/cn/") || pathname === "/cn";
  const isEs = pathname.startsWith("/es/") || pathname === "/es";
  const effectivePath = isCn
    ? (pathname.replace(/^\/cn/, "") || "/")
    : isEs
    ? (pathname.replace(/^\/es/, "") || "/")
    : pathname;

  // Cacheable read-only paths bypass auth() entirely so NextAuth doesn't
  // stamp CSRF/callback-url cookies (which force `private, no-store`).
  if (isCacheablePath(effectivePath)) {
    return handlePublicPath(req);
  }

  // Everything else (login, register, edit, admin, profile, search,
  // history, discussion, contribute, /api/*) goes through the auth-aware
  // handler so session checks and CSRF init still work.
  // The cast matches the NextAuth middleware signature.
  return (authProtectedHandler as unknown as (r: NextRequest) => Promise<NextResponse> | NextResponse)(req);
}

export const config = {
  matcher: [
    // Match all paths except API auth, static assets, images, and SEO files.
    // sitemap.xml + robots.txt + sitemap/N.xml are public crawler endpoints —
    // they must not be locale-redirected, auth-gated, or wrapped by the
    // layout (which would break content-type or inject HTML).
    "/((?!api/auth|_next/static|_next/image|favicon.ico|robots\\.txt|sitemap-index\\.xml|sitemap/).*)",
  ],
};
