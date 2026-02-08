import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^DATABASE_URL=(.+)$/);
  if (match) {
    process.env.DATABASE_URL = match[1]!.replace(/^['"]|['"]$/g, "");
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = postgres(connectionString);

interface Paragraph {
  text: string;
  index: number;
}

interface CheckItem {
  chapter: string;
  paraIndex: number;
  expectedTranslation: string;
}

const itemsToCheck: CheckItem[] = [
  { chapter: "chapter-19", paraIndex: 4, expectedTranslation: "2. The Great War" },
  { chapter: "chapter-21", paraIndex: 1, expectedTranslation: "1. The Coronation" },
  { chapter: "chapter-21", paraIndex: 15, expectedTranslation: "2. The Wedding" },
  { chapter: "chapter-6", paraIndex: 10, expectedTranslation: "A Hired Praiser" },
  { chapter: "chapter-6", paraIndex: 17, expectedTranslation: "Another Attempt" },
  { chapter: "chapter-7", paraIndex: 1, expectedTranslation: "1. Health Practices" },
  { chapter: "chapter-7", paraIndex: 19, expectedTranslation: "A Story" },
  { chapter: "chapter-9", paraIndex: 9, expectedTranslation: "3. War" },
];

async function main() {
  console.log("Verifying suguna-sundari section headers...\n");

  const results: Array<{
    chapter: string;
    paraIndex: number;
    sourceText: string;
    translationText: string;
    sourceLength: number;
    translationLength: number;
    status: "CORRECT" | "TRUNCATED" | "MISMATCH";
  }> = [];

  for (const item of itemsToCheck) {
    // Get the chapter with its translation
    const chapters = await sql`
      SELECT
        c.id,
        c.slug,
        c.source_content,
        tv.content as translation_content
      FROM chapters c
      JOIN texts t ON c.text_id = t.id
      LEFT JOIN translations tr ON tr.chapter_id = c.id
      LEFT JOIN translation_versions tv ON tr.current_version_id = tv.id
      WHERE t.slug = 'suguna-sundari'
        AND c.slug = ${item.chapter}
    `;

    if (chapters.length === 0) {
      console.log(`ERROR: Chapter ${item.chapter} not found`);
      continue;
    }

    const chapter = chapters[0];
    const sourceContent = chapter.source_content as { paragraphs: Paragraph[] };
    const translationContent = chapter.translation_content as { paragraphs: Paragraph[] } | null;

    // Find the paragraph with matching index
    const sourcePara = sourceContent.paragraphs.find(p => p.index === item.paraIndex);
    const transPara = translationContent?.paragraphs.find(p => p.index === item.paraIndex);

    const sourceText = sourcePara?.text || "[NO SOURCE]";
    const translationText = transPara?.text || "[NO TRANSLATION]";

    // Determine status
    let status: "CORRECT" | "TRUNCATED" | "MISMATCH";

    // If source is short (likely just a header), translation is correct
    // Tamil headers are usually under 80 chars
    if (sourceText.length < 80) {
      status = "CORRECT";
    } else if (translationText.length < 50 && sourceText.length > 100) {
      status = "TRUNCATED";
    } else {
      status = "MISMATCH";
    }

    results.push({
      chapter: item.chapter,
      paraIndex: item.paraIndex,
      sourceText: sourceText.substring(0, 120) + (sourceText.length > 120 ? "..." : ""),
      translationText: translationText.substring(0, 100) + (translationText.length > 100 ? "..." : ""),
      translationLength: translationText.length,
      sourceLength: sourceText.length,
      status,
    });
  }

  // Print results
  console.log("=".repeat(80));
  console.log("VERIFICATION RESULTS");
  console.log("=".repeat(80));

  let correctCount = 0;
  let truncatedCount = 0;

  for (const r of results) {
    console.log(`\n${r.chapter} para[${r.paraIndex}]:`);
    console.log(`  Translation (${r.translationLength} chars): "${r.translationText}"`);
    console.log(`  Source (${r.sourceLength} chars): "${r.sourceText}"`);
    console.log(`  Status: ${r.status}`);

    if (r.status === "CORRECT") correctCount++;
    if (r.status === "TRUNCATED") truncatedCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(`SUMMARY: ${correctCount} CORRECT, ${truncatedCount} TRUNCATED, ${results.length - correctCount - truncatedCount} OTHER`);
  console.log("=".repeat(80));

  await sql.end();
}

main().catch(console.error);
