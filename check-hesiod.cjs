const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  if (line.startsWith('#') || line.trim() === '') continue;
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1) continue;
  const key = line.substring(0, eqIdx);
  let val = line.substring(eqIdx + 1).replace(/^'|'$/g, '');
  if (key === 'DATABASE_URL' && val.includes('neon')) {
    env[key] = val;
  } else if (key !== 'DATABASE_URL') {
    env[key] = val;
  }
}

async function main() {
  const postgres = require('postgres');
  const sql = postgres(env.DATABASE_URL);

  // Check text
  const texts = await sql`SELECT id, title, slug, total_chapters FROM texts WHERE slug = 'hesiod-theogony-exegesis'`;
  console.log('Text:', texts[0]);

  if (texts.length > 0) {
    // Check chapters count
    const chapters = await sql`SELECT COUNT(*) as count FROM chapters WHERE text_id = ${texts[0].id}`;
    console.log('Chapters in DB:', chapters[0].count);

    // Check if any translations exist
    const translations = await sql`
      SELECT COUNT(*) as count FROM translations t
      JOIN chapters c ON t.chapter_id = c.id
      WHERE c.text_id = ${texts[0].id}
    `;
    console.log('Translations in DB:', translations[0].count);
  }

  await sql.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
