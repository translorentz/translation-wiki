"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { ThreadList } from "@/components/discussion/ThreadList";
import { CreateThreadForm } from "@/components/discussion/CreateThreadForm";
import { useTranslation } from "@/i18n";

interface Thread {
  id: number;
  title: string;
  author: { id: number; username: string };
  isPinned: boolean;
  isResolved: boolean;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DiscussionClientProps {
  chapterId: number;
  threads: Thread[];
  basePath: string;
  isLoggedIn: boolean;
}

export function DiscussionClient({
  chapterId,
  threads,
  basePath,
  isLoggedIn,
}: DiscussionClientProps) {
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();
  const trpc = useTRPC();
  const { t } = useTranslation();

  const createThread = useMutation(
    trpc.discussions.createThread.mutationOptions({
      onSuccess: (data) => {
        setShowForm(false);
        router.push(`${basePath}/${data.id}`);
      },
    })
  );

  const handleCreate = async (title: string, content: string) => {
    await createThread.mutateAsync({ chapterId, title, content });
  };

  return (
    <div>
      {/* New thread button / form */}
      {isLoggedIn && !showForm && (
        <div className="mb-4">
          <Button onClick={() => setShowForm(true)}>{t("page.newThread")}</Button>
        </div>
      )}

      {showForm && (
        <div className="mb-6">
          <CreateThreadForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {!isLoggedIn && (
        <p className="mb-4 text-sm text-muted-foreground">
          {t("page.signInToDiscuss")}
        </p>
      )}

      {/* Thread list */}
      <div className="rounded-lg border">
        <ThreadList threads={threads} basePath={basePath} />
      </div>
    </div>
  );
}
