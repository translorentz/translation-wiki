/**
 * Core TEI-XML parser for First1KGreek EpiDoc files.
 * Uses fast-xml-parser to parse XML, then traverses the parsed
 * object to extract structural divisions and text content.
 */

import { XMLParser } from 'fast-xml-parser';
import type { TextMetadata, TextDivision, DivisionLevel } from './types';

/** Options for fast-xml-parser that preserve the TEI structure */
const PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  // Preserve whitespace in text content
  trimValues: false,
  // Parse CDATA if present
  cdataPropName: '__cdata',
  // Don't collapse single-element arrays -- we always want arrays for divs
  isArray: (name: string) => {
    return ['div', 'p', 'note', 'bibl', 'head', 'pb', 'lb'].includes(name);
  },
  // Preserve order is not needed; we navigate by structure
  preserveOrder: false,
  // Handle namespaces by stripping them (TEI namespace)
  removeNSPrefix: true,
};

/**
 * Parse a TEI-XML string into a structured representation.
 */
export function parseTeiXml(xmlContent: string): {
  metadata: TextMetadata;
  divisions: TextDivision[];
} {
  const parser = new XMLParser(PARSER_OPTIONS);
  const parsed = parser.parse(xmlContent);

  const tei = parsed.TEI;
  if (!tei) {
    throw new Error('No <TEI> root element found');
  }

  const metadata = extractMetadata(tei);
  const divisions = extractDivisions(tei);

  return { metadata, divisions };
}

/**
 * Extract metadata from the TEI header.
 */
function extractMetadata(tei: any): TextMetadata {
  const header = tei.teiHeader;
  if (!header) {
    return {
      title: 'Unknown',
      author: 'Unknown',
      editor: 'Unknown',
      date: 'Unknown',
      urn: 'Unknown',
      language: 'grc',
    };
  }

  const fileDesc = header.fileDesc || {};
  const titleStmt = fileDesc.titleStmt || {};
  const sourceDesc = fileDesc.sourceDesc || {};

  // Extract title
  let title = 'Unknown';
  if (titleStmt.title) {
    title = extractTextContent(titleStmt.title);
  }

  // Extract author
  let author = 'Unknown';
  if (titleStmt.author) {
    author = extractTextContent(titleStmt.author);
  }

  // Extract editor
  let editor = 'Unknown';
  if (titleStmt.editor) {
    editor = extractTextContent(titleStmt.editor);
  }

  // Extract date from source description
  let date = 'Unknown';
  const biblStruct = findNested(sourceDesc, 'biblStruct');
  if (biblStruct) {
    const imprint = findNested(biblStruct, 'imprint');
    if (imprint && imprint.date) {
      date = extractTextContent(imprint.date);
    }
  }

  // Extract URN from the edition div
  const body = tei.text?.body;
  let urn = 'Unknown';
  if (body) {
    const editionDiv = findEditionDiv(body);
    if (editionDiv && editionDiv['@_n']) {
      urn = editionDiv['@_n'];
    }
  }

  // Extract language
  const profileDesc = header.profileDesc || {};
  let language = 'grc';
  if (profileDesc.langUsage?.language) {
    const langs = Array.isArray(profileDesc.langUsage.language)
      ? profileDesc.langUsage.language
      : [profileDesc.langUsage.language];
    const grcLang = langs.find((l: any) => (l['@_ident'] || '') === 'grc');
    if (grcLang) language = 'grc';
  }

  // Try to get source URL
  let sourceUrl: string | undefined;
  if (biblStruct) {
    const ref = biblStruct.ref;
    if (ref && ref['@_target']) {
      sourceUrl = ref['@_target'];
    }
  }

  return { title, author, editor, date, urn, language, sourceUrl };
}

/**
 * Extract text divisions from the body of the TEI document.
 * Handles the hierarchy: edition > book > chapter > section
 */
function extractDivisions(tei: any): TextDivision[] {
  const body = tei.text?.body;
  if (!body) {
    throw new Error('No <text><body> found in TEI document');
  }

  const editionDiv = findEditionDiv(body);
  if (!editionDiv) {
    throw new Error('No <div type="edition"> found');
  }

  // The edition div contains the top-level textpart divs
  return extractDivsRecursive(editionDiv);
}

/**
 * Find the <div type="edition"> within the body.
 */
