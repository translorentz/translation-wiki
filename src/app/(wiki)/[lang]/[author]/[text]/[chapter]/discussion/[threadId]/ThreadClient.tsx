"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { ThreadView } from "@/components/discussion/ThreadView";

interface Post {
  id: number;
  content: string;
  author: { id: number; username: string };
  createdAt: Date;
}

interface Thread {
  id: number;
  title: string;
  author: { id: number; username: string };
  isPinned: boolean;
  isResolved: boolean;
  chapterId: number;
  createdAt: Date;
  posts: Post[];
}

interface ThreadClientProps {
  thread: Thread;
  currentUserId?: number;
  currentUserRole?: string;
}

export function ThreadClient({
  thread: initialThread,
  currentUserId,
  currentUserRole,
}: ThreadClientProps) {
  const [thread, setThread] = useState(initialThread);
  const router = useRouter();
  const trpc = useTRPC();

  const createPost = useMutation(
    trpc.discussions.createPost.mutationOptions({
      onSuccess: () => {
        router.refresh();
      },
    })
  );

  const toggleResolved = useMutation(
    trpc.discussions.toggleResolved.mutationOptions({
      onSuccess: (data) => {
        setThread((t) => ({ ...t, isResolved: data.isResolved }));
      },
    })
  );

  const togglePinned = useMutation(
    trpc.discussions.togglePinned.mutationOptions({
      onSuccess: (data) => {
        setThread((t) => ({ ...t, isPinned: data.isPinned }));
      },
    })
  );

  const handleReply = async (content: string) => {
    await createPost.mutateAsync({ threadId: thread.id, content });
  };

  const handleToggleResolved = async () => {
    await toggleResolved.mutateAsync({ threadId: thread.id });
  };

  const handleTogglePinned = async () => {
    await togglePinned.mutateAsync({ threadId: thread.id });
  };

  return (
    <ThreadView
      thread={thread}
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
      onReply={handleReply}
      onToggleResolved={handleToggleResolved}
      onTogglePinned={currentUserRole === "admin" ? handleTogglePinned : undefined}
    />
  );
}
