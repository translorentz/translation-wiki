"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PostReplyForm } from "./PostReplyForm";
import { useTranslation } from "@/i18n";

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

interface ThreadViewProps {
  thread: Thread;
  currentUserId?: number;
  currentUserRole?: string;
  onReply: (content: string) => Promise<void>;
  onToggleResolved: () => Promise<void>;
  onTogglePinned?: () => Promise<void>;
}

export function ThreadView({
  thread,
  currentUserId,
  currentUserRole,
  onReply,
  onToggleResolved,
  onTogglePinned,
}: ThreadViewProps) {
  const [replying, setReplying] = useState(false);
  const { t, locale } = useTranslation();

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const canResolve =
    currentUserId === thread.author.id || currentUserRole === "admin";
  const canPin = currentUserRole === "admin";

  const handleReply = async (content: string) => {
    await onReply(content);
    setReplying(false);
  };

  return (
    <div>
      {/* Thread header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {thread.isPinned && <Badge variant="secondary">{t("discussion.pinned")}</Badge>}
          {thread.isResolved && <Badge variant="outline">{t("discussion.resolved")}</Badge>}
        </div>
        <h1 className="mt-2 text-2xl font-bold">{thread.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("discussion.startedBy")} {thread.author.username} &middot;{" "}
          {formatDate(thread.createdAt)}
        </p>
      </div>

      {/* Thread actions */}
      {currentUserId && (
        <div className="mb-6 flex gap-2">
          {canResolve && (
            <Button variant="outline" size="sm" onClick={onToggleResolved}>
              {thread.isResolved ? t("discussion.reopen") : t("discussion.markResolved")}
            </Button>
          )}
          {canPin && onTogglePinned && (
            <Button variant="outline" size="sm" onClick={onTogglePinned}>
              {thread.isPinned ? t("discussion.unpin") : t("discussion.pin")}
            </Button>
          )}
        </div>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {thread.posts.map((post, index) => (
          <div
            key={post.id}
            className={`rounded-lg border p-4 ${index === 0 ? "border-primary/20 bg-primary/5" : ""}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{post.author.username}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(post.createdAt)}
              </span>
            </div>
            <div className="whitespace-pre-wrap text-sm">{post.content}</div>
          </div>
        ))}
      </div>

      {/* Reply section */}
      {currentUserId ? (
        <div className="mt-6">
          {replying ? (
            <PostReplyForm
              onSubmit={handleReply}
              onCancel={() => setReplying(false)}
            />
          ) : (
            <Button variant="outline" onClick={() => setReplying(true)}>
              {t("discussion.replyButton")}
            </Button>
          )}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          {t("discussion.signInToReply")}
        </p>
      )}
    </div>
  );
}
