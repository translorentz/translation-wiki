"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchLink,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { SessionProvider } from "next-auth/react";
import { useState, useSyncExternalStore } from "react";
import superjson from "superjson";
import type { AppRouter } from "@/server/trpc/router";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

// NextAuth v5 JWT session cookie names (default + HTTPS __Secure- prefix).
// If the auth config ever sets a custom cookie name, update this check.
function hasSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.cookie.includes("authjs.session-token") ||
    document.cookie.includes("__Secure-authjs.session-token")
  );
}

/**
 * Session provider that skips the /api/auth/session fetch for anonymous
 * visitors. The default SessionProvider fires an uncacheable serverless
 * function call on EVERY page mount for EVERY visitor — on an invite-only
 * site (max 100 users) that means virtually all traffic, including bots
 * executing JS, was paying a per-view function invocation just to learn
 * "no session".
 *
 * Passing an explicit `session` prop makes SessionProvider skip its initial
 * fetch, so: no session cookie → session={null}, refetch disabled → zero
 * network. When the cookie IS present (detected in an effect, since cookies
 * are unreadable during SSR/first paint), we switch to the fetching provider
 * so the session is validated server-side as before. Signed-in users see the
 * signed-out nav for one paint before the swap — acceptable for 100 users.
 */
// Cookie changes only across full navigations (login redirect, signOut
// reload), so a mount-time read is sufficient — no subscription needed.
function subscribeNoop(): () => void {
  return () => {};
}

function LazySessionProvider({ children }: { children: React.ReactNode }) {
  const maybeAuthed = useSyncExternalStore(
    subscribeNoop,
    hasSessionCookie,
    () => false, // server snapshot: cookies unreadable during SSR
  );

  if (maybeAuthed) {
    return <SessionProvider>{children}</SessionProvider>;
  }
  return (
    <SessionProvider session={null} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30 * 1000 },
        },
      })
  );

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <LazySessionProvider>
      <QueryClientProvider client={queryClient}>
        <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
          {children}
        </TRPCProvider>
      </QueryClientProvider>
    </LazySessionProvider>
  );
}
