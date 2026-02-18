"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistoryViewer } from "./HistoryViewer";
import { useTranslation } from "@/i18n";

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
  const { t } = useTranslation();

  return (
    <Tabs defaultValue="translation" className="w-full">
      <TabsList>
        <TabsTrigger value="translation">
          {t("history.translationHistory").replace("{count}", String(translationVersions.length))}
        </TabsTrigger>
        <TabsTrigger value="source">
          {t("history.sourceHistory").replace("{count}", String(sourceVersions.length))}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="translation" className="mt-4">
        {translationVersions.length > 0 ? (
          <HistoryViewer versions={translationVersions} />
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            {t("history.noTranslationHistory")}
          </p>
        )}
      </TabsContent>

      <TabsContent value="source" className="mt-4">
        {sourceVersions.length > 0 ? (
          <HistoryViewer versions={sourceVersions} />
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            {t("history.noSourceHistory")}
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
