import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Protect edit routes — require authentication
  if (pathname.includes("/edit") && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match edit pages and protected API routes
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
