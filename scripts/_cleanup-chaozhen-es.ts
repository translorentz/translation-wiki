import postgres from 'postgres';
import fs from 'fs';

async function main() {
  const env = fs.readFileSync('.env.local', 'utf-8');
  const line = env.split('\n').find((l) => !l.startsWith('#') && l.startsWith('DATABASE_URL'))!;
  const url = line.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  const sql = postgres(url);

  // Find the chapter
  const [ch] = await sql`
    SELECT c.id FROM chapters c
    JOIN texts t ON t.id = c.text_id
    WHERE t.slug = 'chaozhen-fayuan-chanhui-wen' AND c.chapter_number = 1
  `;
  console.log('Chapter id:', ch?.id);

  if (ch?.id) {
    // Find the translation row
    const [tr] = await sql`
      SELECT id, current_version_id FROM translations
      WHERE chapter_id = ${ch.id} AND target_language = 'es'
    `;
    console.log('Translation row:', tr);

    if (tr?.id) {
      // Null out current_version_id first to clear FK constraint
      await sql`UPDATE translations SET current_version_id = NULL WHERE id = ${tr.id}`;

      // Delete all translation_versions for this translation
      const versions = await sql`
        DELETE FROM translation_versions WHERE translation_id = ${tr.id} RETURNING id
      `;
      console.log('Deleted versions:', versions.length);

      // Delete any endorsements referencing this translation (if table exists)
      try {
        await sql`DELETE FROM endorsements WHERE translation_id = ${tr.id}`;
      } catch (e) {
        // ignore — table may not exist or no rows
      }

      // Delete the translation row
      await sql`DELETE FROM translations WHERE id = ${tr.id}`;
      console.log('Deleted translation row');
    }
  }

  // Verify gone
  const check = await sql`
    SELECT COUNT(*)::int as n FROM translations tr
    JOIN chapters c ON c.id = tr.chapter_id
    JOIN texts t ON t.id = c.text_id
    WHERE t.slug = 'chaozhen-fayuan-chanhui-wen' AND c.chapter_number = 1 AND tr.target_language = 'es'
  `;
  console.log('After cleanup, row count:', check[0].n, '(expect 0)');

  await sql.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
