import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import { TRPCReactProvider } from "@/trpc/client";
import { LocaleProvider } from "./LocaleProvider";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { SiteFooter } from "@/components/navigation/SiteFooter";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { buildWebsiteJsonLd, jsonLdScript } from "@/lib/jsonld";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deltoi.com"),
  title: {
    default: "Deltoi — Interlinear Translations of Classical Texts",
    template: "%s — Deltoi",
  },
  description:
    "A collaborative wiki of interlinear translations of pre-contemporary texts in over thirty source languages, side-by-side with English, Chinese, and Spanish.",
  applicationName: "Deltoi",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Deltoi",
    title: "Deltoi — Interlinear Translations of Classical Texts",
    description:
      "A collaborative wiki of interlinear translations of pre-contemporary texts.",
    url: "https://deltoi.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deltoi — Interlinear Translations of Classical Texts",
    description:
      "A collaborative wiki of interlinear translations of pre-contemporary texts.",
  },
};

// Static WebSite JSON-LD. Per-page JSON-LD (Book, Chapter, BreadcrumbList)
// emitted in each page component carries the locale-specific URL prefix.
const WEBSITE_JSON_LD = buildWebsiteJsonLd("en");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(WEBSITE_JSON_LD) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} min-h-screen antialiased`}
      >
        <TRPCReactProvider>
          <LocaleProvider>
            <SiteHeader />
            <div className="mx-auto max-w-7xl">{children}</div>
            <SiteFooter />
          </LocaleProvider>
        </TRPCReactProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
