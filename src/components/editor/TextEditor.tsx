"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Paragraph {
  index: number;
  text: string;
}

interface TextEditorProps {
  chapterId: number;
  sourceContent: { paragraphs: Paragraph[] };
  existingTranslation: { paragraphs: Paragraph[] } | null;
  sourceLanguage: string;
  returnPath: string;
}

export function TextEditor({
  chapterId,
  sourceContent,
  existingTranslation,
  sourceLanguage,
  returnPath,
}: TextEditorProps) {
  const router = useRouter();
  const trpc = useTRPC();

  // Initialize paragraph texts from existing translation or empty strings
  const [paragraphs, setParagraphs] = useState<string[]>(() =>
    sourceContent.paragraphs.map((sp) => {
      const existing = existingTranslation?.paragraphs.find(
        (p) => p.index === sp.index
      );
      return existing?.text ?? "";
    })
  );

  const [editSummary, setEditSummary] = useState("");

  const createVersion = useMutation(
    trpc.translations.createVersion.mutationOptions({
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

  function handleSave() {
    const content = {
      paragraphs: paragraphs.map((text, i) => ({ index: i, text })),
    };

    createVersion.mutate({
      chapterId,
      content,
      editSummary: editSummary || undefined,
    });
  }

  const hasContent = paragraphs.some((p) => p.trim().length > 0);

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
        {sourceContent.paragraphs.map((sourcePara, i) => (
          <div
            key={sourcePara.index}
            className="grid grid-cols-1 gap-4 rounded-md border border-border p-3 md:grid-cols-2"
          >
            {/* Source (read-only) */}
            <div
              className={cn(
                "leading-relaxed text-muted-foreground",
                sourceLanguage === "zh" && "font-serif text-lg leading-loose"
              )}
              lang={sourceLanguage}
            >
              <span className="mb-1 block text-xs text-muted-foreground/60">
                {i + 1}
              </span>
              {sourcePara.text}
            </div>

            {/* Editable translation */}
            <div className="flex">
              <textarea
                ref={(el) => autoResize(el)}
                value={paragraphs[i]}
                onChange={(e) => {
                  handleParagraphChange(i, e.target.value);
                  autoResize(e.target);
                }}
                className="min-h-[4rem] w-full resize-none overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Enter translation..."
              />
            </div>
          </div>
        ))}
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
            disabled={!hasContent || createVersion.isPending}
          >
            {createVersion.isPending ? "Saving..." : "Save Translation"}
          </Button>
        </div>
      </div>

      {createVersion.isError && (
        <p className="mt-2 text-sm text-destructive">
          Failed to save: {createVersion.error.message}
        </p>
      )}
    </div>
  );
}
