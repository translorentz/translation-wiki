"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function AdminUsersClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const usersQuery = useQuery(trpc.users.listAll.queryOptions());

  const setRole = useMutation(
    trpc.users.setRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.users.listAll.queryKey() });
      },
    })
  );

  if (usersQuery.isLoading) {
    return <p className="text-muted-foreground">Loading users...</p>;
  }

  if (!usersQuery.data || usersQuery.data.length === 0) {
    return <p className="text-muted-foreground">No users found.</p>;
  }

  return (
    <div className="space-y-2">
      {usersQuery.data.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between rounded border border-border p-3"
        >
          <div>
            <span className="font-medium">{user.username}</span>
            <span className="ml-2 text-sm text-muted-foreground">
              {user.email}
            </span>
          </div>
          <select
            value={user.role}
            onChange={(e) =>
              setRole.mutate({
                userId: user.id,
                role: e.target.value as "reader" | "editor" | "admin",
              })
            }
            className="rounded border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="reader">reader</option>
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </select>
        </div>
      ))}
      {setRole.error && (
        <p className="text-sm text-destructive">
          {setRole.error.message}
        </p>
      )}
    </div>
  );
}
