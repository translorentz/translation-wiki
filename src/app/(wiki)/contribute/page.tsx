import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { getLocale } from "@/i18n/server";
import { localePath } from "@/lib/utils";
import { ContributeClient } from "./ContributeClient";

export default async function ContributePage() {
  const session = await auth();
  if (!session?.user) {
    const locale = await getLocale();
    redirect(localePath("/login?callbackUrl=/contribute", locale));
  }

  if (session.user.role !== "editor" && session.user.role !== "admin") {
    const locale = await getLocale();
    redirect(localePath("/", locale));
  }

  return <ContributeClient />;
}
