import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { AdminUsersClient } from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">User Management</h1>
      <AdminUsersClient />
    </main>
  );
}
