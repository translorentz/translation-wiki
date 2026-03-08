"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import {
  translationUploadSchema,
  validateTranslationUpload,
} from "@/lib/validateUpload";

type Tab = "source" | "translation";

type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  summary?: {
    language: string;
    author: string;
    title: string;
    chapters: number;
    totalParagraphs: number;
  };
};

export function ContributeClient() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("source");
  const [json, setJson] = useState("");
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const languagesQuery = useQuery(trpc.contribute.getLanguages.queryOptions());

  const validateMutation = useMutation(
    trpc.contribute.validateSource.mutationOptions({
      onSuccess: (data) => {
        setValidationResult(data as ValidationResult);
      },
    })
  );

  const uploadSourceMutation = useMutation(
    trpc.contribute.uploadSource.mutationOptions({
      onSuccess: (data) => {
        setUploadResult(
          `Text "${data.slug}" created with ${data.chaptersCreated} chapters. View it at /${data.languageCode}/${data.authorSlug}/${data.slug}`
        );
        setUploadError(null);
        setJson("");
        setValidationResult(null);
      },
      onError: (err) => {
        setUploadError(err.message);
        setUploadResult(null);
      },
    })
  );

  const uploadTranslationMutation = useMutation(
    trpc.contribute.uploadTranslation.mutationOptions({
      onSuccess: (data) => {
        setUploadResult(
          `Translation uploaded: ${data.chaptersCreated} chapters created, ${data.chaptersSkipped} skipped (already translated).`
        );
        setUploadError(null);
        setJson("");
        setValidationResult(null);
      },
      onError: (err) => {
        setUploadError(err.message);
        setUploadResult(null);
      },
    })
  );

  function handleValidate() {
    setUploadResult(null);
    setUploadError(null);

    if (!json.trim()) {
      setValidationResult({ valid: false, errors: ["JSON input is empty."] });
      return;
    }

    // Quick parse check
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setValidationResult({
        valid: false,
        errors: ["Invalid JSON: could not parse the input."],
      });
      return;
    }

    if (tab === "source") {
      validateMutation.mutate({ json });
    } else {
      // Client-side validation for translation
      const result = translationUploadSchema.safeParse(parsed);
      if (!result.success) {
        setValidationResult({
          valid: false,
          errors: result.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`
          ),
        });
        return;
      }
      const validation = validateTranslationUpload(result.data);
      if (!validation.valid) {
        setValidationResult(validation);
        return;
      }
      setValidationResult({
        valid: true,
        errors: [],
        summary: {
          language: result.data.targetLanguage,
          author: "",
          title: result.data.textSlug,
          chapters: result.data.chapters.length,
          totalParagraphs: result.data.chapters.reduce(
            (sum, ch) => sum + ch.paragraphs.length,
            0
          ),
        },
      });
    }
  }

  function handleUpload() {
    setUploadResult(null);
    setUploadError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setUploadError("Invalid JSON.");
      return;
    }

    if (tab === "source") {
      uploadSourceMutation.mutate(parsed as Parameters<typeof uploadSourceMutation.mutate>[0]);
    } else {
      uploadTranslationMutation.mutate(parsed as Parameters<typeof uploadTranslationMutation.mutate>[0]);
    }
  }

  const isLoading =
    validateMutation.isPending ||
    uploadSourceMutation.isPending ||
    uploadTranslationMutation.isPending;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("contribute.title")}</h1>
      <p className="mb-6 text-muted-foreground">{t("contribute.description")}</p>

      {/* Tab selector */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={tab === "source" ? "default" : "outline"}
          onClick={() => {
            setTab("source");
            setValidationResult(null);
            setUploadResult(null);
            setUploadError(null);
          }}
        >
          {t("contribute.sourceTab")}
        </Button>
        <Button
          variant={tab === "translation" ? "default" : "outline"}
          onClick={() => {
            setTab("translation");
            setValidationResult(null);
            setUploadResult(null);
            setUploadError(null);
          }}
        >
          {t("contribute.translationTab")}
        </Button>
      </div>

      {/* Format instructions */}
      <Card className="mb-6 p-4">
        <h2 className="mb-3 text-lg font-semibold">
          {t("contribute.formatTitle")}
        </h2>

        {tab === "source" ? (
          <div className="space-y-3 text-sm">
            <p>{t("contribute.sourceFormatDesc")}</p>
            {languagesQuery.data && (
              <p className="text-muted-foreground">
                {t("contribute.validLanguages")}{" "}
                <code className="rounded bg-muted px-1">
                  {languagesQuery.data.map((l) => l.code).join(", ")}
                </code>
              </p>
            )}
            <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
              {JSON.stringify(
                {
                  language: "la",
                  authorName: "Cicero",
                  authorSlug: "cicero",
                  title: "De Amicitia",
                  slug: "de-amicitia",
                  description: "A dialogue on friendship.",
                  textType: "prose",
                  genre: "philosophy",
                  compositionYear: -44,
                  compositionYearDisplay: "44 BCE",
                  chapters: [
                    {
                      title: "Chapter 1",
                      paragraphs: [
                        { index: 0, text: "First paragraph text..." },
                        { index: 1, text: "Second paragraph text..." },
                      ],
                    },
                  ],
                },
                null,
                2
              )}
            </pre>

            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                <strong>language</strong> (required): {t("contribute.langFieldDesc")}
              </p>
              <p>
                <strong>authorName</strong> (required): {t("contribute.authorNameDesc")}
              </p>
              <p>
                <strong>authorSlug</strong> (required): {t("contribute.authorSlugDesc")}
              </p>
              <p>
                <strong>title</strong> (required): {t("contribute.titleFieldDesc")}
              </p>
              <p>
                <strong>slug</strong> (required): {t("contribute.slugFieldDesc")}
              </p>
              <p>
                <strong>textType</strong>: &quot;prose&quot; or &quot;poetry&quot; (default: &quot;prose&quot;). Poetry displays line numbers.
              </p>
              <p>
                <strong>genre</strong>: {t("contribute.genreFieldDesc")}
              </p>
              <p>
                <strong>compositionYear</strong>: {t("contribute.yearFieldDesc")}
              </p>
              <p>
                <strong>chapters</strong>: {t("contribute.chaptersFieldDesc")}
              </p>
              <p>
                <strong>paragraphs</strong>: {t("contribute.paragraphsFieldDesc")}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p>{t("contribute.translationFormatDesc")}</p>
            <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
              {JSON.stringify(
                {
                  textSlug: "de-amicitia",
                  targetLanguage: "en",
                  chapters: [
                    {
                      chapterNumber: 1,
                      paragraphs: [
                        { index: 0, text: "First paragraph translation..." },
                        { index: 1, text: "Second paragraph translation..." },
                      ],
                    },
                  ],
                },
                null,
                2
              )}
            </pre>

            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                <strong>textSlug</strong> (required): {t("contribute.textSlugDesc")}
              </p>
              <p>
                <strong>targetLanguage</strong> (required): {t("contribute.targetLangDesc")}
              </p>
              <p>
                <strong>chapterNumber</strong>: {t("contribute.chapterNumDesc")}
              </p>
              <p>
                <strong>paragraphs</strong>: {t("contribute.transParagraphsDesc")}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* JSON input */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium">
          {t("contribute.jsonInput")}
        </label>
        <textarea
          className="h-64 w-full rounded-md border bg-background p-3 font-mono text-sm"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder={t("contribute.jsonPlaceholder")}
          spellCheck={false}
        />
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex gap-2">
        <Button
          variant="outline"
          onClick={handleValidate}
          disabled={isLoading || !json.trim()}
        >
          {isLoading ? t("common.loading") : t("contribute.validate")}
        </Button>
        <Button
          onClick={handleUpload}
          disabled={
            isLoading || !json.trim() || !validationResult?.valid
          }
        >
          {isLoading ? t("common.saving") : t("contribute.upload")}
        </Button>
      </div>

      {/* Validation result */}
      {validationResult && (
        <Card className="mb-4 p-4">
          {validationResult.valid ? (
            <div className="space-y-2">
              <p className="font-medium text-green-600">
                {t("contribute.validationPassed")}
              </p>
              {validationResult.summary && (
                <div className="text-sm text-muted-foreground">
                  <p>
                    {tab === "source" ? `${validationResult.summary.title} (${validationResult.summary.language})` : `${validationResult.summary.title} → ${validationResult.summary.language}`}
                  </p>
                  <p>
                    {validationResult.summary.chapters} chapters, {validationResult.summary.totalParagraphs} paragraphs
                  </p>
                </div>
              )}
              {validationResult.warnings?.map((w, i) => (
                <p key={i} className="text-sm text-yellow-600">
                  {w}
                </p>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-medium text-red-600">
                {t("contribute.validationFailed")}
              </p>
              {validationResult.errors.map((err, i) => (
                <p key={i} className="text-sm text-red-500">
                  {err}
                </p>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Upload result */}
      {uploadResult && (
        <Card className="mb-4 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <p className="text-sm text-green-700 dark:text-green-300">
            {uploadResult}
          </p>
        </Card>
      )}

      {uploadError && (
        <Card className="mb-4 border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">
            {uploadError}
          </p>
        </Card>
      )}
    </div>
  );
}
