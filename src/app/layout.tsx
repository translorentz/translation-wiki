import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { TRPCReactProvider } from "@/trpc/client";
import { UserNav } from "@/components/auth/UserNav";
import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import { LocaleProvider } from "./LocaleProvider";
import { getLocale } from "@/i18n/server";
import { getTranslator } from "@/i18n";
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
    "A collaborative wiki of interlinear translations of pre-contemporary texts.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const t = getTranslator(locale);

  return (
    <html lang={locale === "zh" ? "zh-Hans" : "en"}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <TRPCReactProvider>
          <LocaleProvider locale={locale}>
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
                      {t("nav.browse")}
                    </Link>
                    <Link
                      href="/search"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t("nav.search")}
                    </Link>
                  </nav>
                </div>
                <div className="flex items-center gap-2">
                  <LanguageSwitcher />
                  <UserNav />
                </div>
              </div>
            </header>

            {/* Main content */}
            <div className="mx-auto max-w-7xl">{children}</div>

            {/* Footer */}
            <footer className="mt-16 border-t border-border">
              <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <p className="text-center text-sm text-muted-foreground">
                  {t("footer.description")}
                </p>
                <p className="mt-2 text-center text-xs text-gray-400">
                  {t("footer.trial")}
                </p>
              </div>
            </footer>
          </LocaleProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
