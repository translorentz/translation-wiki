"use client";

import { useState } from "react";
import { EditHistory } from "./EditHistory";
import { DiffViewer } from "./DiffViewer";
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

interface HistoryViewerProps {
  versions: VersionData[];
}

export function HistoryViewer({ versions }: HistoryViewerProps) {
  const { t, locale } = useTranslation();
  const [selectedId, setSelectedId] = useState<number | undefined>(
    versions[0]?.id
  );

  const selectedVersion = versions.find((v) => v.id === selectedId);
  const previousVersion = selectedVersion?.previousVersionId
    ? versions.find((v) => v.id === selectedVersion.previousVersionId)
    : undefined;

  return (
    <div className="grid gap-6 md:grid-cols-[250px_1fr]">
      {/* Version list */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
          {t("history.versions")}
        </h3>
        <EditHistory
          versions={versions}
          selectedVersionId={selectedId}
          onSelectVersion={setSelectedId}
        />
      </div>

      {/* Diff display */}
      <div>
        {selectedVersion ? (
          <div>
            <div className="mb-4">
              <h3 className="font-medium">
                {t("history.version")} {selectedVersion.versionNumber}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedVersion.author.username} &middot;{" "}
                {new Date(selectedVersion.createdAt).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}
              </p>
              {selectedVersion.editSummary && (
                <p className="mt-1 text-sm italic text-muted-foreground">
                  {selectedVersion.editSummary}
                </p>
              )}
            </div>

            <DiffViewer
              oldContent={
                previousVersion
                  ? (previousVersion.content as { paragraphs: Paragraph[] } | null)
                  : null
              }
              newContent={
                (selectedVersion.content as { paragraphs: Paragraph[] }) ?? {
                  paragraphs: [],
                }
              }
            />
          </div>
        ) : (
          <p className="text-muted-foreground">{t("history.selectVersion")}</p>
        )}
      </div>
    </div>
  );
}
