"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistoryViewer } from "./HistoryViewer";

interface Paragraph {
  index: number;
  text: string;
}

interface VersionData {
  id: number;
  versionNumber: number;
  content: unknown;
  editSummary: string | null;
  createdAt: Date;
  previousVersionId: number | null;
  author: { id: number; username: string };
}

interface HistoryTabsProps {
  translationVersions: VersionData[];
  sourceVersions: VersionData[];
}

export function HistoryTabs({
  translationVersions,
  sourceVersions,
}: HistoryTabsProps) {
  return (
    <Tabs defaultValue="translation" className="w-full">
      <TabsList>
        <TabsTrigger value="translation">
          Translation History ({translationVersions.length})
        </TabsTrigger>
        <TabsTrigger value="source">
          Source History ({sourceVersions.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="translation" className="mt-4">
        {translationVersions.length > 0 ? (
          <HistoryViewer versions={translationVersions} />
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            No translation history for this chapter yet.
          </p>
        )}
      </TabsContent>

      <TabsContent value="source" className="mt-4">
        {sourceVersions.length > 0 ? (
          <HistoryViewer versions={sourceVersions} />
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            No source text edit history for this chapter yet.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
