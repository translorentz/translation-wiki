/**
 * Test SPECIFIC paragraphs that were flagged as contaminated
 */

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

const CLEAN_DIR = path.join(__dirname, '../../../data/processed/epitome-of-histories-clean');

interface Paragraph {
  index: number;
  text: string;
}

interface ChapterData {
  chapterNumber: number;
  sourceContent: {
    paragraphs: Paragraph[];
  };
}

// Paragraphs flagged by contamination detector
const FLAGGED = [
  { chapter: 13, para: 1 },   // Ówi9, page marker
  { chapter: 13, para: 8 },   // omissis
  { chapter: 13, para: 19 },  // ACE,
  { chapter: 14, para: 4 },   // OwpDi
  { chapter: 14, para: 7 },   // zaod
  { chapter: 14, para: 12 },  // xdi, W MI
  { chapter: 15, para: 5 },   // Rwp, Bswp
  { chapter: 15, para: 24 },  // AEDwwp
  { chapter: 15, para: 39 },  // D HI
  { chapter: 16, para: 3 },   // ARwp
];

function getParagraph(chapter: number, index: number): string | null {
  const filepath = path.join(CLEAN_DIR, `chapter-${chapter.toString().padStart(3, '0')}.json`);
  if (!fs.existsSync(filepath)) return null;

  const data: ChapterData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  const para = data.sourceContent.paragraphs.find(p => p.index === index);
  return para?.text || null;
}

async function translateText(client: OpenAI, text: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{
      role: 'user',
      content: `Translate this Byzantine Greek text to English. Provide only the translation, no explanations:\n\n${text}`,
    }],
    max_tokens: 2000,
    temperature: 0.3,
  });
  return response.choices[0]?.message?.content || '';
}

async function main() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('Error: DEEPSEEK_API_KEY not set');
    process.exit(1);
  }

  const client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey,
  });

  console.log(`=== TESTING FLAGGED CONTAMINATED PARAGRAPHS ===\n`);

  for (const item of FLAGGED) {
    const text = getParagraph(item.chapter, item.para);
    if (!text) {
      console.log(`Chapter ${item.chapter}, Para ${item.para}: NOT FOUND\n`);
      continue;
    }

    console.log(`--- Chapter ${item.chapter}, Para ${item.para} ---`);
    console.log(`Source (first 400 chars):\n${text.slice(0, 400)}\n`);

    try {
      const translation = await translateText(client, text.slice(0, 1500));
      console.log(`Translation (first 400 chars):\n${translation.slice(0, 400)}\n`);

      // Check for specific issues
      const issues: string[] = [];
      if (/rwp|dwp|owp|bwp|cdI/i.test(translation)) issues.push('Sigla in translation');
      if (/omissis|subscript|constanter/i.test(translation)) issues.push('Latin apparatus');
      if (/\?\?\?|unintelligible|corrupted/i.test(translation)) issues.push('Gibberish marker');

      if (issues.length > 0) {
        console.log(`ISSUES: ${issues.join(', ')}`);
      } else {
        console.log('TRANSLATION: Clean (no apparatus leakage detected)');
      }
    } catch (error: any) {
      console.log(`Error: ${error.message}`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Delay
    await new Promise(r => setTimeout(r, 1500));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
