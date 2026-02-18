"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, BookOpen, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n";

interface ExportButtonsProps {
  textId: number;
  textTitle: string;
}

function useExport(textId: number, textTitle: string, format: "pdf" | "epub") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    const url =
      format === "pdf"
        ? `/api/export/${textId}`
        : `/api/export/${textId}/epub`;

    try {
      const res = await fetch(url);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `Failed to generate ${format.toUpperCase()}`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${textTitle.replace(/[^\w\s-]/g, "").trim()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to generate ${format.toUpperCase()}`
      );
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, handleExport };
}

export function ExportButtons({ textId, textTitle }: ExportButtonsProps) {
  const { t } = useTranslation();
  const pdf = useExport(textId, textTitle, "pdf");
  const epubExport = useExport(textId, textTitle, "epub");

  return (
    <div>
      <div className="flex flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={pdf.handleExport}
          disabled={pdf.loading}
        >
          {pdf.loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {pdf.loading ? t("export.generating") : t("export.pdf")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={epubExport.handleExport}
          disabled={epubExport.loading}
        >
          {epubExport.loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <BookOpen className="mr-2 h-4 w-4" />
          )}
          {epubExport.loading ? t("export.generating") : t("export.epub")}
        </Button>
      </div>
      {(pdf.error || epubExport.error) && (
        <p className="mt-1 text-xs text-destructive">
          {pdf.error || epubExport.error}
        </p>
      )}
    </div>
  );
}
