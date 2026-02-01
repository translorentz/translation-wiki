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
}

// Page dimensions (US Letter)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_TOP = 72;
const MARGIN_BOTTOM = 72;
const MARGIN_LEFT = 90;
const MARGIN_RIGHT = 90;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Font paths
const FONT_DIR = path.join(process.cwd(), "public", "fonts");
const FONT_REGULAR = path.join(FONT_DIR, "EBGaramond-Regular.ttf");
const FONT_BOLD = path.join(FONT_DIR, "EBGaramond-Bold.ttf");
const FONT_ITALIC = path.join(FONT_DIR, "EBGaramond-Italic.ttf");

function addPageNumber(doc: InstanceType<typeof PDFDocument>, pageNum: number) {
  doc.font(FONT_REGULAR).fontSize(9).fillColor("#666666");
  doc.text(`${pageNum}`, 0, PAGE_HEIGHT - 36, {
    width: PAGE_WIDTH,
    align: "center",
  });
}

function renderTitlePage(
  doc: InstanceType<typeof PDFDocument>,
  props: PdfDocumentProps
) {
  const { textTitle, titleOriginalScript, authorName, languageName, chapters, totalChapters } = props;
  const isPartial = chapters.length < totalChapters;

  // Title
  doc.font(FONT_BOLD).fontSize(24).fillColor("#000000");
  doc.text(textTitle, MARGIN_LEFT, 200, {
    width: CONTENT_WIDTH,
    align: "center",
  });

  // Original script title
  if (titleOriginalScript) {
    doc.moveDown(0.3);
    doc.font(FONT_REGULAR).fontSize(16).fillColor("#555555");
    doc.text(titleOriginalScript, MARGIN_LEFT, doc.y, {
      width: CONTENT_WIDTH,
      align: "center",
    });
  }

  // Author
  doc.moveDown(1.5);
  doc.font(FONT_REGULAR).fontSize(14).fillColor("#000000");
  doc.text(authorName, MARGIN_LEFT, doc.y, {
    width: CONTENT_WIDTH,
    align: "center",
  });

  // Language
  doc.moveDown(0.3);
  doc.font(FONT_REGULAR).fontSize(12).fillColor("#666666");
  doc.text(`Translated from ${languageName}`, MARGIN_LEFT, doc.y, {
    width: CONTENT_WIDTH,
    align: "center",
  });

  // Partial note
  if (isPartial) {
    doc.moveDown(0.3);
    doc.font(FONT_REGULAR).fontSize(10).fillColor("#999999");
    doc.text(
      `Partial translation (${chapters.length} of ${totalChapters} chapters)`,
      MARGIN_LEFT,
      doc.y,
      { width: CONTENT_WIDTH, align: "center" }
    );
  }

  // Site
  doc.moveDown(3);
  doc.font(FONT_REGULAR).fontSize(10).fillColor("#999999");
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
    doc.font(FONT_BOLD).fontSize(16).fillColor("#000000");
    doc.text(chapter.title, MARGIN_LEFT, MARGIN_TOP, {
      width: CONTENT_WIDTH,
      align: "center",
    });
    doc.moveDown(1.2);
  } else {
    doc.y = MARGIN_TOP;
  }

  // Paragraphs
  doc.font(FONT_REGULAR).fontSize(11).fillColor("#000000");
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
    doc.font(FONT_BOLD).fontSize(16).fillColor("#000000");
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
        doc.font(FONT_REGULAR).fontSize(8).fillColor("#999999");
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
      doc.font(FONT_REGULAR).fontSize(11).fillColor("#000000");
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

  // Register fonts
  doc.registerFont("EBGaramond", FONT_REGULAR);
  doc.registerFont("EBGaramond-Bold", FONT_BOLD);
  doc.registerFont("EBGaramond-Italic", FONT_ITALIC);

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
  const downloadDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const opts = { width: CONTENT_WIDTH, align: "center" as const };
  doc.font(FONT_REGULAR).fontSize(14).fillColor("#666666");
  doc.text("DELTOI", MARGIN_LEFT, colophonY, opts);
  doc.moveDown(0.6);
  doc.font(FONT_ITALIC).fontSize(10).fillColor("#999999");
  doc.text("Downloaded at deltoi.com", MARGIN_LEFT, doc.y, opts);
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor("#aaaaaa");
  doc.text("A trial project by Bryan Cheong", MARGIN_LEFT, doc.y, opts);
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor("#bbbbbb");
  doc.text(downloadDate, MARGIN_LEFT, doc.y, opts);

  // Add page numbers (skip title page and colophon)
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 1; i < totalPages - 1; i++) {
    doc.switchToPage(i);
    addPageNumber(doc, i);
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}
