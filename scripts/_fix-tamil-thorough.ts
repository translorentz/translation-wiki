/**
 * Thorough fix for Tamil texts - abhirami-pathigam and veeramaamunivar-kalambakam
 *
 * abhirami-pathigam issues:
 * - Translation paragraph 0 contains biographical metadata about Abirami Bhattar,
 *   not a translation of the poem. Need to find where the actual poem translation starts.
 *
 * veeramaamunivar-kalambakam issues:
 * - Translation paragraphs 0-1 are garbage (publisher address, editorial notes)
 * - After removal, translation will have 70 paragraphs, source has 71
 * - Source [0] (கடவுள் வாழ்த்து - God's blessing) has no corresponding translation
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

interface Paragraph {
  text: string;
  index: number;
}

function extractText(para: unknown): string {
  if (typeof para === 'string') return para;
  if (para && typeof para === 'object' && 'text' in (para as object)) {
    return (para as { text: string }).text;
  }
  return '';
}

async function fixAbhiramiPathigam() {
  console.log('\n=== FIXING ABHIRAMI-PATHIGAM ===\n');

  const rows = await sql`
    SELECT
      c.id as chapter_id,
      c.source_content,
      tv.id as version_id,
      tv.content as translation_content
    FROM chapters c
    JOIN texts t ON c.text_id = t.id
    LEFT JOIN translations tr ON tr.chapter_id = c.id
    LEFT JOIN translation_versions tv ON tr.current_version_id = tv.id
    WHERE t.slug = 'abhirami-pathigam' AND c.slug = 'chapter-1'
  `;

  if (rows.length === 0) {
    console.log('  Chapter not found');
    return;
  }

  const row = rows[0];
  let transContent = row.translation_content;

  if (typeof transContent === 'string') {
    transContent = JSON.parse(transContent);
  }

  const transParas: unknown[] = transContent?.paragraphs || (Array.isArray(transContent) ? transContent : []);

  console.log(`  Current translation paragraphs: ${transParas.length}`);

  // Examine translation paragraph 0
  const trans0 = extractText(transParas[0]);
  console.log(`  Translation [0] preview: "${trans0.substring(0, 200)}..."`);

  // Check if para 0 contains the biographical metadata
  if (trans0.includes('Abirami Bhattar') && trans0.includes('Sarabhoji')) {
    console.log('  → Found biographical metadata in translation paragraph 0');

    // The metadata runs until we get to the actual poem translation
    // Looking at the content: "The "Abirami Ammai Pathigam" composed by Abirami Bhattar..."
    // The actual translation should start with something about the poem content

    // Let's check if the metadata can be trimmed from paragraph 0
    // The actual poem translation should start after the biographical intro
    // Looking at the source [0], it's the காப்பு (invocation)

    // Find where the actual translation starts
    // The metadata is about "Abirami Bhattar belonged to... composed..."
    // The poem translation should talk about the actual content

    // Check for patterns that indicate the start of the poem translation
    const poemStartPatterns = [
      'Your thick, dark tresses', // This is paragraph 1 content
      'thick, dark tresses',
      'dark tresses',
    ];

    let metadataEnd = -1;

    // Check if para 0 has both metadata AND poem content, or just metadata
    for (const pattern of poemStartPatterns) {
      const idx = trans0.indexOf(pattern);
      if (idx !== -1) {
        metadataEnd = idx;
        break;
      }
    }

    if (metadataEnd > 0) {
      // Paragraph 0 contains both metadata and poem - trim the metadata
      console.log(`  → Splitting paragraph 0 at position ${metadataEnd}`);
      const cleanedPara0 = trans0.substring(metadataEnd).trim();

      const newParas: Paragraph[] = [
        { text: cleanedPara0, index: 0 },
        ...transParas.slice(1).map((p, i) => ({
          text: extractText(p),
          index: i + 1
        }))
      ];

      const newContent = { paragraphs: newParas };
      await sql`
        UPDATE translation_versions
        SET content = ${JSON.stringify(newContent)}::jsonb
        WHERE id = ${row.version_id}
      `;
      console.log(`  ✓ Fixed translation paragraph 0 (trimmed metadata)`);
    } else {
      // Paragraph 0 is ENTIRELY metadata - remove it
      console.log('  → Paragraph 0 is entirely metadata - removing it');

      // But wait, if we remove para 0, we'll have 22 translation paragraphs for 23 source paragraphs
      // Let me check what para 1 looks like
      const trans1 = extractText(transParas[1]);
      console.log(`  Translation [1] preview: "${trans1.substring(0, 100)}..."`);

      // If trans1 is the actual poem start, then we can remove trans0
      // and trans1 becomes new trans0

      const newParas: Paragraph[] = transParas.slice(1).map((p, i) => ({
        text: extractText(p),
        index: i
      }));

      console.log(`  New paragraph count: ${newParas.length}`);

      // Check alignment with source
      let sourceContent = row.source_content;
      if (typeof sourceContent === 'string') {
        sourceContent = JSON.parse(sourceContent);
      }
      const sourceParas = sourceContent?.paragraphs || [];
      console.log(`  Source paragraph count: ${sourceParas.length}`);

      if (newParas.length === sourceParas.length) {
        const newContent = { paragraphs: newParas };
        await sql`
          UPDATE translation_versions
          SET content = ${JSON.stringify(newContent)}::jsonb
          WHERE id = ${row.version_id}
        `;
        console.log(`  ✓ Removed metadata paragraph, counts now aligned`);
      } else {
        console.log(`  ⚠️ Paragraph count mismatch after fix: source ${sourceParas.length}, trans ${newParas.length}`);
        console.log('  → Not updating, needs manual review');
      }
    }
  } else {
    console.log('  → No biographical metadata found in paragraph 0');
  }
}

async function fixVeeramaamunivar() {
  console.log('\n=== FIXING VEERAMAAMUNIVAR-KALAMBAKAM ===\n');

  const rows = await sql`
    SELECT
      c.id as chapter_id,
      c.source_content,
      tv.id as version_id,
      tv.content as translation_content
    FROM chapters c
    JOIN texts t ON c.text_id = t.id
    LEFT JOIN translations tr ON tr.chapter_id = c.id
    LEFT JOIN translation_versions tv ON tr.current_version_id = tv.id
    WHERE t.slug = 'veeramaamunivar-kalambakam' AND c.slug = 'chapter-1'
  `;

  if (rows.length === 0) {
    console.log('  Chapter not found');
    return;
  }

  const row = rows[0];
  let sourceContent = row.source_content;
  let transContent = row.translation_content;

  if (typeof sourceContent === 'string') {
    sourceContent = JSON.parse(sourceContent);
  }
  if (typeof transContent === 'string') {
    transContent = JSON.parse(transContent);
  }

  const sourceParas: unknown[] = sourceContent?.paragraphs || [];
  const transParas: unknown[] = transContent?.paragraphs || [];

  console.log(`  Source paragraphs: ${sourceParas.length}`);
  console.log(`  Translation paragraphs: ${transParas.length}`);

  // Check first 3 translation paragraphs
  console.log('\n  Current translation structure:');
  for (let i = 0; i < Math.min(5, transParas.length); i++) {
    const text = extractText(transParas[i]);
    console.log(`  [${i}]: "${text.substring(0, 80).replace(/\n/g, ' ')}..."`);
  }

  // Identify garbage paragraphs
  const trans0 = extractText(transParas[0]);
  const trans1 = extractText(transParas[1]);
  const trans2 = extractText(transParas[2]);

  const is0Garbage = trans0.includes('Tiruchirappalli') || trans0.includes('Table of Contents');
  const is1Garbage = trans1.includes('Editorial Note') || trans1.includes('Kuram');
  const is2Poem = trans2.startsWith('1.') || trans2.includes('Not considering');

  console.log(`\n  Analysis:`);
  console.log(`  - Trans [0] is garbage: ${is0Garbage}`);
  console.log(`  - Trans [1] is garbage: ${is1Garbage}`);
  console.log(`  - Trans [2] is poem start: ${is2Poem}`);

  if (is0Garbage && is1Garbage && is2Poem) {
    console.log('\n  → Removing translation paragraphs 0-1');

    // Now, source [0] is "கடவுள் வாழ்த்து..." (God's blessing)
    // source [1] is "1. பிறந்திட்ட..." (numbered verse 1)
    // trans [2] is "1. Not considering..." (translation of source [1])

    // So we need to:
    // 1. Either add a translation for source [0], OR
    // 2. Remove source [0] if it wasn't meant to be there

    // Looking at source [0]: "கடவுள் வாழ்த்து பாவெடுத்துத் தந்தவனே! பார்புகழும் நாயகனே!..."
    // This is the "God's praise" invocation verse - it SHOULD be there

    // But since we don't have a translation for it, we need to either:
    // A) Create a placeholder translation
    // B) Skip source [0] from display

    // For now, let's remove the garbage and create a placeholder for source [0]
    const newParas: Paragraph[] = [
      { text: '[Invocation to Lord Ganesha - கடவுள் வாழ்த்து]', index: 0 },
      ...transParas.slice(2).map((p, i) => ({
        text: extractText(p),
        index: i + 1
      }))
    ];

    console.log(`  → New paragraph count: ${newParas.length}`);
    console.log(`  → Source paragraph count: ${sourceParas.length}`);

    if (newParas.length === sourceParas.length) {
      const newContent = { paragraphs: newParas };
      await sql`
        UPDATE translation_versions
        SET content = ${JSON.stringify(newContent)}::jsonb
        WHERE id = ${row.version_id}
      `;
      console.log(`  ✓ Fixed translation - removed garbage, added placeholder for invocation`);
    } else {
      console.log(`  ⚠️ Paragraph count mismatch: source ${sourceParas.length}, new trans ${newParas.length}`);

      // Let's try just removing the 2 garbage paragraphs
      const altParas: Paragraph[] = transParas.slice(2).map((p, i) => ({
        text: extractText(p),
        index: i
      }));

      console.log(`  → Alternative: just remove garbage (${altParas.length} paragraphs)`);

      // If still mismatch, show the alignment issue
      console.log(`  → Source [0]: "${extractText(sourceParas[0]).substring(0, 60)}..."`);
      console.log(`  → Source [1]: "${extractText(sourceParas[1]).substring(0, 60)}..."`);
      console.log(`  → New Trans [0]: "${altParas[0]?.text.substring(0, 60)}..."`);
    }
  } else {
    console.log('  → Unexpected structure, needs manual review');
  }
}

async function main() {
  console.log('=== THOROUGH TAMIL FIX SCRIPT ===');
  console.log('Date:', new Date().toISOString());

  try {
    await fixAbhiramiPathigam();
    await fixVeeramaamunivar();

    console.log('\n=== FIXES COMPLETE ===');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
