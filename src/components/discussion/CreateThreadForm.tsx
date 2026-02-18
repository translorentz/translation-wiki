"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n";

interface CreateThreadFormProps {
  onSubmit: (title: string, content: string) => Promise<void>;
  onCancel: () => void;
}

export function CreateThreadForm({ onSubmit, onCancel }: CreateThreadFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(title.trim(), content.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <div>
        <Label htmlFor="thread-title">{t("discussion.title")}</Label>
        <Input
          id="thread-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("discussion.topicPlaceholder")}
          maxLength={300}
          required
        />
      </div>
      <div>
        <Label htmlFor="thread-content">{t("discussion.content")}</Label>
        <Textarea
          id="thread-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("discussion.writePlaceholder")}
          rows={5}
          required
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting || !title.trim() || !content.trim()}>
          {submitting ? t("discussion.creating") : t("discussion.createThread")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
