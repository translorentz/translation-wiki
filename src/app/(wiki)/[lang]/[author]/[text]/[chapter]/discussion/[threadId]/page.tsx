import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/server/auth";
import { getServerTRPC } from "@/trpc/server";
import { ThreadClient } from "./ThreadClient";

interface ThreadPageProps {
  params: Promise<{
    lang: string;
    author: string;
    text: string;
    chapter: string;
    threadId: string;
  }>;
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const {
    lang,
    author,
    text: textSlug,
    chapter: chapterSlug,
    threadId: threadIdStr,
  } = await params;

  const session = await auth();
  const trpc = await getServerTRPC();

  const threadId = parseInt(threadIdStr);
  if (isNaN(threadId)) notFound();

  const thread = await trpc.discussions.getThread({ threadId });
  if (!thread) notFound();

  const basePath = `/${lang}/${author}/${textSlug}/${chapterSlug}`;

  return (
    <main className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex gap-2 text-sm text-muted-foreground">
          <Link href={basePath} className="hover:text-foreground">
            Chapter
          </Link>
          <span>/</span>
          <Link
            href={`${basePath}/discussion`}
            className="hover:text-foreground"
          >
            Discussion
          </Link>
        </div>
      </div>

      <ThreadClient
        thread={thread}
        currentUserId={session?.user?.id ? Number(session.user.id) : undefined}
        currentUserRole={session?.user?.role}
      />
    </main>
  );
}
