"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

interface ChapterEditAffordancesProps {
  /** Localised base path, e.g. /grc/author/text or /cn/grc/author/text. */
  basePath: string;
  chapterSlug: string;
}

/**
 * Edit / edit-source buttons that only render for authenticated editors and
 * admins. Splitting this out of the server-rendered chapter page lets the
 * page itself stay static — the `auth()` cookies() lookup happens only on the
 * client, after hydration, so the page shell can be ISR-cached.
 */
export function ChapterEditAffordances({
  basePath,
  chapterSlug,
}: ChapterEditAffordancesProps) {
  const { t } = useTranslation();
  const { data: session, status } = useSession();

  if (status === "loading") return null;
  const role = session?.user?.role;
  if (role !== "editor" && role !== "admin") return null;

  return (
    <>
      <Button variant="outline" size="sm" asChild>
        <Link href={`${basePath}/${chapterSlug}/edit`}>
          {t("chapter.editTranslation")}
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href={`${basePath}/${chapterSlug}/edit-source`}>
          {t("chapter.editSource")}
        </Link>
      </Button>
    </>
  );
}
