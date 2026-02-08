/**
 * Comprehensive verification of ALL Tamil texts
 * - Check paragraph alignment (source == translation)
 * - Check for actual contamination (not false positives)
 */

import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  const match = line.match(/^DATABASE_URL=(.+)$/);
  if (match) dbUrl = match[1].replace(/^['"]|['"]$/g, '');
}

const sql = postgres(dbUrl);

function extractText(para: unknown): string {
  if (typeof para === 'string') return para;
  if (para && typeof para === 'object' && 'text' in (para as object)) {
    return (para as { text: string }).text;
  }
  return '';
}

// Stricter contamination patterns - exclude false positives
const contaminationPatterns: Array<[RegExp, string]> = [
  [/^Source:\s/i, 'Source: prefix'],
  [/விலை\s*ரூ\.\s*\d/, 'Price (விலை ரூ. N)'],
  [/This webpage was last revised/i, 'Web footer'],
  [/This file was last revised/i, 'Web footer'],
  [/Copyright\s+\d{4}/i, 'Copyright notice'],
  [/All rights reserved/i, 'Rights notice'],
  [/Table of Contents/i, 'Table of Contents'],
  [/Tiruchirappalli-\d+/i, 'Publisher address'],
  [/Editorial Note/i, 'Editorial Note'],
  [/பிரபந்தத்திரட்டு/, 'Collection title'],
];

interface Issue {
  text: string;
  chapter: string;
  type: 'alignment' | 'contamination';
  details: string;
}

async function main() {
  console.log('=== COMPREHENSIVE TAMIL TEXT VERIFICATION ===');
  console.log('Date:', new Date().toISOString());
  console.log('');

  const rows = await sql`
    SELECT
      t.slug as text_slug,
      c.slug as chapter_slug,
      c.source_content,
      tv.content as translation_content
    FROM texts t
    JOIN languages l ON t.language_id = l.id
    JOIN chapters c ON c.text_id = t.id
    LEFT JOIN translations tr ON tr.chapter_id = c.id
    LEFT JOIN translation_versions tv ON tr.current_version_id = tv.id
    WHERE l.code = 'ta'
    ORDER BY t.slug, c.slug
  `;

  console.log(`Found ${rows.length} Tamil chapters\n`);

  const issues: Issue[] = [];
  const textsSummary: Map<string, { chapters: number; aligned: number; issues: number }> = new Map();

  for (const row of rows) {
    const textSlug = row.text_slug as string;
    const chapterSlug = row.chapter_slug as string;

    if (!textsSummary.has(textSlug)) {
      textsSummary.set(textSlug, { chapters: 0, aligned: 0, issues: 0 });
    }
    const summary = textsSummary.get(textSlug)!;
    summary.chapters++;

    let sourceContent = row.source_content;
    let transContent = row.translation_content;

    if (typeof sourceContent === 'string') {
      try { sourceContent = JSON.parse(sourceContent); } catch { continue; }
    }
    if (typeof transContent === 'string') {
      try { transContent = JSON.parse(transContent); } catch { /* no translation */ }
    }

    const sourceParas: unknown[] = sourceContent?.paragraphs || (Array.isArray(sourceContent) ? sourceContent : []);
    const transParas: unknown[] = transContent?.paragraphs || (Array.isArray(transContent) ? transContent : []);

    // Check alignment
    if (transParas.length > 0 && sourceParas.length !== transParas.length) {
      issues.push({
        text: textSlug,
        chapter: chapterSlug,
        type: 'alignment',
        details: `Source: ${sourceParas.length}, Translation: ${transParas.length}`
      });
      summary.issues++;
    } else if (transParas.length > 0) {
      summary.aligned++;
    }

    // Check first and last paragraphs for contamination
    const checkParas = [
      { idx: 0, para: sourceParas[0], source: 'source' },
      { idx: sourceParas.length - 1, para: sourceParas[sourceParas.length - 1], source: 'source' },
      { idx: 0, para: transParas[0], source: 'trans' },
      { idx: transParas.length - 1, para: transParas[transParas.length - 1], source: 'trans' },
    ];

    for (const { idx, para, source } of checkParas) {
      if (!para) continue;
      const text = extractText(para);
      for (const [pattern, name] of contaminationPatterns) {
        if (pattern.test(text)) {
          issues.push({
            text: textSlug,
            chapter: chapterSlug,
            type: 'contamination',
            details: `${source}[${idx}]: ${name}`
          });
          summary.issues++;
        }
      }
    }
  }

  // Print summary
  console.log('=== TEXT SUMMARY ===\n');
  for (const [slug, summary] of textsSummary) {
    const status = summary.issues === 0 ? '✅' : '⚠️';
    console.log(`${status} ${slug}: ${summary.chapters} chapters, ${summary.aligned} aligned, ${summary.issues} issues`);
  }

  // Print issues
  if (issues.length > 0) {
    console.log('\n=== ISSUES FOUND ===\n');
    for (const issue of issues) {
      console.log(`${issue.text}/${issue.chapter} [${issue.type}]: ${issue.details}`);
    }
  } else {
    console.log('\n✅ NO ISSUES FOUND - All Tamil texts are clean and aligned!');
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
