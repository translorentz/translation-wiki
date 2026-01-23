"use client";

import { diffWords } from "diff";
import { cn } from "@/lib/utils";

interface Paragraph {
  index: number;
  text: string;
}

interface DiffViewerProps {
  oldContent: { paragraphs: Paragraph[] } | null;
  newContent: { paragraphs: Paragraph[] };
}

export function DiffViewer({ oldContent, newContent }: DiffViewerProps) {
  const oldMap = new Map<number, string>();
  if (oldContent) {
    for (const p of oldContent.paragraphs) {
      oldMap.set(p.index, p.text);
    }
  }

  return (
    <div className="space-y-3">
      {newContent.paragraphs.map((paragraph) => {
        const oldText = oldMap.get(paragraph.index) ?? "";
        const newText = paragraph.text;

        if (oldText === newText) {
          return (
            <div key={paragraph.index} className="rounded-md border border-border/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{newText}</span>
            </div>
          );
        }

        const changes = diffWords(oldText, newText);

        return (
          <div key={paragraph.index} className="rounded-md border border-border px-3 py-2 text-sm">
            {changes.map((change, i) => (
              <span
                key={i}
                className={cn(
                  change.added && "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-300",
                  change.removed && "bg-red-100 text-red-900 line-through dark:bg-red-900/30 dark:text-red-300"
                )}
              >
                {change.value}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
