import { db } from "@/server/db";
import { texts, chapters } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { generatePdf } from "@/components/pdf/PdfDocument";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ textId: string }> }
) {
  const { textId: textIdStr } = await params;
  const textId = parseInt(textIdStr, 10);

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

  // Extract chapters that have translations
  const translatedChapters = textData.chapters
    .filter((ch) => {
      const translation = ch.translations[0];
      return translation?.currentVersion?.content;
    })
    .map((ch) => {
      const content = ch.translations[0]!.currentVersion!.content as {
        paragraphs: { index: number; text: string }[];
      };
      return {
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        translationParagraphs: content.paragraphs,
      };
    });

  if (translatedChapters.length === 0) {
    return Response.json(
      { error: "No translations available for this text" },
      { status: 400 }
    );
  }

  try {
    const pdfBuffer = await generatePdf({
      textTitle: textData.title,
      titleOriginalScript: textData.titleOriginalScript,
      authorName: textData.author.name,
      languageName: textData.language.name,
      chapters: translatedChapters,
      totalChapters: textData.chapters.length,
      textType: textData.textType,
    });

    const filename = textData.title.replace(/[^\w\s-]/g, "").trim();

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
