import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURED_TEXTS = [
  {
    title: "Zhu Zi Yu Lei",
    originalTitle: "朱子語類",
    author: "Zhu Xi (朱熹)",
    description:
      "Classified Conversations of Master Zhu — 140 chapters of philosophical discussions from Song Dynasty China.",
    href: "/zh/zhu-xi/zhuzi-yulei",
    language: "Classical Chinese",
  },
  {
    title: "De Ceremoniis",
    originalTitle: "Περὶ τῆς Βασιλείου Τάξεως",
    author: "Constantine VII Porphyrogennetos",
    description:
      "On the Ceremonies of the Byzantine Court — a detailed account of imperial protocol from the 10th century.",
    href: "/grc/constantine-vii/de-ceremoniis",
    language: "Ancient Greek",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Translation Wiki
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Open-source translations of classical and medieval texts, displayed in
          interlinear format with source and translation side by side.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button asChild>
            <Link href="/texts">Browse Texts</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/register">Register to Contribute</Link>
          </Button>
        </div>
      </div>

      {/* Featured Texts */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold">Featured Texts</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURED_TEXTS.map((text) => (
            <Link key={text.href} href={text.href}>
              <Card className="h-full p-6 transition-colors hover:bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  {text.language}
                </p>
                <h3 className="mt-1 text-xl font-semibold">{text.title}</h3>
                <p className="text-base text-muted-foreground">
                  {text.originalTitle}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {text.author}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {text.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
