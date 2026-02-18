"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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

interface ThreadListProps {
  threads: Thread[];
  basePath: string;
}

export function ThreadList({ threads, basePath }: ThreadListProps) {
  const { t, locale } = useTranslation();

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (threads.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        {t("discussion.noThreads")}
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {threads.map((thread) => (
        <Link
          key={thread.id}
          href={`${basePath}/${thread.id}`}
          className="block px-4 py-3 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {thread.isPinned && (
                  <Badge variant="secondary" className="text-xs">
                    {t("discussion.pinned")}
                  </Badge>
                )}
                {thread.isResolved && (
                  <Badge variant="outline" className="text-xs">
                    {t("discussion.resolved")}
                  </Badge>
                )}
                <h3 className="truncate font-medium">{thread.title}</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {thread.author.username} &middot; {formatDate(thread.createdAt)}
              </p>
            </div>
            <div className="shrink-0 text-sm text-muted-foreground">
              {thread.replyCount} {thread.replyCount === 1 ? t("discussion.reply") : t("discussion.replies")}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
