import PDFDocument from "pdfkit";
import path from "path";

interface Paragraph {
  index: number;
  text: string;
}

interface ChapterData {
  chapterNumber: number;
  title: string | null;
  translationParagraphs: Paragraph[];
}

interface PdfDocumentProps {
  textTitle: string;
  titleOriginalScript: string | null;
  authorName: string;
  languageName: string;
  chapters: ChapterData[];
  totalChapters: number;
  textType: string;
  lang: string;
}

// Page dimensions (US Letter)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_TOP = 72;
const MARGIN_BOTTOM = 72;
const MARGIN_LEFT = 90;
const MARGIN_RIGHT = 90;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Font paths — selected per language in generatePdf()
const FONT_DIR = path.join(process.cwd(), "public", "fonts");

function addPageNumber(doc: InstanceType<typeof PDFDocument>, pageNum: number) {
  doc.font("Serif").fontSize(9).fillColor("#666666");
  doc.text(`${pageNum}`, 0, PAGE_HEIGHT - 36, {
    width: PAGE_WIDTH,
    align: "center",
  });
}

function renderTitlePage(
  doc: InstanceType<typeof PDFDocument>,
  props: PdfDocumentProps
) {
  const { textTitle, titleOriginalScript, authorName, languageName, chapters, totalChapters, lang } = props;
  const isPartial = chapters.length < totalChapters;
  const isChinese = lang === "zh";

  // Title
  doc.font("Serif-Bold").fontSize(24).fillColor("#000000");
  doc.text(textTitle, MARGIN_LEFT, 200, {
    width: CONTENT_WIDTH,
    align: "center",
  });

  // Original script title
  if (titleOriginalScript) {
    doc.moveDown(0.3);
    doc.font("Serif").fontSize(16).fillColor("#555555");
    doc.text(titleOriginalScript, MARGIN_LEFT, doc.y, {
      width: CONTENT_WIDTH,
      align: "center",
    });
  }

  // Author
  doc.moveDown(1.5);
  doc.font("Serif").fontSize(14).fillColor("#000000");
  doc.text(authorName, MARGIN_LEFT, doc.y, {
    width: CONTENT_WIDTH,
    align: "center",
  });

  // Language
  doc.moveDown(0.3);
  doc.font("Serif").fontSize(12).fillColor("#666666");
  const translatedFrom = isChinese ? `译自${languageName}` : `Translated from ${languageName}`;
  doc.text(translatedFrom, MARGIN_LEFT, doc.y, {
    width: CONTENT_WIDTH,
    align: "center",
  });

  // Partial note
  if (isPartial) {
    doc.moveDown(0.3);
    doc.font("Serif").fontSize(10).fillColor("#999999");
    const partialNote = isChinese
      ? `部分翻译（${chapters.length} / ${totalChapters} 章）`
      : `Partial translation (${chapters.length} of ${totalChapters} chapters)`;
    doc.text(partialNote, MARGIN_LEFT, doc.y, {
      width: CONTENT_WIDTH, align: "center",
    });
  }

  // Site
  doc.moveDown(3);
  doc.font("Serif").fontSize(10).fillColor("#999999");
  doc.text("deltoi.com", MARGIN_LEFT, doc.y, {
    width: CONTENT_WIDTH,
    align: "center",
  });
}

function renderProseChapter(
  doc: InstanceType<typeof PDFDocument>,
  chapter: ChapterData
) {
  // Chapter title
  if (chapter.title) {
    doc.font("Serif-Bold").fontSize(16).fillColor("#000000");
    doc.text(chapter.title, MARGIN_LEFT, MARGIN_TOP, {
      width: CONTENT_WIDTH,
      align: "center",
    });
    doc.moveDown(1.2);
  } else {
    doc.y = MARGIN_TOP;
  }

  // Paragraphs
  doc.font("Serif").fontSize(11).fillColor("#000000");
  for (let i = 0; i < chapter.translationParagraphs.length; i++) {
    const p = chapter.translationParagraphs[i]!;
    doc.text(p.text, MARGIN_LEFT, doc.y, {
      width: CONTENT_WIDTH,
      lineGap: 3,
      indent: i === 0 ? 0 : 24,
    });
    doc.moveDown(0.15);
  }
}

