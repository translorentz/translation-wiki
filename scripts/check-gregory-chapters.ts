import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^DATABASE_URL=(.+)$/);
  if (match) process.env.DATABASE_URL = match[1].replace(/^['"]|['"]$/g, '');
}

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  // First check what authors exist with "gregory" in the name
  const authors = await sql`
    SELECT id, slug, name FROM authors WHERE slug LIKE '%gregory%' OR name ILIKE '%gregory%'
  `;
  console.log('Authors matching "gregory":');
  for (const a of authors) {
    console.log(`  ID: ${a.id}, Slug: ${a.slug}, Name: ${a.name}`);
  }

  // Now check all texts for those authors
  if (authors.length > 0) {
    const authorIds = authors.map(a => a.id);
    const result = await sql`
      SELECT t.slug, t.title, COUNT(c.id) as chapter_count
      FROM texts t
      LEFT JOIN chapters c ON t.id = c.text_id
      WHERE t.author_id = ANY(${authorIds}::integer[])
      GROUP BY t.id, t.slug, t.title
      ORDER BY t.slug
    `;

    console.log('\nGregory texts in database:');
    for (const r of result) {
      console.log(`  ${r.slug}: ${r.chapter_count} chapters`);
    }
  }

  await sql.end();
}
main();
