"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

interface TextSummary {
  title: string;
  titleOriginalScript: string | null;
  slug: string;
  totalChapters: number;
}

interface AuthorSummary {
  name: string;
  nameOriginalScript: string | null;
  slug: string;
  era: string | null;
  texts: TextSummary[];
}

interface LanguageGroup {
  code: string;
  name: string;
  displayName: string;
  authors: AuthorSummary[];
}

interface CategoryBrowserProps {
  languages: LanguageGroup[];
  defaultTab?: string;
}

export function CategoryBrowser({ languages, defaultTab: defaultTabProp }: CategoryBrowserProps) {
  if (languages.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No texts available yet.
      </p>
    );
  }

  const validTab = defaultTabProp && languages.some((l) => l.code === defaultTabProp);
  const defaultTab = validTab ? defaultTabProp : languages[0].code;

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="mb-4">
        {languages.map((lang) => (
          <TabsTrigger key={lang.code} value={lang.code}>
            <span className="mr-1.5">{lang.displayName}</span>
            <span className="text-xs text-muted-foreground">({lang.name})</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {languages.map((lang) => (
        <TabsContent key={lang.code} value={lang.code}>
          <div className="space-y-6">
            {lang.authors.map((author) => (
              <div key={author.slug}>
                <h3 className="mb-2 text-lg font-semibold">
                  {author.name}
                  {author.nameOriginalScript && (
                    <span className="ml-2 text-base font-normal text-muted-foreground">
                      {author.nameOriginalScript}
                    </span>
                  )}
                  {author.era && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({author.era})
                    </span>
                  )}
                </h3>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {author.texts.map((text) => (
                    <Link
                      key={text.slug}
                      href={`/${lang.code}/${author.slug}/${text.slug}`}
                    >
                      <Card className="p-4 transition-colors hover:bg-muted/50">
                        <p className="font-medium">{text.title}</p>
                        {text.titleOriginalScript && (
                          <p className="text-sm text-muted-foreground">
                            {text.titleOriginalScript}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {text.totalChapters} chapters
                        </p>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {lang.authors.length === 0 && (
              <p className="text-muted-foreground">
                No texts in this language yet.
              </p>
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
