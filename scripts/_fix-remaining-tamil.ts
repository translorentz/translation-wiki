/**
 * Fix remaining 6 Tamil texts with alignment issues
 *
 * All have extra front matter paragraphs in translations that need removal:
 * 1. angayarkanni-malai: Trans[0] = front matter about prabandha types
 * 2. kurukuturai-kalambakam: Trans[0-7] = publisher info, acknowledgements
 * 3. perur-mummani-kovai: Trans[0] = source info
 * 4. seyur-murugan-pillaitamil: Trans[0] = publisher info
 * 5. thanigai-kalambakam: Trans[0] = source/editor info
 * 6. tiruchendur-murugan-pillaitamil: Trans[0] = source/table of contents
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

async function fixText(textSlug: string, removeCount: number, placeholderText?: string) {
  console.log(`\n=== Fixing ${textSlug} ===`);

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
    WHERE t.slug = ${textSlug} AND c.slug = 'chapter-1'
  `;

  if (rows.length === 0 || !rows[0].version_id) {
    console.log('  Chapter or translation not found');
    return;
  }

  const row = rows[0];
  let sourceContent = row.source_content;
  let transContent = row.translation_content;

  if (typeof sourceContent === 'string') sourceContent = JSON.parse(sourceContent);
  if (typeof transContent === 'string') transContent = JSON.parse(transContent);

  const sourceParas: unknown[] = sourceContent?.paragraphs || [];
  const transParas: unknown[] = transContent?.paragraphs || [];

  console.log(`  Before: Source ${sourceParas.length}, Translation ${transParas.length}`);
  console.log(`  Removing ${removeCount} paragraph(s) from translation`);

  // Build new paragraphs array
  let newParas: Paragraph[];

  if (placeholderText) {
    // Add placeholder for source[0], then keep remaining translations
    newParas = [
      { text: placeholderText, index: 0 },
      ...transParas.slice(removeCount).map((p, i) => ({
        text: extractText(p),
        index: i + 1
      }))
    ];
  } else {
    // Just remove the front matter
    newParas = transParas.slice(removeCount).map((p, i) => ({
      text: extractText(p),
      index: i
    }));
  }

  console.log(`  After: ${newParas.length} paragraphs`);

  if (newParas.length === sourceParas.length) {
    const newContent = { paragraphs: newParas };
    await sql`
      UPDATE translation_versions
      SET content = ${JSON.stringify(newContent)}::jsonb
      WHERE id = ${row.version_id}
    `;
    console.log(`  ✓ Fixed ${textSlug} - ${sourceParas.length}/${newParas.length} aligned`);
  } else {
    console.log(`  ⚠️ Count mismatch: source ${sourceParas.length}, new trans ${newParas.length}`);
    console.log(`  → NOT updating, needs manual review`);
  }
}

async function main() {
  console.log('=== FIXING REMAINING TAMIL TEXTS ===');
  console.log('Date:', new Date().toISOString());

  // 1. angayarkanni-malai: Remove 1 paragraph
  await fixText('angayarkanni-malai', 1);

  // 2. kurukuturai-kalambakam: Remove 8 paragraphs (front matter, publisher info, etc.)
  await fixText('kurukuturai-kalambakam', 8);

  // 3. perur-mummani-kovai: Remove 1 paragraph
  await fixText('perur-mummani-kovai', 1);

  // 4. seyur-murugan-pillaitamil: Remove 1 paragraph
  await fixText('seyur-murugan-pillaitamil', 1);

  // 5. thanigai-kalambakam: Remove 1 paragraph
  await fixText('thanigai-kalambakam', 1);

  // 6. tiruchendur-murugan-pillaitamil: Remove 1 paragraph
  await fixText('tiruchendur-murugan-pillaitamil', 1);

  console.log('\n=== FIXES COMPLETE ===');
  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
