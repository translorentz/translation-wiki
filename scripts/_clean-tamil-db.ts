/**
 * Clean Tamil texts in database - Remove publisher/extraneous content
 *
 * Target texts identified by database check:
 * 1. abhirami-pathigam - Remove last paragraph (website footer)
 * 2. kandimathiyammai-pillaitamil - Remove para 0, trim para 1 from beginning, trim last para from end
 * 3. veeramaamunivar-kalambakam - Split off front matter from para 0
 * 4. suguna-sundari - Delete chapter-0 (front matter) per User request
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

interface SourceContent {
  paragraphs: Paragraph[];
}

async function getChapterData(textSlug: string, chapterSlug: string) {
  const rows = await sql`
    SELECT c.id, c.source_content
    FROM chapters c
    JOIN texts t ON c.text_id = t.id
    WHERE t.slug = ${textSlug} AND c.slug = ${chapterSlug}
  `;

  if (rows.length === 0) {
    return null;
  }

  let sourceContent = rows[0].source_content;

  // Parse if it's a string
  if (typeof sourceContent === 'string') {
    sourceContent = JSON.parse(sourceContent);
  }

  return {
    chapterId: rows[0].id as number,
    sourceContent: sourceContent as SourceContent,
  };
}

async function updateChapterSource(chapterId: number, newParagraphs: Paragraph[]) {
  const newContent = { paragraphs: newParagraphs };

  await sql`
    UPDATE chapters
    SET source_content = ${JSON.stringify(newContent)}::jsonb
    WHERE id = ${chapterId}
  `;

  console.log(`  Updated chapter ${chapterId} with ${newParagraphs.length} paragraphs`);
}

async function cleanAbhiramiPathigam() {
  console.log('\n=== Cleaning abhirami-pathigam ===');

  const data = await getChapterData('abhirami-pathigam', 'chapter-1');
  if (!data) {
    console.log('  Chapter not found, skipping');
    return;
  }

  const { chapterId, sourceContent } = data;
  const paragraphs = sourceContent.paragraphs;

  console.log(`  Current: ${paragraphs.length} paragraphs`);

  const lastPara = paragraphs[paragraphs.length - 1].text;
  console.log(`  Last para ends with: "${lastPara.substring(lastPara.length - 100)}"`);

  // Check for website footer
  if (lastPara.includes('This webpage was last revised') || lastPara.includes('2021')) {
    console.log('  → Found website footer in last paragraph');

    // Trim the footer from the last paragraph instead of removing it entirely
    const footerStart = lastPara.indexOf('------------');
    if (footerStart > -1) {
      const cleanedLast = lastPara.substring(0, footerStart).trim();
      const newParagraphs = [
        ...paragraphs.slice(0, -1),
        { text: cleanedLast, index: paragraphs.length - 1 }
      ].map((p, i) => ({ text: p.text, index: i }));

      await updateChapterSource(chapterId, newParagraphs);

      // Also update translation_versions if exists
      const translations = await sql`
        SELECT t.id as trans_id, tv.id as version_id, tv.content
        FROM translations t
        JOIN translation_versions tv ON t.current_version_id = tv.id
        WHERE t.chapter_id = ${chapterId}
      `;

      for (const trans of translations) {
        let content = trans.content;
        if (typeof content === 'string') content = JSON.parse(content);

        // content is { paragraphs: [{ index, text }] }
        const paras = content?.paragraphs || content;
        if (Array.isArray(paras) && paras.length > 0) {
          const lastPara = paras[paras.length - 1];
          const lastText = typeof lastPara === 'string' ? lastPara : lastPara?.text;

          if (typeof lastText === 'string') {
            // Find and remove footer from translation too
            const footerPatterns = ['This webpage', 'last revised', '------------'];
            let cleanedTrans = lastText;
            for (const pattern of footerPatterns) {
              const idx = cleanedTrans.indexOf(pattern);
              if (idx > -1) {
                cleanedTrans = cleanedTrans.substring(0, idx).trim();
              }
            }

            // Update the last paragraph
            const newParas = [...paras.slice(0, -1)];
            if (typeof lastPara === 'string') {
              newParas.push(cleanedTrans);
            } else {
              newParas.push({ ...lastPara, text: cleanedTrans });
            }

            const newContent = content?.paragraphs ? { paragraphs: newParas } : newParas;

            await sql`
              UPDATE translation_versions SET content = ${JSON.stringify(newContent)}::jsonb WHERE id = ${trans.version_id}
            `;
            console.log(`  Updated translation_version ${trans.version_id}`);
          }
        }
      }

      console.log('  ✓ Cleaned abhirami-pathigam');
    } else {
      console.log('  → Footer marker not found, skipping');
    }
  } else {
    console.log('  → Last paragraph seems clean, skipping');
  }
}

async function cleanKandimathiyammai() {
  console.log('\n=== Cleaning kandimathiyammai-pillaitamil ===');

  const data = await getChapterData('kandimathiyammai-pillaitamil', 'chapter-1');
  if (!data) {
    console.log('  Chapter not found, skipping');
    return;
  }

  const { chapterId, sourceContent } = data;
  const paragraphs = sourceContent.paragraphs;

  console.log(`  Current: ${paragraphs.length} paragraphs`);

  const para0 = paragraphs[0].text;
  const para1 = paragraphs[1].text;
  const lastPara = paragraphs[paragraphs.length - 1].text;

  // Check contamination
  const needsCleaning = para0.includes('பிரபந்தத்திரட்டு') ||
    para1.includes('Source:') ||
    lastPara.includes('This file was last revised');

  if (!needsCleaning) {
    console.log('  → Text seems clean, skipping');
    return;
  }

  console.log('  → Found contamination, cleaning...');

  // 1. Find where actual text starts in para1 (at பாயிரம்)
  const payiramIdx = para1.indexOf('பாயிரம்');
  console.log(`  → பாயிரம் found at index ${payiramIdx} in para 1`);

  // 2. Clean last paragraph - remove footer
  let cleanedLast = lastPara;
  const footerPatterns = ['* இந்நூல், சென்ற', 'This file was last revised', 'T⁭his file'];
  for (const pattern of footerPatterns) {
    const idx = cleanedLast.indexOf(pattern);
    if (idx > -1) {
      cleanedLast = cleanedLast.substring(0, idx).trim();
      console.log(`  → Trimmed footer from last paragraph`);
    }
  }

  // 3. Build new paragraphs array
  const newParagraphs: Paragraph[] = [];

  // First paragraph becomes trimmed para1 (from பாயிரம் onwards)
  if (payiramIdx > -1) {
    newParagraphs.push({ text: para1.substring(payiramIdx), index: 0 });
  } else {
    // Fallback: skip both para 0 and 1 entirely
    console.log('  → WARNING: Could not find பாயிரம், skipping para 0 and 1');
  }

  // Add middle paragraphs (2 to n-1)
  for (let i = 2; i < paragraphs.length - 1; i++) {
    newParagraphs.push({ text: paragraphs[i].text, index: newParagraphs.length });
  }

  // Add cleaned last paragraph
  newParagraphs.push({ text: cleanedLast, index: newParagraphs.length });

  console.log(`  → New paragraph count: ${newParagraphs.length} (was ${paragraphs.length})`);

  await updateChapterSource(chapterId, newParagraphs);

  // Update translation_versions - remove para 0, trim para 1 beginning, trim last para end
  const translations = await sql`
    SELECT t.id as trans_id, tv.id as version_id, tv.content
    FROM translations t
    JOIN translation_versions tv ON t.current_version_id = tv.id
    WHERE t.chapter_id = ${chapterId}
  `;

  for (const trans of translations) {
    let content = trans.content;
    if (typeof content === 'string') content = JSON.parse(content);

    // content is { paragraphs: [{ index, text }] } or just array
    const paras = content?.paragraphs || content;
    if (!Array.isArray(paras)) continue;

    const oldLen = paras.length;
    const trimRatio = payiramIdx > -1 ? payiramIdx / para1.length : 0;

    const newParas: Array<{text: string, index: number}> = [];

    // First element: trim beginning based on ratio (from old para 1)
    if (paras[1]) {
      const oldText = typeof paras[1] === 'string' ? paras[1] : paras[1].text;
      const cutPoint = Math.floor(oldText.length * trimRatio);
      newParas.push({ text: oldText.substring(cutPoint), index: 0 });
    }

    // Middle elements (2 to n-2)
    for (let i = 2; i < paras.length - 1; i++) {
      const oldText = typeof paras[i] === 'string' ? paras[i] : paras[i].text;
      newParas.push({ text: oldText, index: newParas.length });
    }

    // Last element: trim footer if present
    if (paras[paras.length - 1]) {
      let lastText = typeof paras[paras.length - 1] === 'string' ? paras[paras.length - 1] : paras[paras.length - 1].text;
      const footerPhrases = ['This publication', 'This file', 'last revised'];
      for (const phrase of footerPhrases) {
        const idx = lastText.toLowerCase().indexOf(phrase.toLowerCase());
        if (idx > -1) {
          lastText = lastText.substring(0, idx).trim();
        }
      }
      newParas.push({ text: lastText, index: newParas.length });
    }

    const newContent = { paragraphs: newParas };

    await sql`
      UPDATE translation_versions SET content = ${JSON.stringify(newContent)}::jsonb WHERE id = ${trans.version_id}
    `;
    console.log(`  Updated translation_version ${trans.version_id}: ${oldLen} → ${newParas.length} paragraphs`);
  }

  console.log('  ✓ Cleaned kandimathiyammai-pillaitamil');
}

async function cleanVeeramaamunivar() {
  console.log('\n=== Cleaning veeramaamunivar-kalambakam ===');

  const data = await getChapterData('veeramaamunivar-kalambakam', 'chapter-1');
  if (!data) {
    console.log('  Chapter not found, skipping');
    return;
  }

  const { chapterId, sourceContent } = data;
  const paragraphs = sourceContent.paragraphs;

  console.log(`  Current: ${paragraphs.length} paragraphs`);

  const para0 = paragraphs[0].text;

  if (!para0.includes('பதிப்புரை') && !para0.includes('அணிந்துரை')) {
    console.log('  → First paragraph seems clean, skipping');
    return;
  }

  console.log('  → Found front matter in paragraph 0');

  // Find where actual text starts
  const textMarkers = ['1. கடவுள் வாழ்த்து', 'கடவுள் வாழ்த்து'];
  let splitPoint = -1;

  for (const marker of textMarkers) {
    const idx = para0.indexOf(marker);
    if (idx !== -1) {
      splitPoint = idx;
      console.log(`  → Found text start marker "${marker}" at position ${idx}`);
      break;
    }
  }

  if (splitPoint <= 0) {
    console.log('  → Could not find text start marker, needs manual review');
    return;
  }

  const actualText = para0.substring(splitPoint);
  const removedChars = splitPoint;
  console.log(`  → Removing ${removedChars} chars of front matter, keeping ${actualText.length} chars`);

  const newParagraphs = [
    { text: actualText, index: 0 },
    ...paragraphs.slice(1).map((p, i) => ({ text: p.text, index: i + 1 }))
  ];

  await updateChapterSource(chapterId, newParagraphs);

  // Update translation_versions
  const translations = await sql`
    SELECT t.id as trans_id, tv.id as version_id, tv.content
    FROM translations t
    JOIN translation_versions tv ON t.current_version_id = tv.id
    WHERE t.chapter_id = ${chapterId}
  `;

  for (const trans of translations) {
    let content = trans.content;
    if (typeof content === 'string') content = JSON.parse(content);

    const paras = content?.paragraphs || content;
    if (!Array.isArray(paras) || paras.length === 0) continue;

    const firstPara = paras[0];
    const firstText = typeof firstPara === 'string' ? firstPara : firstPara?.text;

    if (typeof firstText === 'string') {
      const removalRatio = removedChars / para0.length;
      const cutPoint = Math.floor(firstText.length * removalRatio);
      const newFirstText = firstText.substring(cutPoint);

      const newParas = [
        { text: newFirstText, index: 0 },
        ...paras.slice(1).map((p: unknown, i: number) => ({
          text: typeof p === 'string' ? p : (p as {text: string}).text,
          index: i + 1
        }))
      ];

      const newContent = { paragraphs: newParas };

      await sql`
        UPDATE translation_versions SET content = ${JSON.stringify(newContent)}::jsonb WHERE id = ${trans.version_id}
      `;
      console.log(`  Updated translation_version ${trans.version_id}: first para trimmed by ${cutPoint} chars`);
    }
  }

  console.log('  ✓ Cleaned veeramaamunivar-kalambakam');
}

async function deleteSugunaSundariFrontMatter() {
  console.log('\n=== Deleting suguna-sundari chapter-0 (front matter) ===');

  // Get chapter-0
  const rows = await sql`
    SELECT c.id
    FROM chapters c
    JOIN texts t ON c.text_id = t.id
    WHERE t.slug = 'suguna-sundari' AND c.slug = 'chapter-0'
  `;

  if (rows.length === 0) {
    console.log('  Chapter-0 not found, skipping');
    return;
  }

  const chapterId = rows[0].id;

  // Delete translations first
  await sql`DELETE FROM translations WHERE chapter_id = ${chapterId}`;
  console.log('  Deleted translations for chapter-0');

  // Delete the chapter
  await sql`DELETE FROM chapters WHERE id = ${chapterId}`;
  console.log('  Deleted chapter-0');

  console.log('  ✓ Removed suguna-sundari front matter chapter');
}

async function main() {
  console.log('=== Tamil Database Cleaning Script ===');
  console.log('Checking and cleaning contaminated texts...\n');

  try {
    await cleanAbhiramiPathigam();
    await cleanKandimathiyammai();
    await cleanVeeramaamunivar();
    await deleteSugunaSundariFrontMatter();

    console.log('\n=== Cleaning Complete ===');
    console.log('Run verification script to confirm changes.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
