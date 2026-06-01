"use client";

import Link from "next/link";
import { UserNav } from "@/components/auth/UserNav";
import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import { useTranslation } from "@/i18n";
import { localePath } from "@/lib/utils";

export function SiteHeader() {
  const { t, locale } = useTranslation();
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href={localePath("/", locale)}
            className="font-[family-name:var(--font-lora)] text-lg font-semibold"
          >
            Deltoi
          </Link>
          <nav className="hidden gap-4 sm:flex">
            <Link
              href={localePath("/texts", locale)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("nav.browse")}
            </Link>
            <Link
              href={localePath("/search", locale)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("nav.search")}
            </Link>
            <Link
              href={localePath("/about", locale)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("nav.about")}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