function findEditionDiv(body: any): any {
  const divs = normalizeArray(body.div);
  for (const div of divs) {
    if (div['@_type'] === 'edition') {
      return div;
    }
  }
  // Sometimes the body itself acts as the edition container
  if (body['@_type'] === 'edition') {
    return body;
  }
  return null;
}

/**
 * Recursively extract div elements, building the TextDivision tree.
 */
function extractDivsRecursive(parentDiv: any): TextDivision[] {
  const results: TextDivision[] = [];
  const childDivs = normalizeArray(parentDiv.div);

  for (const div of childDivs) {
    if (div['@_type'] !== 'textpart') continue;

    const subtype = (div['@_subtype'] || 'unknown') as DivisionLevel;
    const n = div['@_n'] || '?';

    // Skip index/table-of-contents divs
    if (subtype === ('index' as any)) continue;

    // Check if this div has child textpart divs
    const childTextparts = normalizeArray(div.div).filter(
      (d: any) => d['@_type'] === 'textpart'
    );

    let children: TextDivision[] = [];
    let paragraphs: string[] = [];

    if (childTextparts.length > 0) {
      // This div has child divisions, recurse
      children = extractDivsRecursive(div);
    }

    // Also extract any direct paragraph content at this level
    paragraphs = extractParagraphsFromDiv(div);

    results.push({
      level: subtype,
      n,
      children,
      paragraphs,
    });
  }

  return results;
}

/**
 * Extract paragraph text content from a div element.
 * Handles <p> elements, stripping inline markup.
 */
function extractParagraphsFromDiv(div: any): string[] {
  const paragraphs: string[] = [];
  const pElements = normalizeArray(div.p);

  for (const p of pElements) {
    const text = extractDeepText(p).trim();
    if (text) {
      paragraphs.push(text);
    }
  }

  return paragraphs;
}

/**
 * Extract all text content from a node, recursively.
 * Strips all markup (notes, bibl references, page/line breaks).
 */
function extractDeepText(node: any): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);

  let text = '';

  // Handle text node
  if (node['#text'] !== undefined) {
    text += String(node['#text']);
  }

  // Skip <note> elements entirely (apparatus criticus, biblical refs)
  // Skip <pb> and <lb> (page/line breaks -- milestone elements)

  // Process child elements in order
  for (const key of Object.keys(node)) {
    if (key.startsWith('@_') || key === '#text') continue;

    // Skip notes, page breaks, line breaks
    if (key === 'note' || key === 'pb' || key === 'lb') continue;

    // Skip head elements within paragraphs (usually section headers)
    if (key === 'head') continue;

    // For bibl elements within notes, already skipped via note
    if (key === 'bibl') continue;

    // Skip <supplied> elements -- editorial additions to fill lacunae.
    // With preserveOrder=false, their text gets misplaced (appended at end).
    // The transmitted text without editorial gap-fillers is complete enough
    // for reading and translation purposes.
    if (key === 'supplied') continue;

    // Skip <gap> elements -- indicate lacunae (empty milestone elements)
    if (key === 'gap') continue;

    // Skip <del> elements -- editorially deleted text.
    // With preserveOrder=false, their content gets misplaced (appended at end).
    // Deleted text should not appear in the final reading text.
    if (key === 'del') continue;

    const children = normalizeArray(node[key]);
    for (const child of children) {
      text += extractDeepText(child);
    }
  }

  return text;
}

/**
 * Extract simple text content from a node (for metadata fields).
 * Less aggressive than extractDeepText -- just gets string value.
 */
function extractTextContent(node: any): string {
  if (typeof node === 'string') return node.trim();
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    return node.map(extractTextContent).join('; ');
  }
  if (node && typeof node === 'object') {
    if (node['#text'] !== undefined) return String(node['#text']).trim();
    // Try to get text from any child
    for (const key of Object.keys(node)) {
      if (!key.startsWith('@_')) {
        const result = extractTextContent(node[key]);
        if (result) return result;
      }
    }
  }
  return '';
}

/**
 * Normalize a value to an array. Handles undefined, single values, and arrays.
 */
function normalizeArray(val: any): any[] {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

/**
 * Find a nested property by name, searching recursively.
 */
function findNested(obj: any, name: string): any {
  if (!obj || typeof obj !== 'object') return null;
  if (obj[name]) return obj[name];
  for (const key of Object.keys(obj)) {
    if (key.startsWith('@_')) continue;
    const result = findNested(obj[key], name);
    if (result) return result;
  }
  return null;
}
