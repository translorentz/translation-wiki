import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { getLocale } from "@/i18n/server";
import { localePath } from "@/lib/utils";
import { ProfileClient } from "./ProfileClient";

export const metadata = {
  title: "Profile — Deltoi",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    const locale = await getLocale();
    redirect(localePath("/login?callbackUrl=/profile", locale));
  }
  return <ProfileClient />;
}
