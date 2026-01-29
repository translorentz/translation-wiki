/**
 * Trial translation tester for Epitome Vol 3 evaluation
 * Sends sample paragraphs to DeepSeek and checks for gibberish
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

function getRandomParagraphs(n: number, seed: number): { chapter: number; index: number; text: string }[] {
  // Simple seeded random
  let s = seed;
  const random = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  const allParagraphs: { chapter: number; index: number; text: string }[] = [];

  for (let ch = 13; ch <= 18; ch++) {
    const filepath = path.join(CLEAN_DIR, `chapter-${ch.toString().padStart(3, '0')}.json`);
    if (!fs.existsSync(filepath)) continue;

    const data: ChapterData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    for (const para of data.sourceContent.paragraphs) {
      allParagraphs.push({
        chapter: ch,
        index: para.index,
        text: para.text,
      });
    }
  }

  // Shuffle and take n
  for (let i = allParagraphs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [allParagraphs[i], allParagraphs[j]] = [allParagraphs[j], allParagraphs[i]];
  }

  return allParagraphs.slice(0, n);
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

function checkTranslationQuality(translation: string): { hasIssues: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for untranslated sigla
  const siglaPatterns = ['Rwp', 'Dwp', 'RwpJDi', 'CDi', 'Owp', 'Bwp', 'wwp', 'AEDwwp'];
  for (const sig of siglaPatterns) {
    if (translation.toLowerCase().includes(sig.toLowerCase())) {
      issues.push(`Untranslated sigla: ${sig}`);
    }
  }

  // Check for Latin editorial terms translated literally
  const latinTerms = ['subscript', 'omisso', 'omissis', 'constanter', 'transponit', 'typotheta'];
  for (const term of latinTerms) {
    if (translation.toLowerCase().includes(term.toLowerCase())) {
      issues.push(`Latin apparatus term: ${term}`);
    }
  }

  // Check for obvious gibberish markers
  const gibberishMarkers = ['[?]', '???', 'unintelligible', 'unclear', 'corrupted'];
  for (const marker of gibberishMarkers) {
    if (translation.toLowerCase().includes(marker.toLowerCase())) {
      issues.push(`Gibberish marker: ${marker}`);
    }
  }

  return {
    hasIssues: issues.length > 0,
    issues,
  };
}

async function main() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('Error: DEEPSEEK_API_KEY not set');
    process.exit(1);
  }

  const n = parseInt(process.argv[2] || '5', 10);
  const seed = parseInt(process.argv[3] || '42', 10);

  const client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey,
  });

  const paragraphs = getRandomParagraphs(n, seed);

  console.log(`=== TRIAL TRANSLATION TEST (${n} paragraphs, seed=${seed}) ===\n`);

  let cleanCount = 0;
  let problematicCount = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    console.log(`--- Test ${i + 1}: Chapter ${para.chapter}, Para ${para.index} ---`);
    console.log(`Source: ${para.text.slice(0, 200)}...`);

    try {
      const translation = await translateText(client, para.text.slice(0, 1500));
      console.log(`Translation: ${translation.slice(0, 300)}...`);

      const quality = checkTranslationQuality(translation);
      console.log(`Quality: ${quality.hasIssues ? 'PROBLEMATIC' : 'CLEAN'}`);
      if (quality.issues.length > 0) {
        console.log(`Issues: ${quality.issues.join(', ')}`);
        problematicCount++;
      } else {
        cleanCount++;
      }
    } catch (error: any) {
      console.log(`Error: ${error.message}`);
      problematicCount++;
    }

    console.log();

    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  const cleanRate = (cleanCount / paragraphs.length) * 100;
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total tested: ${paragraphs.length}`);
  console.log(`Clean translations: ${cleanCount} (${cleanRate.toFixed(1)}%)`);
  console.log(`Problematic: ${problematicCount}`);

  process.exit(problematicCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
