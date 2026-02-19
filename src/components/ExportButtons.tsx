"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, BookOpen, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n";

interface ExportButtonsProps {
  textId: number;
  textTitle: string;
  textSlug: string;
}

function useExport(textId: number, textSlug: string, format: "pdf" | "epub", locale: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    const langParam = locale !== "en" ? `?lang=${locale}` : "";
    const url =
      format === "pdf"
        ? `/api/export/${textId}${langParam}`
        : `/api/export/${textId}/epub${langParam}`;

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
      a.download = `${textSlug}.${format}`;
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

export function ExportButtons({ textId, textTitle, textSlug }: ExportButtonsProps) {
  const { t, locale } = useTranslation();
  const pdf = useExport(textId, textSlug, "pdf", locale);
  const epubExport = useExport(textId, textSlug, "epub", locale);

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
