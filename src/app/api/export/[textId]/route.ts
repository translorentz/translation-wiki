import { db } from "@/server/db";
import { texts, chapters } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { generatePdf } from "@/components/pdf/PdfDocument";
import { auth } from "@/server/auth";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ textId: string }> }
) {
  // Login-gated. PDF generation is expensive (Puppeteer-class compute,
  // multi-MB bandwidth) and was the heaviest bot-scrape vector on the site.
  // Restricted to authenticated users so abuse traffic cannot reach it.
  const session = await auth();
  if (!session?.user) {
    return Response.json(
      { error: "Sign in required to download" },
      { status: 401 },
    );
  }

  const { textId: textIdStr } = await params;
  const textId = parseInt(textIdStr, 10);
  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") || "en";

  if (isNaN(textId)) {
    return Response.json({ error: "Invalid text ID" }, { status: 400 });
  }

  const textData = await db.query.texts.findFirst({
    where: eq(texts.id, textId),
    with: {
      author: true,
      language: true,
      chapters: {
        orderBy: [asc(chapters.ordering)],
        with: {
          translations: {
            with: {
              currentVersion: true,
            },
          },
        },
      },
    },
  });

  if (!textData) {
    return Response.json({ error: "Text not found" }, { status: 404 });
  }

  // Extract chapters that have translations in the requested language
  const translatedChapters = textData.chapters
    .filter((ch) => {
      const translation = ch.translations.find(
        (t) => t.targetLanguage === lang
      );
      return translation?.currentVersion?.content;
    })
    .map((ch) => {
      const translation = ch.translations.find(
        (t) => t.targetLanguage === lang
      )!;
      const content = translation.currentVersion!.content as {
        paragraphs: { index: number; text: string }[];
      };
      return {
        chapterNumber: ch.chapterNumber,
        title: lang === "zh" ? (ch.titleZh || ch.title) : ch.title,
        translationParagraphs: content.paragraphs,
      };
    });

  if (translatedChapters.length === 0) {
    return Response.json(
      { error: "No translations available for this text" },
      { status: 400 }
    );
  }

  const displayTitle =
    lang === "zh" ? (textData.titleZh || textData.title) : textData.title;

  try {
    const pdfBuffer = await generatePdf({
      textTitle: displayTitle,
      titleOriginalScript: textData.titleOriginalScript,
      authorName: textData.author.name,
      languageName: textData.language.name,
      chapters: translatedChapters,
      totalChapters: textData.chapters.length,
      textType: textData.textType,
      lang,
    });

    const filename = textData.slug;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return Response.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
