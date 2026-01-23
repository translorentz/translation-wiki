"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ThreadList({ threads, basePath }: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No discussion threads yet. Be the first to start a conversation.
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
                    Pinned
                  </Badge>
                )}
                {thread.isResolved && (
                  <Badge variant="outline" className="text-xs">
                    Resolved
                  </Badge>
                )}
                <h3 className="truncate font-medium">{thread.title}</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {thread.author.username} &middot; {formatDate(thread.createdAt)}
              </p>
            </div>
            <div className="shrink-0 text-sm text-muted-foreground">
              {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
