import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^DATABASE_URL=(.+)$/);
    if (match) {
      process.env.DATABASE_URL = match[1]!.replace(/^['"]|['"]$/g, '');
    }
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found. Check .env.local');
  process.exit(1);
}

const sql = postgres(connectionString);

// Contamination patterns to check
const contaminationPatterns: [RegExp, string][] = [
  [/Source:/i, "Source:"],
  [/விலை\s*ரூ/, "Price (விலை ரூ)"],
  [/அச்சுக்கூடம்/, "Printing house"],
  [/பதிப்பகம்/, "Publisher"],
  [/பதிப்புரை/, "Publisher preface"],
  [/அணிந்துரை/, "Foreword"],
  [/\b19\d{2}\b/, "Year 19XX"],
  [/\b20\d{2}\b/, "Year 20XX"],
  [/\bPress\b/i, "Press"],
  [/Copyright/i, "Copyright"],
  [/Reserved/i, "Reserved"],
  [/Printed\b/i, "Printed"],
];

interface Issue {
  text: string;
  chapter: string;
  position: string;
  paraIndex: number;
  pattern: string;
  sample: string;
}

async function main() {
  console.log('=== Tamil Database Contamination Check ===\n');

  // Get all Tamil texts with chapters
  const rows = await sql`
    SELECT
      t.slug as text_slug,
      c.slug as chapter_slug,
      c.source_content
    FROM texts t
    JOIN languages l ON t.language_id = l.id
    JOIN chapters c ON c.text_id = t.id
    WHERE l.code = 'ta'
    ORDER BY t.slug, c.slug
  `;

  console.log(`Found ${rows.length} Tamil chapters\n`);

  const issues: Issue[] = [];
  const textsSeen = new Set<string>();

  for (const row of rows) {
    textsSeen.add(row.text_slug as string);
    let sourceContent = row.source_content as unknown;

    // Handle case where source_content is a JSON string
    if (typeof sourceContent === 'string') {
      try {
        sourceContent = JSON.parse(sourceContent);
      } catch {
        console.log(`  WARNING: ${row.text_slug}/${row.chapter_slug} has unparseable source_content`);
        continue;
      }
    }

    let paragraphs: string[] = [];

    // Extract paragraphs from various structures
    const extractParagraphs = (content: unknown): string[] => {
      if (Array.isArray(content)) {
        if (content.length === 0) return [];
        if (typeof content[0] === 'string') return content as string[];
        if (typeof content[0] === 'object' && content[0] !== null && 'text' in content[0]) {
          return content.map((p: { text: string }) => p.text);
        }
      }
      return [];
    };

    if (Array.isArray(sourceContent)) {
      paragraphs = extractParagraphs(sourceContent);
    } else if (sourceContent && typeof sourceContent === 'object' && 'paragraphs' in (sourceContent as object)) {
      const sc = sourceContent as { paragraphs: unknown };
      paragraphs = extractParagraphs(sc.paragraphs);
    }

    if (paragraphs.length === 0) {
      console.log(`  WARNING: ${row.text_slug}/${row.chapter_slug} has NO PARAGRAPHS`);
      continue;
    }

    // Check first 3 and last 3 paragraphs
    const checkIndices: number[] = [];
    for (let i = 0; i < Math.min(3, paragraphs.length); i++) {
      checkIndices.push(i);
    }
    for (let i = Math.max(0, paragraphs.length - 3); i < paragraphs.length; i++) {
      if (!checkIndices.includes(i)) {
        checkIndices.push(i);
      }
    }

    for (const idx of checkIndices) {
      const para = paragraphs[idx];
      for (const [pattern, name] of contaminationPatterns) {
        if (pattern.test(para)) {
          const position = idx < 3 ? 'FRONT' : 'BACK';
          issues.push({
            text: row.text_slug as string,
            chapter: row.chapter_slug as string,
            position,
            paraIndex: idx,
            pattern: name,
            sample: para.substring(0, 150).replace(/\n/g, " "),
          });
        }
      }
    }
  }

  console.log(`\n\n========== CONTAMINATION REPORT ==========`);
  console.log(`Checked ${textsSeen.size} texts, ${rows.length} chapters\n`);

  if (issues.length === 0) {
    console.log("NO CONTAMINATION FOUND! All Tamil texts in DB are clean.");
  } else {
    // Deduplicate by text+chapter+pattern
    const uniqueIssues = new Map<string, Issue>();
    for (const issue of issues) {
      const key = `${issue.text}|${issue.chapter}|${issue.pattern}`;
      if (!uniqueIssues.has(key)) {
        uniqueIssues.set(key, issue);
      }
    }

    console.log(`Found ${uniqueIssues.size} contamination issues:\n`);

    // Group by text
    const byText = new Map<string, Issue[]>();
    for (const issue of uniqueIssues.values()) {
      if (!byText.has(issue.text)) byText.set(issue.text, []);
      byText.get(issue.text)!.push(issue);
    }

    for (const [text, textIssues] of byText) {
      console.log(`\n--- ${text} ---`);
      for (const issue of textIssues) {
        console.log(`  ${issue.chapter} para[${issue.paraIndex}] ${issue.position}: ${issue.pattern}`);
        console.log(`    "${issue.sample}..."`);
      }
    }
  }

  process.exit(0);
}

main();
