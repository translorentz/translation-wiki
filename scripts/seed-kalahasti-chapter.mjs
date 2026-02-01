import { readFileSync } from 'fs';
import postgres from 'postgres';

const merged = JSON.parse(readFileSync('/Users/bryancheong/claude_projects/translation-wiki/data/processed/sri-kalahasteeswara-satakam/chapter-001-merged.json', 'utf8'));

const sql = postgres(process.env.DATABASE_URL);

const sourceContent = JSON.stringify(merged.sourceContent.paragraphs.map(p => p.text));

const result = await sql`
  INSERT INTO chapters (text_id, chapter_number, title, slug, source_content, ordering)
  VALUES (152, 1, ${merged.title}, 'chapter-1', ${sourceContent}::jsonb, 1)
  ON CONFLICT DO NOTHING
  RETURNING id, title
`;
console.log('Inserted:', result);

const verify = await sql`SELECT id, title, char_length(source_content::text) as len FROM chapters WHERE text_id = 152`;
console.log('Verify:', verify);

await sql.end();
