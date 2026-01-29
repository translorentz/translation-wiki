import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { ProfileClient } from "./ProfileClient";

export const metadata = {
  title: "Profile — Deltoi",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/profile");
  }
  return <ProfileClient />;
}
