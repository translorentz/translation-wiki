"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Paragraph {
  index: number;
  text: string | null;
}

interface SourceEditorProps {
  chapterId: number;
  sourceContent: { paragraphs: Paragraph[] };
  sourceLanguage: string;
  returnPath: string;
}

export function SourceEditor({
  chapterId,
  sourceContent,
  sourceLanguage,
  returnPath,
}: SourceEditorProps) {
  const router = useRouter();
  const trpc = useTRPC();

  // Initialize paragraph texts from source content
  const [paragraphs, setParagraphs] = useState<(string | null)[]>(() =>
    sourceContent.paragraphs.map((p) => p.text)
  );

  const [editSummary, setEditSummary] = useState("");

  const updateSource = useMutation(
    trpc.chapters.updateSource.mutationOptions({
      onSuccess: () => {
        router.push(returnPath);
        router.refresh();
      },
    })
  );

  function handleParagraphChange(index: number, value: string) {
    setParagraphs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleDeleteParagraph(index: number) {
    setParagraphs((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }

  function handleRestoreParagraph(index: number) {
    setParagraphs((prev) => {
      const next = [...prev];
      // Restore to original or empty string
      next[index] = sourceContent.paragraphs[index]?.text ?? "";
      return next;
    });
  }

  function handleSave() {
    const content = {
      paragraphs: sourceContent.paragraphs.map((sp, i) => ({
        index: sp.index,
        text: paragraphs[i],
      })),
    };

    updateSource.mutate({
      chapterId,
      content,
      editSummary: editSummary || undefined,
    });
  }

  // Check if anything has changed
  const hasChanges = paragraphs.some(
    (p, i) => p !== sourceContent.paragraphs[i]?.text
  );

  // Auto-resize textarea to fit content
  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

  return (
    <div>
      {/* Editor grid */}
      <div className="space-y-4">
        {sourceContent.paragraphs.map((sourcePara, i) => {
          const isDeleted = paragraphs[i] === null;

          return (
            <div
              key={sourcePara.index}
              className={cn(
                "rounded-md border p-3",
                isDeleted ? "border-destructive/50 bg-destructive/5" : "border-border"
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Paragraph {sourcePara.index}
                </span>
                {isDeleted ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestoreParagraph(i)}
                  >
                    Restore
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteParagraph(i)}
                  >
                    Delete
                  </Button>
                )}
              </div>

              {isDeleted ? (
                <p className="italic text-muted-foreground">
                  This paragraph has been removed
                </p>
              ) : (
                <textarea
                  ref={(el) => autoResize(el)}
                  value={paragraphs[i] ?? ""}
                  onChange={(e) => {
                    handleParagraphChange(i, e.target.value);
                    autoResize(e.target);
                  }}
                  className={cn(
                    "min-h-[4rem] w-full resize-none overflow-hidden rounded-md border border-input bg-background px-3 py-2 leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    sourceLanguage === "zh" && "font-serif text-lg leading-loose"
                  )}
                  lang={sourceLanguage}
                  placeholder="Enter source text..."
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Edit summary and save */}
      <div className="mt-6 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <Label htmlFor="edit-summary" className="mb-1.5 block text-sm">
            Edit summary (optional)
          </Label>
          <Input
            id="edit-summary"
            value={editSummary}
            onChange={(e) => setEditSummary(e.target.value)}
            placeholder="Describe your changes..."
            className="max-w-md"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSource.isPending}
          >
            {updateSource.isPending ? "Saving..." : "Save Source"}
          </Button>
        </div>
      </div>

      {updateSource.isError && (
        <p className="mt-2 text-sm text-destructive">
          Failed to save: {updateSource.error.message}
        </p>
      )}
    </div>
  );
}
