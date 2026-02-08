/**
 * Thorough examination of abhirami-pathigam and veeramaamunivar-kalambakam
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

function extractText(para: unknown): string {
  if (typeof para === 'string') return para;
  if (para && typeof para === 'object' && 'text' in (para as object)) {
    return (para as { text: string }).text;
  }
  return '';
}

async function checkText(textSlug: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`=== ${textSlug.toUpperCase()} ===`);
  console.log(`${'='.repeat(60)}\n`);

  const rows = await sql`
    SELECT
      c.id as chapter_id,
      c.slug as chapter_slug,
      c.source_content,
      tv.id as version_id,
      tv.content as translation_content
    FROM chapters c
    JOIN texts t ON c.text_id = t.id
    LEFT JOIN translations tr ON tr.chapter_id = c.id
    LEFT JOIN translation_versions tv ON tr.current_version_id = tv.id
    WHERE t.slug = ${textSlug}
    ORDER BY c.slug
  `;

  if (rows.length === 0) {
    console.log('No chapters found');
    return;
  }

  for (const row of rows) {
    console.log(`\n--- Chapter: ${row.chapter_slug} ---\n`);

    let sourceContent = row.source_content;
    let transContent = row.translation_content;

    if (typeof sourceContent === 'string') {
      try {
        sourceContent = JSON.parse(sourceContent);
      } catch {
        console.log('  ERROR: Could not parse source_content');
        continue;
      }
    }

    if (typeof transContent === 'string') {
      try {
        transContent = JSON.parse(transContent);
      } catch {
        console.log('  ERROR: Could not parse translation_content');
      }
    }

    const sourceParas: unknown[] = sourceContent?.paragraphs || (Array.isArray(sourceContent) ? sourceContent : []);
    const transParas: unknown[] = transContent?.paragraphs || (Array.isArray(transContent) ? transContent : []);

    console.log(`Source paragraphs: ${sourceParas.length}`);
    console.log(`Translation paragraphs: ${transParas.length}`);

    if (sourceParas.length !== transParas.length) {
      console.log(`  ⚠️ MISMATCH: Source has ${sourceParas.length}, Translation has ${transParas.length}`);
    }

    // Show first 3 source paragraphs
    console.log('\n📝 SOURCE - FIRST 3 PARAGRAPHS:');
    for (let i = 0; i < Math.min(3, sourceParas.length); i++) {
      const text = extractText(sourceParas[i]);
      console.log(`  [${i}]: "${text.substring(0, 150).replace(/\n/g, ' ')}..."`);
    }

    // Show last 3 source paragraphs
    console.log('\n📝 SOURCE - LAST 3 PARAGRAPHS:');
    for (let i = Math.max(0, sourceParas.length - 3); i < sourceParas.length; i++) {
      const text = extractText(sourceParas[i]);
      console.log(`  [${i}]: "${text.substring(0, 150).replace(/\n/g, ' ')}..."`);
    }

    // Show first 3 translation paragraphs
    console.log('\n🌐 TRANSLATION - FIRST 3 PARAGRAPHS:');
    for (let i = 0; i < Math.min(3, transParas.length); i++) {
      const text = extractText(transParas[i]);
      console.log(`  [${i}]: "${text.substring(0, 150).replace(/\n/g, ' ')}..."`);
    }

    // Show last 3 translation paragraphs
    console.log('\n🌐 TRANSLATION - LAST 3 PARAGRAPHS:');
    for (let i = Math.max(0, transParas.length - 3); i < transParas.length; i++) {
      const text = extractText(transParas[i]);
      console.log(`  [${i}]: "${text.substring(0, 150).replace(/\n/g, ' ')}..."`);
    }

    // Scan for contamination
    console.log('\n🔍 CONTAMINATION SCAN:');
    const patterns: Array<[RegExp, string]> = [
      [/Source:/i, 'Source:'],
      [/\b(19|20)\d{2}\b/, 'Year'],
      [/விலை|ரூ\.?/, 'Price'],
      [/பதிப்புரை|அணிந்துரை/, 'Publisher preface'],
      [/This webpage|last revised|Copyright/i, 'Web footer'],
      [/அச்சுக்கூடம்|பதிப்பகம்|நூலகம்|கழகம்/, 'Publisher'],
      [/Press|Printed|Reserved|Thompson|Minerva/i, 'English publisher'],
      [/Table of Contents|Foreword|Editorial/i, 'Front matter'],
      [/முகவுரை/, 'Introduction/Foreword'],
    ];

    let foundContamination = false;

    for (let i = 0; i < sourceParas.length; i++) {
      const text = extractText(sourceParas[i]);
      for (const [pattern, name] of patterns) {
        if (pattern.test(text)) {
          console.log(`  SOURCE [${i}] - ${name}: "${text.substring(0, 80).replace(/\n/g, ' ')}..."`);
          foundContamination = true;
        }
      }
    }

    for (let i = 0; i < transParas.length; i++) {
      const text = extractText(transParas[i]);
      for (const [pattern, name] of patterns) {
        if (pattern.test(text)) {
          console.log(`  TRANS [${i}] - ${name}: "${text.substring(0, 80).replace(/\n/g, ' ')}..."`);
          foundContamination = true;
        }
      }
    }

    if (!foundContamination) {
      console.log('  ✅ No contamination patterns detected');
    }
  }
}

async function main() {
  console.log('=== THOROUGH TAMIL TEXT EXAMINATION ===');
  console.log('Date:', new Date().toISOString());

  await checkText('abhirami-pathigam');
  await checkText('veeramaamunivar-kalambakam');
  await checkText('kandimathiyammai-pillaitamil');

  console.log('\n\n=== EXAMINATION COMPLETE ===');
  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
