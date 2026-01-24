/**
 * Process TEI-XML Greek texts into chapter JSON files.
 *
 * Usage:
 *   pnpm tsx scripts/process-greek-xml.ts [filename]
 *
 * If no filename is given, processes all .xml files in data/greek_xml/.
 * Outputs:
 *   - data/raw/<slug>/chapter-NNN.txt (plain Greek text, one file per chapter)
 *   - data/processed/<slug>/chapter-NNN.json (structured JSON for DB seeding)
 *
 * Examples:
 *   pnpm tsx scripts/process-greek-xml.ts tlg0646.tlg004.1st1K-grc1.xml
 *   pnpm tsx scripts/process-greek-xml.ts  # processes all
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  parseTeiXml,
  splitIntoChapters,
  validateAllChapters,
  printValidationReport,
  TEXT_CONFIGS,
} from './lib/greek-xml';
import type { ParsedChapter, ChapterConfig } from './lib/greek-xml/types';

const XML_DIR = path.resolve(__dirname, '../data/greek_xml');
const RAW_DIR = path.resolve(__dirname, '../data/raw');
const PROCESSED_DIR = path.resolve(__dirname, '../data/processed');

/**
 * Extract TLG identifier from filename.
 * e.g., "tlg0646.tlg004.1st1K-grc1.xml" -> "tlg0646.tlg004"
 */
function extractTlgId(filename: string): string {
  const match = filename.match(/^(tlg\d+\.tlg\d+)/);
  return match ? match[1] : filename.replace('.xml', '');
}

/**
 * Process a single XML file.
 */
function processFile(filePath: string): void {
  const filename = path.basename(filePath);
  const tlgId = extractTlgId(filename);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${filename}`);
  console.log(`TLG ID: ${tlgId}`);
  console.log('='.repeat(60));

  // Read XML content
  const xmlContent = fs.readFileSync(filePath, 'utf-8');
  console.log(`  File size: ${(xmlContent.length / 1024).toFixed(1)} KB`);

  // Get configuration for this text
  const textConfig = TEXT_CONFIGS[tlgId];
  if (!textConfig) {
    console.error(`  ERROR: No configuration found for TLG ID "${tlgId}"`);
    console.error(`  Known texts: ${Object.keys(TEXT_CONFIGS).join(', ')}`);
    return;
  }

  console.log(`  Text: ${textConfig.title}`);
  console.log(`  Author: ${textConfig.authorName}`);
  console.log(`  Slug: ${textConfig.slug}`);

  // Parse the TEI-XML
  console.log('\n  Parsing XML...');
  const { metadata, divisions } = parseTeiXml(xmlContent);
  console.log(`  Metadata: title="${metadata.title}", author="${metadata.author}"`);
  console.log(`  URN: ${metadata.urn}`);
  console.log(`  Top-level divisions: ${divisions.length}`);

  // Show division structure
  console.log('\n  Division structure:');
  for (const div of divisions.slice(0, 5)) {
    const childCount = div.children.length;
    const paragraphCount = div.paragraphs.length;
    console.log(`    ${div.level} n="${div.n}": ${childCount} children, ${paragraphCount} direct paragraphs`);
    if (div.children.length > 0) {
      for (const child of div.children.slice(0, 3)) {
        console.log(`      ${child.level} n="${child.n}": ${child.children.length} children, ${child.paragraphs.length} paragraphs`);
      }
      if (div.children.length > 3) {
        console.log(`      ... (${div.children.length - 3} more)`);
      }
    }
  }
  if (divisions.length > 5) {
    console.log(`    ... (${divisions.length - 5} more top-level divisions)`);
  }

  // Split into chapters
  console.log('\n  Splitting into chapters...');
  const chapters = splitIntoChapters(divisions, textConfig.chapterConfig);
  console.log(`  Result: ${chapters.length} chapters`);

  if (chapters.length === 0) {
    console.error('  ERROR: No chapters produced!');
    return;
  }

  // Validate
  console.log('\n  Validating...');
  const { reports, summary } = validateAllChapters(chapters);
  printValidationReport(reports, summary);

  // Write output files
  console.log('\n  Writing output files...');
  writeOutputFiles(chapters, textConfig.slug);

  // Print sample of first chapter
  console.log('\n  Sample (first chapter, first 3 paragraphs):');
  const firstChapter = chapters[0];
  console.log(`  Title: "${firstChapter.title}"`);
  for (const p of firstChapter.sourceContent.paragraphs.slice(0, 3)) {
    const preview = p.text.slice(0, 100) + (p.text.length > 100 ? '...' : '');
    console.log(`    [${p.index}] ${preview}`);
  }
}

/**
 * Write chapter files to raw/ and processed/ directories.
 */
function writeOutputFiles(chapters: ParsedChapter[], slug: string): void {
  const rawDir = path.join(RAW_DIR, slug);
  const processedDir = path.join(PROCESSED_DIR, slug);

  // Create directories
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(processedDir, { recursive: true });

  for (const chapter of chapters) {
    const paddedNum = String(chapter.chapterNumber).padStart(3, '0');

    // Write raw text file
    const rawContent = chapter.sourceContent.paragraphs
      .map(p => p.text)
      .join('\n\n');
    fs.writeFileSync(path.join(rawDir, `chapter-${paddedNum}.txt`), rawContent, 'utf-8');

    // Write processed JSON file
    const jsonContent = JSON.stringify(
      {
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        sourceContent: chapter.sourceContent,
      },
      null,
      2
    );
    fs.writeFileSync(path.join(processedDir, `chapter-${paddedNum}.json`), jsonContent, 'utf-8');
  }

  console.log(`  Wrote ${chapters.length} files to ${rawDir}`);
  console.log(`  Wrote ${chapters.length} files to ${processedDir}`);
}

// ---- Main ----

function main(): void {
  const args = process.argv.slice(2);

  let filesToProcess: string[];

  if (args.length > 0) {
    // Process specific file(s)
    filesToProcess = args.map(arg => {
      const fullPath = path.isAbsolute(arg) ? arg : path.join(XML_DIR, arg);
      if (!fs.existsSync(fullPath)) {
        console.error(`File not found: ${fullPath}`);
        process.exit(1);
      }
      return fullPath;
    });
  } else {
    // Process all XML files in the directory
    if (!fs.existsSync(XML_DIR)) {
      console.error(`XML directory not found: ${XML_DIR}`);
      process.exit(1);
    }
    filesToProcess = fs.readdirSync(XML_DIR)
      .filter(f => f.endsWith('.xml'))
      .sort()
      .map(f => path.join(XML_DIR, f));
  }

  console.log(`\nGreek XML Processing Pipeline`);
  console.log(`Files to process: ${filesToProcess.length}`);

  for (const file of filesToProcess) {
    try {
      processFile(file);
    } catch (err) {
      console.error(`\nERROR processing ${path.basename(file)}:`);
      console.error(err);
    }
  }

  console.log('\n\nDone.');
}

main();