function renderPoetryChapter(
  doc: InstanceType<typeof PDFDocument>,
  chapter: ChapterData,
  globalLineCount: { value: number }
) {
  // Chapter title
  if (chapter.title) {
    doc.font("Serif-Bold").fontSize(16).fillColor("#000000");
    doc.text(chapter.title, MARGIN_LEFT, MARGIN_TOP, {
      width: CONTENT_WIDTH,
      align: "center",
    });
    doc.moveDown(1.2);
  } else {
    doc.y = MARGIN_TOP;
  }

  const POETRY_INDENT = 40;
  const LINE_NUM_WIDTH = 30;
  const LINE_NUM_GAP = 10;

  for (const p of chapter.translationParagraphs) {
    const lines = p.text.split("\n");
    for (const line of lines) {
      globalLineCount.value++;
      const showNumber = globalLineCount.value % 5 === 0;

      if (showNumber) {
        // Line number
        doc.font("Serif").fontSize(8).fillColor("#999999");
        doc.text(
          `${globalLineCount.value}`,
          MARGIN_LEFT,
          doc.y,
          { width: LINE_NUM_WIDTH, align: "right" }
        );
        // Move back up to same line for the poetry text
        doc.y -= doc.currentLineHeight();
      }

      // Poetry line
      doc.font("Serif").fontSize(11).fillColor("#000000");
      doc.text(
        line,
        MARGIN_LEFT + LINE_NUM_WIDTH + LINE_NUM_GAP + POETRY_INDENT,
        doc.y,
        { width: CONTENT_WIDTH - LINE_NUM_WIDTH - LINE_NUM_GAP - POETRY_INDENT }
      );
    }
    // Stanza gap
    doc.moveDown(0.6);
  }
}

export async function generatePdf(props: PdfDocumentProps): Promise<Buffer> {
  const isChinese = props.lang === "zh";

  // Select fonts based on language
  const fontRegular = isChinese
    ? path.join(FONT_DIR, "NotoSerifSC-Regular.ttf")
    : path.join(FONT_DIR, "NotoSerif-Regular.ttf");
  const fontBold = isChinese
    ? path.join(FONT_DIR, "NotoSerifSC-Bold.ttf")
    : path.join(FONT_DIR, "NotoSerif-Bold.ttf");
  const fontItalic = path.join(FONT_DIR, "NotoSerif-Italic.ttf");

  const doc = new PDFDocument({
    size: "LETTER",
    margins: {
      top: MARGIN_TOP,
      bottom: MARGIN_BOTTOM,
      left: MARGIN_LEFT,
      right: MARGIN_RIGHT,
    },
    bufferPages: true,
    autoFirstPage: false,
    info: {
      Title: props.textTitle,
      Author: props.authorName,
    },
  });

  // Register fonts with generic names so render functions are font-agnostic
  doc.registerFont("Serif", fontRegular);
  doc.registerFont("Serif-Bold", fontBold);
  doc.registerFont("Serif-Italic", fontItalic);

  // Collect buffer
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // Title page
  doc.addPage();
  renderTitlePage(doc, props);

  // Chapters
  const isPoetry = props.textType === "poetry";
  const globalLineCount = { value: 0 };

  for (const chapter of props.chapters) {
    doc.addPage();
    if (isPoetry) {
      renderPoetryChapter(doc, chapter, globalLineCount);
    } else {
      renderProseChapter(doc, chapter);
    }
  }

  // Colophon page
  doc.addPage();
  const colophonY = PAGE_HEIGHT / 2 - 40;
  const downloadDate = new Date().toLocaleDateString(isChinese ? "zh-CN" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const downloadedAt = isChinese ? "于 deltoi.com 下载" : "Downloaded at deltoi.com";
  const trialProject = isChinese ? "Bryan Cheong 的试验项目" : "A trial project by Bryan Cheong";
  const opts = { width: CONTENT_WIDTH, align: "center" as const };
  doc.font("Serif").fontSize(14).fillColor("#666666");
  doc.text("DELTOI", MARGIN_LEFT, colophonY, opts);
  doc.moveDown(0.6);
  doc.font("Serif-Italic").fontSize(10).fillColor("#999999");
  doc.text(downloadedAt, MARGIN_LEFT, doc.y, opts);
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor("#aaaaaa");
  doc.text(trialProject, MARGIN_LEFT, doc.y, opts);
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor("#bbbbbb");
  doc.text(downloadDate, MARGIN_LEFT, doc.y, opts);

  // Add page numbers (skip title page and colophon)
  // Temporarily remove bottom margin so PDFKit doesn't auto-paginate
  // when placing text below the normal content area
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 1; i < totalPages - 1; i++) {
    doc.switchToPage(i);
    const saved = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    addPageNumber(doc, i);
    doc.page.margins.bottom = saved;
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}
