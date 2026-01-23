"use client";

import { cn } from "@/lib/utils";

interface VersionEntry {
  id: number;
  versionNumber: number;
  editSummary: string | null;
  createdAt: Date;
  author: { id: number; username: string };
}

interface EditHistoryProps {
  versions: VersionEntry[];
  selectedVersionId?: number;
  onSelectVersion: (versionId: number) => void;
}

export function EditHistory({
  versions,
  selectedVersionId,
  onSelectVersion,
}: EditHistoryProps) {
  if (versions.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">No edit history.</p>
    );
  }

  return (
    <div className="space-y-1">
      {versions.map((version) => {
        const isSelected = version.id === selectedVersionId;
        const date = new Date(version.createdAt);

        return (
          <button
            key={version.id}
            onClick={() => onSelectVersion(version.id)}
            className={cn(
              "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
              isSelected
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">v{version.versionNumber}</span>
              <span className="text-xs text-muted-foreground">
                {date.toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {version.author.username}
            </p>
            {version.editSummary && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {version.editSummary}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
