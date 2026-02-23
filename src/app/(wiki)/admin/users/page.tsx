import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { getLocale } from "@/i18n/server";
import { localePath } from "@/lib/utils";
import { AdminUsersClient } from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    const locale = await getLocale();
    redirect(localePath("/", locale));
  }

  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">User Management</h1>
      <AdminUsersClient />
    </main>
  );
}
