import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { TRPCReactProvider } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deltoi",
  description:
    "Open-source translations of classical and medieval texts in interlinear format",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <TRPCReactProvider>
          {/* Header */}
          <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-lg font-semibold">
                  Deltoi
                </Link>
                <nav className="hidden gap-4 sm:flex">
                  <Link
                    href="/texts"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Browse
                  </Link>
                  <Link
                    href="/search"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Search
                  </Link>
                </nav>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </div>
          </header>

          {/* Main content */}
          <div className="mx-auto max-w-7xl">{children}</div>

          {/* Footer */}
          <footer className="mt-16 border-t border-border">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              <p className="text-center text-sm text-muted-foreground">
                Deltoi — Open-source translations of classical and
                medieval texts.
              </p>
            </div>
          </footer>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
