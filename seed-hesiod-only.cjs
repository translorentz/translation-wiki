const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
let dbUrl;
for (const line of envContent.split('\n')) {
  if (line.startsWith('DATABASE_URL') && line.includes('neon')) {
    dbUrl = line.substring(line.indexOf('=') + 1).replace(/^'|'$/g, '');
  }
}

async function main() {
  const postgres = require('postgres');
  const sql = postgres(dbUrl);

  // Get the text ID
  const texts = await sql`SELECT id FROM texts WHERE slug = 'hesiod-theogony-exegesis'`;
  if (texts.length === 0) {
    console.error('Text not found in database');
    await sql.end();
    process.exit(1);
  }
  const textId = texts[0].id;
  console.log('Text ID:', textId);

  // Check existing chapters
  const existing = await sql`SELECT chapter_number FROM chapters WHERE text_id = ${textId}`;
  const existingNums = new Set(existing.map(r => r.chapter_number));
  console.log('Existing chapters:', existingNums.size);

  // Read all chapter files
  const processedDir = path.join(__dirname, 'data/processed/hesiod-theogony-exegesis');
  const files = fs.readdirSync(processedDir)
    .filter(f => f.startsWith('chapter-') && f.endsWith('.json'))
    .sort();

  console.log('Chapter files found:', files.length);

  let inserted = 0;
  let skipped = 0;

  for (const file of files) {
    const chapter = JSON.parse(fs.readFileSync(path.join(processedDir, file), 'utf8'));

    if (existingNums.has(chapter.chapterNumber)) {
      skipped++;
      continue;
    }

    const chapterSlug = 'chapter-' + chapter.chapterNumber;

    await sql`
      INSERT INTO chapters (text_id, chapter_number, slug, title, source_content, ordering)
      VALUES (${textId}, ${chapter.chapterNumber}, ${chapterSlug}, ${chapter.title}, ${JSON.stringify(chapter.sourceContent)}, ${chapter.chapterNumber})
    `;

    inserted++;
    if (inserted % 10 === 0) {
      console.log('  Inserted', inserted, 'chapters...');
    }
  }

  // Update total_chapters
  await sql`UPDATE texts SET total_chapters = ${files.length} WHERE id = ${textId}`;

  console.log('Done. Inserted:', inserted, 'Skipped:', skipped);
  console.log('Total chapters set to:', files.length);

  await sql.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
