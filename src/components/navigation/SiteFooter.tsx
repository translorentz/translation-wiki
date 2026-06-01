"use client";

import { useTranslation } from "@/i18n";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-muted-foreground">
          {t("footer.description")}
        </p>
        <p className="mt-2 text-center text-xs text-gray-400">
          {t("footer.trial")}{" "}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-300"
          >
            {t("footer.license")}
          </a>
          {t("footer.licenseSuffix")}
        </p>
      </div>
    </footer>
  );
}
