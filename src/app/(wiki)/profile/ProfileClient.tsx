"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export function ProfileClient() {
  const trpc = useTRPC();
  const profileQuery = useQuery(trpc.users.getMyProfile.queryOptions());

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  const changePassword = useMutation(
    trpc.users.changePassword.mutationOptions({
      onSuccess: () => {
        setPasswordMsg("Password changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      },
    })
  );

  const deleteAccount = useMutation(
    trpc.users.deleteMyAccount.mutationOptions({
      onSuccess: () => {
        signOut({ callbackUrl: "/" });
      },
    })
  );

  if (profileQuery.isLoading) {
    return <p className="text-muted-foreground">Loading profile...</p>;
  }

  const profile = profileQuery.data;
  if (!profile) {
    return <p className="text-destructive">Profile not found.</p>;
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg("");
    if (newPassword !== confirmPassword) {
      setPasswordMsg("New passwords do not match.");
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  }

  function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    deleteAccount.mutate({ confirmUsername: deleteConfirm });
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Account Info */}
      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-semibold">Account Information</h2>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <span className="text-muted-foreground">Username</span>
          <span>{profile.username}</span>
          <span className="text-muted-foreground">Email</span>
          <span>{profile.email}</span>
          <span className="text-muted-foreground">Role</span>
          <span className="capitalize">{profile.role}</span>
          <span className="text-muted-foreground">Joined</span>
          <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
          <span className="text-muted-foreground">Sign-in methods</span>
          <span>
            {profile.hasPassword && "Password"}
            {profile.hasPassword && profile.hasGoogle && ", "}
            {profile.hasGoogle && "Google"}
          </span>
        </div>
      </Card>

      {/* Change Password — only for users with a password */}
      {profile.hasPassword && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {passwordMsg && (
              <p className={`text-sm ${changePassword.isSuccess ? "text-green-600" : "text-destructive"}`}>
                {passwordMsg}
              </p>
            )}
            {changePassword.error && (
              <p className="text-sm text-destructive">{changePassword.error.message}</p>
            )}
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </Card>
      )}

      {/* Delete Account */}
      <Card className="border-destructive/50 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-destructive">Delete Account</h2>
        <p className="text-sm text-muted-foreground">
          This action is permanent. Your contributions (translations, comments) will be preserved
          but your account and personal data will be permanently deleted.
        </p>
        {!showDelete ? (
          <Button
            variant="outline"
            className="text-destructive border-destructive/50"
            onClick={() => setShowDelete(true)}
          >
            Delete my account
          </Button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-3">
            <div>
              <Label htmlFor="deleteConfirm">
                Type your username <strong>{profile.username}</strong> to confirm
              </Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                required
                placeholder={profile.username}
              />
            </div>
            {deleteAccount.error && (
              <p className="text-sm text-destructive">{deleteAccount.error.message}</p>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="destructive"
                disabled={deleteAccount.isPending || deleteConfirm !== profile.username}
              >
                {deleteAccount.isPending ? "Deleting..." : "Permanently delete my account"}
              </Button>
              <Button variant="ghost" onClick={() => { setShowDelete(false); setDeleteConfirm(""); }}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
