"use client";

import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLocale, LOCALES, LOCALE_COOKIE } from "@/i18n";

export function LanguageSwitcher() {
  const locale = useLocale();

  function switchLocale(newLocale: string) {
    const currentPath = window.location.pathname;
    const search = window.location.search;
    // Strip existing /zh prefix to get the base path
    const basePath = currentPath.replace(/^\/zh/, "") || "/";
    // Add /zh/ prefix for Chinese, bare path for English
    const newPath = newLocale === "zh" ? `/zh${basePath}` : basePath;
    // Full navigation so middleware runs and sets the correct cookie
    window.location.href = `${newPath}${search}`;
  }

  const currentLabel = LOCALES.find((l) => l.code === locale)?.label ?? "English";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Globe className="size-4" />
          <span className="hidden sm:inline text-sm">{currentLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => switchLocale(l.code)}
            className={locale === l.code ? "font-semibold" : ""}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
