import { db } from "@/server/db";
import { texts, chapters } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";
import epub, { type Chapter } from "epub-gen-memory";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const CSS = `
body {
  font-family: "Georgia", "Times New Roman", serif;
  line-height: 1.6;
  margin: 1em;
  color: #1a1a1a;
}
h1 { text-align: center; margin-bottom: 0.3em; }
h2 { text-align: center; margin-top: 2em; margin-bottom: 1em; color: #333; }
p { text-indent: 2em; margin: 0.3em 0; }
p.first { text-indent: 0; }
.subtitle { text-align: center; color: #666; font-size: 0.9em; margin-bottom: 0.5em; }
.meta { text-align: center; color: #999; font-size: 0.85em; }
.poetry-line { text-indent: 0; margin: 0; padding-left: 2em; }
.stanza-break { margin-bottom: 1em; }
`;

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

  const isPoetry = textData.textType === "poetry";
  const isPartial = translatedChapters.length < textData.chapters.length;

  // Build title page HTML
  let titleHtml = `<h1>${escapeHtml(textData.title)}</h1>`;
  if (textData.titleOriginalScript) {
    titleHtml += `<p class="subtitle">${escapeHtml(textData.titleOriginalScript)}</p>`;
  }
  titleHtml += `<p class="subtitle">${escapeHtml(textData.author.name)}</p>`;
  titleHtml += `<p class="meta">Translated from ${escapeHtml(textData.language.name)}</p>`;
  if (isPartial) {
    titleHtml += `<p class="meta">Partial translation (${translatedChapters.length} of ${textData.chapters.length} chapters)</p>`;
  }
  titleHtml += `<p class="meta" style="margin-top: 3em;">deltoi.com</p>`;

  // Build chapter content
  const epubChapters: Chapter[] = [
    { title: textData.title, content: titleHtml },
    ...translatedChapters.map((ch) => {
      const title = ch.title ?? `Chapter ${ch.chapterNumber}`;
      let html = "";
      if (isPoetry) {
        for (const p of ch.translationParagraphs) {
          const lines = p.text.split("\n");
          for (const line of lines) {
            html += `<p class="poetry-line">${escapeHtml(line)}</p>`;
          }
          html += `<p class="stanza-break">&nbsp;</p>`;
        }
      } else {
        for (let i = 0; i < ch.translationParagraphs.length; i++) {
          const p = ch.translationParagraphs[i]!;
          const cls = i === 0 ? ' class="first"' : "";
          html += `<p${cls}>${escapeHtml(p.text)}</p>`;
        }
      }
      return { title, content: html };
    }),
  ];

  // Colophon
  const now = new Date();
  const downloadDate = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const colophonHtml = `
<div style="text-align: center; margin-top: 6em;">
  <p style="text-indent: 0; color: #999; font-style: italic;">Deltoi, downloaded at deltoi.com, a trial project by Bryan Cheong, on ${escapeHtml(downloadDate)}</p>
</div>`;
  epubChapters.push({ title: "Colophon", content: colophonHtml });

  try {
    const buffer = await epub(
      {
        title: textData.title,
        author: textData.author.name,
        lang: textData.language.code ?? "en",
        css: CSS,
        tocTitle: "Table of Contents",
      },
      epubChapters
    );

    const filename = textData.title.replace(/[^\w\s-]/g, "").trim();

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Disposition": `attachment; filename="${filename}.epub"`,
      },
    });
  } catch (err) {
    console.error("EPUB generation error:", err);
    return Response.json(
      { error: "Failed to generate EPUB" },
      { status: 500 }
    );
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
