"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";

export function AdminUsersClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const usersQuery = useQuery(trpc.users.listAll.queryOptions());
  const tokensQuery = useQuery(trpc.users.listInviteTokens.queryOptions());

  const setRole = useMutation(
    trpc.users.setRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.users.listAll.queryKey() });
      },
    })
  );

  const deleteUser = useMutation(
    trpc.users.deleteUser.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.users.listAll.queryKey() });
        setConfirmDeleteId(null);
      },
    })
  );

  const createToken = useMutation(
    trpc.users.createInviteToken.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.users.listInviteTokens.queryKey() });
        setCopiedToken(data.token);
        navigator.clipboard.writeText(data.token);
      },
    })
  );

  const revokeToken = useMutation(
    trpc.users.revokeInviteToken.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.users.listInviteTokens.queryKey() });
      },
    })
  );

  if (usersQuery.isLoading) {
    return <p className="text-muted-foreground">Loading users...</p>;
  }

  const userCount = usersQuery.data?.length ?? 0;

  function getTokenStatus(token: { usedAt: Date | null; expiresAt: Date }) {
    if (token.usedAt) return "used";
    if (new Date(token.expiresAt) < new Date()) return "expired";
    return "active";
  }

  return (
    <div className="space-y-8">
      {/* User count */}
      <p className="text-sm text-muted-foreground">
        {userCount} / 100 users registered
      </p>

      {/* User list */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Users</h2>
        {!usersQuery.data || usersQuery.data.length === 0 ? (
          <p className="text-muted-foreground">No users found.</p>
        ) : (
          usersQuery.data.map((user) => (
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
              <div className="flex items-center gap-2">
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
                {confirmDeleteId === user.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteUser.mutate({ userId: user.id })}
                      disabled={deleteUser.isPending}
                    >
                      {deleteUser.isPending ? "Deleting..." : "Confirm"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDeleteId(user.id)}
                    className="text-destructive"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
        {setRole.error && (
          <p className="text-sm text-destructive">{setRole.error.message}</p>
        )}
        {deleteUser.error && (
          <p className="text-sm text-destructive">{deleteUser.error.message}</p>
        )}
      </div>

      {/* Invitation Tokens */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invitation Tokens</h2>
          <Button
            size="sm"
            onClick={() => createToken.mutate()}
            disabled={createToken.isPending}
          >
            {createToken.isPending ? "Generating..." : "Generate Token"}
          </Button>
        </div>

        {copiedToken && (
          <div className="rounded border border-green-600 bg-green-50 p-3 dark:bg-green-950">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Token copied to clipboard:
            </p>
            <code className="mt-1 block break-all text-xs">{copiedToken}</code>
            <button
              onClick={() => setCopiedToken(null)}
              className="mt-2 text-xs text-muted-foreground hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {createToken.error && (
          <p className="text-sm text-destructive">{createToken.error.message}</p>
        )}

        {tokensQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading tokens...</p>
        ) : !tokensQuery.data || tokensQuery.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tokens yet.</p>
        ) : (
          <div className="space-y-2">
            {tokensQuery.data.map((token) => {
              const status = getTokenStatus(token);
              return (
                <div
                  key={token.id}
                  className="flex items-center justify-between rounded border border-border p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <code className="text-xs">
                      {token.token}
                    </code>
                    <span
                      className={`ml-2 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                        status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : status === "used"
                            ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      }`}
                    >
                      {status}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      expires {new Date(token.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  {status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeToken.mutate({ tokenId: token.id })}
                      disabled={revokeToken.isPending}
                      className="ml-2 text-destructive"
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {revokeToken.error && (
          <p className="text-sm text-destructive">{revokeToken.error.message}</p>
        )}
      </div>
    </div>
  );
}
