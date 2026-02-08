/**
 * Fix abhirami-pathigam translation paragraph 0
 *
 * Problem: Trans[0] contains biographical metadata about Abirami Bhattar,
 * NOT a translation of Source[0] (the காப்பு invocation).
 *
 * Solution: Replace Trans[0] with a placeholder/translation of the invocation
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

async function main() {
  console.log('=== FIXING ABHIRAMI-PATHIGAM TRANSLATION ===\n');

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
    console.log('Chapter not found');
    process.exit(1);
  }

  const row = rows[0];
  let sourceContent = row.source_content;
  let transContent = row.translation_content;

  if (typeof sourceContent === 'string') sourceContent = JSON.parse(sourceContent);
  if (typeof transContent === 'string') transContent = JSON.parse(transContent);

  const sourceParas: unknown[] = sourceContent?.paragraphs || [];
  const transParas: unknown[] = transContent?.paragraphs || [];

  console.log(`Source paragraphs: ${sourceParas.length}`);
  console.log(`Translation paragraphs: ${transParas.length}`);

  // The translation of the invocation (காப்பு)
  // Source[0] is: காப்பு (Invocation) + நூல் (The Poem)
  // It contains:
  // - Praise to Ganesha for blessing the Tamil verses
  // - A list of blessings requested (unfading knowledge, unwavering youth, etc.)
  // - Reference to the sister of Vishnu (Lakshmi) and Abirami

  const invocationTranslation = `Invocation (Kāppu)

To offer this garland of pure Tamil verses, we praise the feet of the three-musth, four-tusked, five-handed one—that in the feet of golden Abirami of Kadavur, praised daily by devotees, we may find refuge.

The Poem (Nūl)

Unfading learning, undiminishing age, friendship without deceit, wealth that does not wane, youth that does not diminish, a body free from mortal disease, an unwavering mind, a wife whose love does not depart, offspring who do not fail, fame that does not decline, words that do not change, generosity without obstacles, wealth that does not dwindle, a sceptre that does not bend, a life without any sorrow, and love at your pure feet—grant these, and unite me with your great devotees.

O sister of He who takes cosmic sleep upon the sea of waves! O life of ancient Kadavur! O Sukhapani, who never parts from the half of the Lord Amudesar! O gracious one! O Abhirami! (1)`;

  // Replace paragraph 0 with the proper translation
  const newParas: Paragraph[] = [
    { text: invocationTranslation, index: 0 },
    ...transParas.slice(1).map((p, i) => ({
      text: extractText(p),
      index: i + 1
    }))
  ];

  console.log(`\nNew paragraph count: ${newParas.length}`);

  if (newParas.length === sourceParas.length) {
    const newContent = { paragraphs: newParas };
    await sql`
      UPDATE translation_versions
      SET content = ${JSON.stringify(newContent)}::jsonb
      WHERE id = ${row.version_id}
    `;
    console.log('✓ Fixed abhirami-pathigam translation paragraph 0');
    console.log('  → Replaced biographical metadata with invocation translation');
  } else {
    console.log('⚠️ Paragraph count mismatch - not updating');
  }

  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
