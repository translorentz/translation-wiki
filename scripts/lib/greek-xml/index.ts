/**
 * Greek XML (TEI/EpiDoc) processing pipeline.
 *
 * Parses First1KGreek TEI-XML files into structured chapter JSON files
 * suitable for database seeding and display in the translation wiki.
 *
 * Pipeline:
 *   1. tei-parser: Parse XML structure, extract metadata and divisions
 *   2. text-extractor: Clean Greek text, strip markup
 *   3. chapter-splitter: Flatten division hierarchy into chapters
 *   4. validator: Quality-check output
 *
 * Usage:
 *   import { processGreekXml } from './lib/greek-xml';
 *   const result = processGreekXml(xmlContent, config);
 */

export { parseTeiXml } from './tei-parser';
export { cleanGreekText, getGreekCharPercent, hasApparatusRemnants } from './text-extractor';
export { splitIntoChapters } from './chapter-splitter';
export { validateChapter, validateAllChapters, printValidationReport } from './validator';
export * from './types';
