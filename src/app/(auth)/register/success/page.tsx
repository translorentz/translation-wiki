"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/i18n";

export default function RegisterSuccessPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6 text-center">
        <h1 className="mb-2 text-2xl font-bold">{t("register.accountCreated")}</h1>
        <p className="mb-1 text-muted-foreground">
          {t("register.accountCreatedDesc")}
        </p>
        <p className="mb-6 text-sm text-muted-foreground">
          {t("register.loginPrompt")}
        </p>
        <Button asChild className="w-full">
          <Link href="/login">{t("register.logIn")}</Link>
        </Button>
      </Card>
    </div>
  );
}
