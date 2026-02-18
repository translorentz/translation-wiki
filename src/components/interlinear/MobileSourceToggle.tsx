/**
 * MobileSourceToggle - Floating action button to show/hide source text on mobile
 *
 * Design decisions:
 * - Fixed position at bottom-right: Easy thumb reach, doesn't obstruct content
 * - Uses Eye/EyeOff icons: Universal visibility metaphor
 * - Includes text label: Clarifies function for first-time users
 * - Smooth transitions: Professional feel with transform and opacity animations
 * - Semi-transparent background: Visible but not overpowering
 * - ARIA labels: Accessible for screen readers
 */
"use client";

import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "@/i18n";

interface MobileSourceToggleProps {
  hideSource: boolean;
  onToggle: () => void;
}

export function MobileSourceToggle({
  hideSource,
  onToggle,
}: MobileSourceToggleProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onToggle}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 shadow-lg backdrop-blur-sm transition-all hover:bg-background"
      aria-label={hideSource ? t("interlinear.showOriginalText") : t("interlinear.hideOriginalText")}
      aria-pressed={hideSource}
    >
      {hideSource ? (
        <>
          <Eye className="h-4 w-4" />
          <span className="text-sm">{t("interlinear.showOriginal")}</span>
        </>
      ) : (
        <>
          <EyeOff className="h-4 w-4" />
          <span className="text-sm">{t("interlinear.hideOriginal")}</span>
        </>
      )}
    </Button>
  );
}
