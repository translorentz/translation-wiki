/**
 * Delete all Carmina data from database (translations and chapters)
 * This is a cleanup script for reprocessing.
 */

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
      process.env.DATABASE_URL = match[1].replace(/^['"]|['"]$/g, '');
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  console.log('=== Deleting Carmina Data ===\n');

  // 1. Get chapter IDs for Carmina
  const chapters = await sql`
    SELECT c.id, c.chapter_number
    FROM chapters c
    JOIN texts t ON c.text_id = t.id
    WHERE t.slug = 'gregory-carmina'
    ORDER BY c.chapter_number
  `;

  console.log(`Found ${chapters.length} chapters to delete`);

  if (chapters.length === 0) {
    console.log('No chapters found. Exiting.');
    await sql.end();
    return;
  }

  const chapterIds = chapters.map(c => c.id);

  // 2. Get translation IDs for these chapters
  const translations = await sql`
    SELECT id FROM translations WHERE chapter_id = ANY(${chapterIds}::integer[])
  `;
  const translationIds = translations.map(t => t.id);
  console.log(`Found ${translationIds.length} translations`);

  // 3. Delete translation_versions for these translations
  if (translationIds.length > 0) {
    console.log('Deleting translation_versions...');
    await sql`
      DELETE FROM translation_versions
      WHERE translation_id = ANY(${translationIds}::integer[])
    `;
  }

  // 4. Delete translations for these chapters
  console.log('Deleting translations...');
  await sql`
    DELETE FROM translations
    WHERE chapter_id = ANY(${chapterIds}::integer[])
  `;

  // 5. Delete chapters
  console.log('Deleting chapters...');
  await sql`
    DELETE FROM chapters
    WHERE id = ANY(${chapterIds}::integer[])
  `;
  console.log(`Deleted ${chapters.length} chapters`);

  console.log('\n=== Complete ===');
  console.log('Carmina data removed from database.');
  console.log('Ready for reprocessing.');

  await sql.end();
}

main().catch(console.error);
