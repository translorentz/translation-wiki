"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n";

interface PostReplyFormProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel: () => void;
}

export function PostReplyForm({ onSubmit, onCancel }: PostReplyFormProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("discussion.replyPlaceholder")}
        rows={3}
        required
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting || !content.trim()}>
          {submitting ? t("discussion.posting") : t("discussion.postReply")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
