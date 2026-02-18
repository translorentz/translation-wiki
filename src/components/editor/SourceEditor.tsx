"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

interface Paragraph {
  index: number;
  text: string | null;
}

interface SourceEditorProps {
  chapterId: number;
  sourceContent: { paragraphs: Paragraph[] };
  translationContent: { paragraphs: Paragraph[] } | null;
  translationId: number | null;
  sourceLanguage: string;
  returnPath: string;
}

export function SourceEditor({
  chapterId,
  sourceContent,
  translationContent,
  translationId,
  sourceLanguage,
  returnPath,
}: SourceEditorProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const { t } = useTranslation();

  // Initialize paragraph texts from source content
  const [paragraphs, setParagraphs] = useState<(string | null)[]>(() =>
    sourceContent.paragraphs.map((p) => p.text)
  );

  // Track which translation paragraphs should be deleted
  const [translationsToDelete, setTranslationsToDelete] = useState<Set<number>>(
    new Set()
  );

  const [editSummary, setEditSummary] = useState("");

  // Dialog state for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(
    null
  );

  const updateSource = useMutation(
    trpc.chapters.updateSourceWithTranslation.mutationOptions({
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

  // Check if a translation exists for a given paragraph index
  function hasTranslation(arrayIndex: number): boolean {
    if (!translationContent) return false;
    const paraIndex = sourceContent.paragraphs[arrayIndex]?.index;
    const translationPara = translationContent.paragraphs.find(
      (p) => p.index === paraIndex
    );
    return translationPara?.text !== null && translationPara?.text !== undefined;
  }

  function handleDeleteClick(index: number) {
    if (hasTranslation(index)) {
      // Show confirmation dialog
      setPendingDeleteIndex(index);
      setDeleteDialogOpen(true);
    } else {
      // No translation exists, delete directly
      handleDeleteParagraph(index, false);
    }
  }

  function handleDeleteParagraph(index: number, alsoDeleteTranslation: boolean) {
    setParagraphs((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });

    if (alsoDeleteTranslation) {
      const paraIndex = sourceContent.paragraphs[index]?.index;
      if (paraIndex !== undefined) {
        setTranslationsToDelete((prev) => new Set(prev).add(paraIndex));
      }
    }
  }

  function handleDialogConfirm(deleteTranslation: boolean) {
    if (pendingDeleteIndex !== null) {
      handleDeleteParagraph(pendingDeleteIndex, deleteTranslation);
    }
    setDeleteDialogOpen(false);
    setPendingDeleteIndex(null);
  }

  function handleRestoreParagraph(index: number) {
    setParagraphs((prev) => {
      const next = [...prev];
      // Restore to original or empty string
      next[index] = sourceContent.paragraphs[index]?.text ?? "";
      return next;
    });

    // Also remove from translations to delete if it was there
    const paraIndex = sourceContent.paragraphs[index]?.index;
    if (paraIndex !== undefined) {
      setTranslationsToDelete((prev) => {
        const next = new Set(prev);
        next.delete(paraIndex);
        return next;
      });
    }
  }

  function handleSave() {
    const content = {
      paragraphs: sourceContent.paragraphs.map((sp, i) => ({
        index: sp.index,
        text: paragraphs[i],
      })),
    };

    // Build translation updates if we have translations to delete
    let translationUpdates: { index: number; text: string | null }[] | undefined;
    if (translationId && translationsToDelete.size > 0 && translationContent) {
      translationUpdates = translationContent.paragraphs.map((p) => ({
        index: p.index,
        text: translationsToDelete.has(p.index) ? null : p.text,
      }));
    }

    updateSource.mutate({
      chapterId,
      content,
      editSummary: editSummary || undefined,
      translationId: translationUpdates && translationId ? translationId : undefined,
      translationUpdates,
    });
  }

  // Check if anything has changed
  const hasChanges =
    paragraphs.some((p, i) => p !== sourceContent.paragraphs[i]?.text) ||
    translationsToDelete.size > 0;

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
          const willDeleteTranslation = translationsToDelete.has(sourcePara.index);

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
                  {t("editor.paragraph")} {sourcePara.index}
                  {isDeleted && willDeleteTranslation && (
                    <span className="ml-2 text-destructive">
                      {t("editor.translationRemoved")}
                    </span>
                  )}
                </span>
                {isDeleted ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestoreParagraph(i)}
                  >
                    {t("editor.restore")}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteClick(i)}
                  >
                    {t("editor.delete")}
                  </Button>
                )}
              </div>

              {isDeleted ? (
                <p className="italic text-muted-foreground">
                  {t("editor.paragraphRemoved")}
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
                  placeholder={t("editor.enterSource")}
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
            {t("editor.editSummary")}
          </Label>
          <Input
            id="edit-summary"
            value={editSummary}
            onChange={(e) => setEditSummary(e.target.value)}
            placeholder={t("editor.describChanges")}
            className="max-w-md"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSource.isPending}
          >
            {updateSource.isPending ? t("common.saving") : t("editor.saveSource")}
          </Button>
        </div>
      </div>

      {updateSource.isError && (
        <p className="mt-2 text-sm text-destructive">
          {t("editor.failedSave")} {updateSource.error.message}
        </p>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editor.deleteWithTranslation")}</DialogTitle>
            <DialogDescription>
              {t("editor.deleteConfirmation")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setPendingDeleteIndex(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleDialogConfirm(false)}
            >
              {t("editor.keepTranslation")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDialogConfirm(true)}
            >
              {t("editor.deleteBoth")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
