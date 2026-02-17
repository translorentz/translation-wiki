"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

export function UserNav() {
  const { data: session, status } = useSession();
  const { t } = useTranslation();

  if (status === "loading") {
    return <div className="h-8 w-16" />;
  }

  if (!session?.user) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link href="/login">{t("nav.signIn")}</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/profile"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {session.user.name}
      </Link>
      {session.user.role === "admin" && (
        <Link
          href="/admin/users"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("nav.admin")}
        </Link>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        {t("nav.signOut")}
      </Button>
    </div>
  );
}
