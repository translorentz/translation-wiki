/**
 * Cleanup patterns for Diarium Urbis Romae reconciliation
 * 
 * These patterns are applied to Agent A's output to remove remaining OCR artifacts,
 * scholarly apparatus markers, and page headers.
 */

export interface CleanupPattern {
  name: string;
  description: string;
  pattern: RegExp;
  replacement: string;
  priority: number;  // Lower = earlier
}

// Page header patterns (P0 priority)
export const PAGE_HEADER_PATTERNS: CleanupPattern[] = [
  {
    name: 'garbled-page-header-1',
    description: 'Remove [l^6l] DIARIA RERUM ROMANARUM. 6$ style headers',
    pattern: /^\s*\[l\^[0-9]+l?\]\s*DIARIA RERUM ROMANARUM\.\s*[0-9$]+\s*$/gm,
    replacement: '',
    priority: 0,
  },
  {
    name: 'page-header-year-prefix',
    description: 'Remove [1493] DIARIA RERUM ROMANARUM. 293 style headers',
    pattern: /^\s*\[\d{4}[J]?\s*DIARIA RERUM ROMANARUM\.\s*\d+\s*$/gm,
    replacement: '',
    priority: 0,
  },
  {
    name: 'page-header-j-prefix',
    description: 'Remove JI478] DIARIA RERUM ROMANARUM. 83 style headers (J before year)',
    pattern: /^\s*J?I?\d{3,4}\]?\s*DIARIA RERUM ROMANARUM\.\s*\d+\s*$/gm,
    replacement: '',
    priority: 0,
  },
  {
    name: 'plain-page-header',
    description: 'Remove 76] DIARIA RERUM ROMANARUM. 81 style headers',
    pattern: /^\s*\d+\]\s*DIARIA RERUM ROMANARUM\.\s*\d+\s*$/gm,
    replacement: '',
    priority: 0,
  },
  {
    name: 'stephani-infessurae-header',
    description: 'Remove STEPHANI INFESSURAE page headers',
    pattern: /^\s*STEPHANI\s+INFESSURAE.*$/gm,
    replacement: '',
    priority: 0,
  },
  {
    name: 'bracketed-page-header',
    description: 'Remove any DIARIA RERUM ROMANARUM header pattern',
    pattern: /^.*DIARIA RERUM ROMANARUM\.\s*\d+\s*$/gm,
    replacement: '',
    priority: 0,
  },
];

