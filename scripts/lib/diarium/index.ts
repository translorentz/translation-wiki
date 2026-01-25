/**
 * Diarium Urbis Romae (Infessura) cleaning pipeline
 *
 * Processes the OCR scan of Tommasini's 1890 critical edition,
 * removing editorial apparatus (footnotes, page headers, line numbers)
 * and producing clean text of the diary itself.
 */

export * from './types.js';
export * from './splitter.js';
export * from './cleaner.js';
export * from './year-splitter.js';
