"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

interface EndorseButtonProps {
  translationVersionId: number;
  initialCount?: number;
}

export function EndorseButton({
  translationVersionId,
  initialCount = 0,
}: EndorseButtonProps) {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const [optimisticCount, setOptimisticCount] = useState(initialCount);
  const [optimisticEndorsed, setOptimisticEndorsed] = useState(false);

  const countQuery = useQuery(
    trpc.endorsements.getCount.queryOptions({
      translationVersionId,
    })
  );

  const displayCount = countQuery.data ?? optimisticCount;

  const toggle = useMutation(
    trpc.endorsements.toggle.mutationOptions({
      onMutate: () => {
        const newEndorsed = !optimisticEndorsed;
        setOptimisticEndorsed(newEndorsed);
        setOptimisticCount((c) => c + (newEndorsed ? 1 : -1));
      },
      onSuccess: (data) => {
        setOptimisticEndorsed(data.endorsed);
        setOptimisticCount(data.count);
      },
      onError: () => {
        // Revert optimistic update
        setOptimisticEndorsed((prev) => !prev);
        setOptimisticCount((c) => c + (optimisticEndorsed ? 1 : -1));
      },
    })
  );

  return (
    <Button
      variant={optimisticEndorsed ? "default" : "outline"}
      size="sm"
      onClick={() => toggle.mutate({ translationVersionId })}
      disabled={toggle.isPending}
    >
      {optimisticEndorsed ? t("endorsement.endorsed") : t("endorsement.endorse")}
      {displayCount > 0 && (
        <span className="ml-1.5 text-xs">({displayCount})</span>
      )}
    </Button>
  );
}