// Caret and pipe patterns (P0 priority)
export const CARET_PIPE_PATTERNS: CleanupPattern[] = [
  {
    name: 'triple-caret',
    description: 'Remove ^^^ at line start (apparatus marker)',
    pattern: /^\s*\^\^\^\s*/gm,
    replacement: '',
    priority: 0,
  },
  {
    name: 'double-caret-inline',
    description: 'Remove ^^ inline markers',
    pattern: /\s*\^\^\s*/g,
    replacement: ' ',
    priority: 0,
  },
  {
    name: 'word-caret-superscript',
    description: 'Remove ^ attached to end of words (superscript reference)',
    pattern: /(\w)\^(?=[,;.\s]|$)/g,
    replacement: '$1',
    priority: 0,
  },
  {
    name: 'caret-before-number',
    description: 'Remove caret before numbers (garbled superscripts)',
    pattern: /\^(\d)/g,
    replacement: '$1',
    priority: 0,
  },
  {
    name: 'caret-paren-marker',
    description: 'Remove ^*) and similar footnote reference patterns',
    pattern: /\^\*?\)/g,
    replacement: '',
    priority: 0,
  },
  {
    name: 'caret-quote-paren',
    description: 'Remove ^quote paren patterns like ^\')',
    pattern: /\^[\'\"]\)/g,
    replacement: '',
    priority: 0,
  },
  {
    name: 'caret-quote-quote-paren',
    description: 'Remove ^quote quote paren patterns',
    pattern: /\^\'\'\)/g,
    replacement: '',
    priority: 0,
  },
  {
    name: 'caret-i-backslash',
    description: 'Remove ^i\\ patterns',
    pattern: /\^\'\S?\\\s*/g,
    replacement: ' ',
    priority: 0,
  },
  {
    name: 'caret-asterisk',
    description: 'Remove ^* patterns',
    pattern: /\^\*/g,
    replacement: '',
    priority: 0,
  },
  {
    name: 'single-caret-standalone',
    description: 'Remove standalone ^ at word boundaries',
    pattern: /\s+\^\s+/g,
    replacement: ' ',
    priority: 0,
  },
  {
    name: 'sigla-caret',
    description: 'Remove manuscript sigla with carets like R^ S^ C^',
    pattern: /\s*[RSCEOMFAN][12\^\'\`]+\s*/g,
    replacement: ' ',
    priority: 0,
  },
  {
    name: 'pipe-line-break',
    description: 'Remove || double pipes (column separators)',
    pattern: /\s*\|\|\s*/g,
    replacement: ' ',
    priority: 0,
  },
  {
    name: 'single-pipe',
    description: 'Remove | single pipes (column boundaries)',
    pattern: /\s*\|\s*/g,
    replacement: ' ',
    priority: 1,
  },
  {
    name: 'angle-bracket-caret',
    description: 'Remove <^- 9 patterns',
    pattern: /<\^[\-\s]*\d+\s*[»>]?/g,
    replacement: '',
    priority: 1,
  },
  {
    name: 'angle-bracket-quote',
    description: 'Remove <^- patterns with quotes',
    pattern: /<\^\.\s*\d+\s*/g,
    replacement: '',
    priority: 1,
  },
];

// Aggressive cleanup patterns for remaining artifacts
export const AGGRESSIVE_PATTERNS: CleanupPattern[] = [
  {
    name: 'any-remaining-caret-marker',
    description: 'Remove any remaining carets with surrounding markers',
    pattern: /[\'\"\`]?\^[\'\"\`\*\d]*[\)\]\\]?/g,
    replacement: '',
    priority: 3,
  },
  {
    name: 'garbled-ocr-blocks',
    description: 'Remove garbled OCR blocks with special chars and carets',
    pattern: /[i\|\'\"\/\\]+\^[^\s]*/g,
    replacement: '',
    priority: 3,
  },
  {
    name: 'j-bracket-remnants',
    description: 'Remove j] patterns from OCR',
    pattern: /\s*j\]\s*/g,
    replacement: ' ',
    priority: 3,
  },
  {
    name: 'ms-sigla-slash',
    description: 'Remove 3/ patterns (manuscript sigla)',
    pattern: /\s*\d\/\s+/g,
    replacement: ' ',
    priority: 3,
  },
  {
    name: 'scattered-slashes',
    description: 'Remove standalone // patterns',
    pattern: /\s*\'?\/\/\s*/g,
    replacement: ' ',
    priority: 3,
  },
  {
    name: 'h-bracket-remnants',
    description: 'Remove H remnants from apparatus',
    pattern: /\s*H\s+poveri\s*/g,
    replacement: ' poveri ',
    priority: 3,
  },
  {
    name: 'io-remnant',
    description: 'Remove io remnant at line boundary',
    pattern: /\s+io$/gm,
    replacement: '',
    priority: 3,
  },
  {
    name: 'scattered-s-pattern',
    description: 'Remove S Die patterns',
    pattern: /\s*S Die\s+\d+\s*/g,
    replacement: ' ',
    priority: 3,
  },
  {
    name: 'al-in-pattern',
    description: 'Remove A/ in patterns',
    pattern: /\s*A\/\s+in\s*/g,
    replacement: ' in ',
    priority: 3,
  },
];

// Inline marker patterns (P1 priority)
export const INLINE_MARKER_PATTERNS: CleanupPattern[] = [
  {
    name: 'w-line-start',
    description: 'Remove W at line start (witness marker)',
    pattern: /^W\s+(?=[A-Za-z])/gm,
    replacement: '',
    priority: 1,
  },
  {
    name: 'w-standalone',
    description: 'Remove standalone W before text',
    pattern: /^W\s+/gm,
    replacement: '',
    priority: 1,
  },
  {
    name: 'parenthetical-caret',
    description: 'Remove (-^^ and similar parenthetical carets',
    pattern: /\s*\(-?\^+\s*/g,
    replacement: ' ',
    priority: 1,
  },
  {
    name: 'parenthetical-quote',
    description: "Remove (' and similar",
    pattern: /\s*\('\^?\s*/g,
    replacement: ' ',
    priority: 1,
  },
  {
    name: 'zero-paren',
    description: 'Remove 0) and O) markers',
    pattern: /\s*[0O]\)\s*/g,
    replacement: ' ',
    priority: 1,
  },
  {
    name: 'superscript-markers',
    description: 'Remove (degree, diamond, asterisk, caret, quote, dash followed by optional paren',
    pattern: /\s*\([°♦\*\^\'\-]+[>)]*\s*/g,
    replacement: ' ',
    priority: 1,
  },
  {
    name: 'folio-markers-inline',
    description: 'Remove c. XXX B style folio markers inline',
    pattern: /\s*c\.\s*\d+\s*[ABab]\s*/g,
    replacement: ' ',
    priority: 1,
  },
  {
    name: 'numbered-apparatus',
    description: 'Remove (i), (1), etc. inline apparatus references',
    pattern: /\s*\([i1-9]\)\s*/g,
    replacement: ' ',
    priority: 1,
  },
  {
    name: 'empty-parens',
    description: 'Remove empty parentheses ()',
    pattern: /\s*\(\)\s*/g,
    replacement: ' ',
    priority: 1,
  },
  {
    name: 'p-reference',
    description: 'Remove (p) witness markers',
    pattern: /\s*\(p\)\s*/g,
    replacement: ' ',
    priority: 1,
  },
  {
    name: 'bracket-numbers',
    description: 'Remove [123] page number references',
    pattern: /\s*\[\d+\]\s*/g,
    replacement: ' ',
    priority: 1,
  },
  {
    name: 'zero-standalone',
    description: 'Remove standalone 0 at line start (section marker)',
    pattern: /^0\s+(?=[A-Z])/gm,
    replacement: '',
    priority: 1,
  },
  {
    name: 'dagger-cross',
    description: 'Remove dagger/cross markers',
    pattern: /\s*-J-\s*/g,
    replacement: ' ',
    priority: 1,
  },
  {
    name: 'double-dash-caret',
    description: 'Remove --^ markers',
    pattern: /\s*--\^\s*/g,
    replacement: ' ',
    priority: 1,
  },
];

// Scholarly apparatus leaks (P1-P2 priority)
export const APPARATUS_PATTERNS: CleanupPattern[] = [
  {
    name: 'cf-reference',
    description: 'Remove (i)Cf. apparatus lines',
    pattern: /^\s*\([i1]\)\s*Cf\..*$/gm,
    replacement: '',
    priority: 1,
  },
  {
    name: 'scrive-solo',
    description: 'Remove "scrive solo:" apparatus notes inline',
    pattern: /\s*scrive solo:.*?(?=[A-Z]|$)/g,
    replacement: ' ',
    priority: 2,
  },
  {
    name: 'aggiunge-marker',
    description: 'Remove "aggiunge" apparatus notes',
    pattern: /\s*aggiunge(?:\s+in\s+mar[g]?)?:?.*?(?=[A-Z]|$)/gi,
    replacement: ' ',
    priority: 2,
  },
  {
    name: 'gregorovius-leak',
    description: 'Remove Gregorovius citations',
    pattern: /\s*Gregorovius.*?(?=\.|$)/g,
    replacement: '',
    priority: 2,
  },
  {
    name: 'witness-sigla',
    description: 'Remove witness sigla inline (C1 C2 S1 E M etc)',
    pattern: /\s*[CSEM][12\^]+\s*/g,
    replacement: ' ',
    priority: 2,
  },
  {
    name: 'apparatus-readings',
    description: 'Remove apparatus variant readings like "per conastavile quattro R^"',
    pattern: /\s+per\s+\w+\s+\w+\s+[RSCEOM][^\s]*\s*/g,
    replacement: ' ',
    priority: 2,
  },
];

// Whitespace normalization (applied last)
export const WHITESPACE_PATTERNS: CleanupPattern[] = [
  {
    name: 'multiple-spaces',
    description: 'Normalize multiple spaces to single space',
    pattern: /  +/g,
    replacement: ' ',
    priority: 10,
  },
  {
    name: 'space-before-punct',
    description: 'Remove space before punctuation',
    pattern: / ([,;.!?:])/g,
    replacement: '$1',
    priority: 10,
  },
  {
    name: 'multiple-blank-lines',
    description: 'Normalize multiple blank lines to single',
    pattern: /\n{3,}/g,
    replacement: '\n\n',
    priority: 10,
  },
  {
    name: 'trailing-spaces',
    description: 'Remove trailing spaces on lines',
    pattern: / +$/gm,
    replacement: '',
    priority: 10,
  },
];

// Export all patterns in priority order
export function getAllPatterns(): CleanupPattern[] {
  const all = [
    ...PAGE_HEADER_PATTERNS,
    ...CARET_PIPE_PATTERNS,
    ...AGGRESSIVE_PATTERNS,
    ...INLINE_MARKER_PATTERNS,
    ...APPARATUS_PATTERNS,
    ...WHITESPACE_PATTERNS,
  ];
  return all.sort((a, b) => a.priority - b.priority);
}

/**
 * Apply all cleanup patterns to text
 */
export function applyAllCleanups(text: string, verbose = false): string {
  const patterns = getAllPatterns();
  let result = text;
  
  for (const pattern of patterns) {
    const before = result;
    result = result.replace(pattern.pattern, pattern.replacement);
    if (verbose && before !== result) {
      const matches = before.match(pattern.pattern);
      console.log('[' + pattern.name + '] Applied: ' + (matches?.length || 0) + ' matches');
    }
  }
  
  return result;
}

/**
 * Apply only specific pattern categories
 */
export function applyPatternCategory(
  text: string, 
  category: 'headers' | 'carets' | 'markers' | 'apparatus' | 'whitespace'
): string {
  let patterns: CleanupPattern[];
  switch (category) {
    case 'headers':
      patterns = PAGE_HEADER_PATTERNS;
      break;
    case 'carets':
      patterns = CARET_PIPE_PATTERNS;
      break;
    case 'markers':
      patterns = INLINE_MARKER_PATTERNS;
      break;
    case 'apparatus':
      patterns = APPARATUS_PATTERNS;
      break;
    case 'whitespace':
      patterns = WHITESPACE_PATTERNS;
      break;
  }
  
  let result = text;
  for (const pattern of patterns) {
    result = result.replace(pattern.pattern, pattern.replacement);
  }
  return result;
}
