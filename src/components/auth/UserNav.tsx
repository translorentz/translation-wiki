"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { localePath } from "@/lib/utils";

export function UserNav() {
  const { data: session, status } = useSession();
  const { t, locale } = useTranslation();

  if (status === "loading") {
    return <div className="h-8 w-16" />;
  }

  if (!session?.user) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link href={localePath("/login", locale)}>{t("nav.signIn")}</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={localePath("/profile", locale)}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {session.user.name}
      </Link>
      {session.user.role === "admin" && (
        <Link
          href={localePath("/admin/users", locale)}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("nav.admin")}
        </Link>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut({ callbackUrl: localePath("/", locale) })}
      >
        {t("nav.signOut")}
      </Button>
    </div>
  );
}
