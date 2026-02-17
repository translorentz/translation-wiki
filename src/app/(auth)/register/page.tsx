"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { setInviteTokenCookie } from "./actions";
import { useTranslation } from "@/i18n";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trpc = useTRPC();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const errorParam = searchParams.get("error");

  const register = useMutation(
    trpc.users.register.mutationOptions({
      onSuccess: () => {
        router.push("/register/success");
      },
    })
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    register.mutate({ email, username, password, inviteToken });
  }

  async function handleGoogleSignIn() {
    if (!inviteToken) return;
    setGoogleLoading(true);
    await setInviteTokenCookie(inviteToken);
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <Card className="w-full max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">{t("register.title")}</h1>

      {errorParam === "invite_required" && (
        <p className="mb-4 text-sm text-destructive">
          {t("register.inviteRequired")}
        </p>
      )}
      {errorParam === "user_limit" && (
        <p className="mb-4 text-sm text-destructive">
          {t("register.userLimit")}
        </p>
      )}
      {errorParam === "registration_failed" && (
        <p className="mb-4 text-sm text-destructive">
          {t("register.failed")}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="inviteToken">{t("register.inviteToken")}</Label>
          <Input
            id="inviteToken"
            type="text"
            value={inviteToken}
            onChange={(e) => setInviteToken(e.target.value)}
            required
            placeholder={t("register.invitePlaceholder")}
          />
        </div>
        <div>
          <Label htmlFor="email">{t("register.email")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="username">{t("register.username")}</Label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
          />
        </div>
        <div>
          <Label htmlFor="password">{t("register.password")}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        {register.isError && (
          <p className="text-sm text-destructive">
            {register.error.message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={register.isPending}>
          {register.isPending ? t("register.creating") : t("register.create")}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{t("register.or")}</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={!inviteToken || googleLoading}
      >
        {googleLoading ? t("register.redirecting") : t("register.google")}
      </Button>
      {!inviteToken && (
        <p className="mt-1 text-xs text-muted-foreground">
          {t("register.googleHint")}
        </p>
      )}

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t("register.hasAccount")}{" "}
        <Link href="/login" className="text-primary hover:underline">
          {t("register.signIn")}
        </Link>
      </p>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
