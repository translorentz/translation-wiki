#!/usr/bin/env python3
"""
Process OCR'd Turkish novel "Mai ve Siyah" by Halit Ziya Uşaklıgil.
Reads raw text, splits into chapters, cleans OCR artifacts, outputs JSON.
"""

import json
import os
import re

RAW_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw', 'mai_ve_saiyah', 'mai_ve_saiyah.txt')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed', 'mai-ve-siyah')

# Chapter marker lines (1-indexed). These are standalone numbers with NO trailing space.
# Chapter 9 marker is missing from OCR; we place it at line 3308 based on content analysis.
CHAPTER_LINES = {
    1: 75, 2: 330, 3: 499, 4: 630, 5: 1094, 6: 1903,
    7: 2209, 8: 2822, 9: 3308, 10: 3763, 11: 3990, 12: 4214,
    13: 4770, 14: 5198, 15: 5931, 16: 6396, 17: 6500,
    18: 6651, 19: 7459, 20: 7760
}

# Page numbers appear as standalone numbers with trailing space (e.g. "1 ", "253 ")
# Also some footnote lines to skip
PAGE_NUM_RE = re.compile(r'^\d{1,3}\s*\.?\s*$')
ROMAN_RE = re.compile(r'^[IVXLCivxlc]+\s*$')
# Footnote patterns: start with digit(s) + space + short explanation text
FOOTNOTE_RE = re.compile(r'^\d\s+\S')
# Section break
SECTION_BREAK_RE = re.compile(r'^\*\*\*\s*$')


def read_raw():
    with open(RAW_FILE, 'r', encoding='utf-8') as f:
        return f.readlines()


def is_page_number(text):
    """Check if a line is a standalone page number."""
    return bool(PAGE_NUM_RE.match(text)) or bool(ROMAN_RE.match(text))


def is_footnote_line(text, prev_text=''):
    """
    Detect footnote lines that appear at bottom of pages in OCR.
    These are typically short lines starting with a digit, containing
    bibliographic info or word definitions.
    """
    # Lines like "Bez peçete.", "Figüran.", "ı Korist, koro şarkıcısı."
    # Lines like "2 İki şair."
    # Lines like "Eskiden yazıdaki mürekkebi kuruımak için üzerine dökülen renkli, ince kwn."
    # Footnote references embedded in text like "ı" at line end
    if re.match(r'^[ıi12]\s+[A-ZÇĞİÖŞÜa-zçğıöşü]', text) and len(text) < 80:
        return True
    if re.match(r'^\d\s+(Bu konuda|Eskiyazı|Eskiden|bkz)', text):
        return True
    return False


def clean_line(text):
    """Clean OCR artifacts from a single line."""
    # Remove lone replacement characters
    text = text.replace('�', '')
    # Remove middle dots (OCR artifact)
    text = text.replace('·', '')
    # Remove stray backslashes
    text = text.replace('\\', '')

    # Remove page numbers stuck to words (e.g., "memurun3" -> "memurun", "kuru251" -> "kuru")
    # Pattern: word characters followed by a page number (1-253) at end of line or before space
    text = re.sub(r'(\w)(\d{1,3})\s*$', lambda m: m.group(1) if 1 <= int(m.group(2)) <= 253 else m.group(0), text)

    # Remove standalone footnote superscript numbers at end of words
    # e.g., "nefes2" -> "nefes", "belirtir. ı" -> "belirtir."
    # But be careful not to remove legitimate numbers

    # Remove trailing "s" or "ı" that are OCR'd footnote markers
    # Only when preceded by punctuation + space
    text = re.sub(r'(\.\s*)[sı]\s*$', r'\1', text)

    # Clean multiple spaces
    text = re.sub(r'  +', ' ', text)
    return text.strip()


def lines_to_paragraphs(lines):
    """
    Convert raw OCR lines into paragraphs.

    OCR text has no blank lines between paragraphs. We detect paragraph
    boundaries using these heuristics:
    1. Dialogue lines starting with "- " or "-" begin new paragraphs
    2. Section breaks (***) create paragraph boundaries
    3. After a line ending with sentence-terminal punctuation (. ! ? ...),
       if the next content line starts with a capital letter (Turkish or Latin),
       it's likely a new paragraph
    4. Short lines that end a sentence followed by a new sentence
    """
    # First pass: clean lines and remove page numbers/footnotes
    cleaned = []
    i = 0
    while i < len(lines):
        text = lines[i].rstrip('\n').rstrip()
        stripped = text.strip()

        if not stripped:
            i += 1
            continue

        if is_page_number(stripped):
            i += 1
            continue

        if SECTION_BREAK_RE.match(stripped):
            cleaned.append(('break', '***'))
            i += 1
            continue

        if is_footnote_line(stripped):
            i += 1
            continue

        # Multi-line footnotes at page bottoms — skip lines that are clearly
        # footnote continuations (after a footnote marker, before next page number)

        line = clean_line(stripped)
        if line:
            cleaned.append(('text', line))
        i += 1

    # Second pass: group lines into paragraphs
    paragraphs = []
    current_lines = []

    SENTENCE_END = re.compile(r'[.!?…]\s*$|\.{3}\s*$')
    # Turkish capital letters including İ, Ö, Ü, Ç, Ş, Ğ
    CAPITAL_START = re.compile(r'^[A-ZÇĞİÖŞÜ]')
    DIALOGUE_START = re.compile(r'^-\s*')

    for idx, (typ, text) in enumerate(cleaned):
        if typ == 'break':
            # Section break — flush current paragraph
            if current_lines:
                paragraphs.append(' '.join(current_lines))
                current_lines = []
            continue

        # Determine if this line starts a new paragraph
        is_new_para = False

        if not current_lines:
            is_new_para = True
        elif DIALOGUE_START.match(text):
            # Dialogue always starts new paragraph
            is_new_para = True
        elif current_lines:
            prev_joined = current_lines[-1] if current_lines else ''
            # Previous line ends with sentence punctuation and this starts with capital
            if SENTENCE_END.search(prev_joined) and CAPITAL_START.match(text):
                is_new_para = True

        if is_new_para and current_lines:
            paragraphs.append(' '.join(current_lines))
            current_lines = [text]
        else:
            current_lines.append(text)

    if current_lines:
        paragraphs.append(' '.join(current_lines))

    # Post-process: fix broken words across line joins
    # Pattern: word ending with space + next word starting lowercase (already handled by join)
    # Also fix "oı;" -> likely "or;" or just OCR noise for periods

    final = []
    for p in paragraphs:
        # Skip very short non-content paragraphs
        if len(p) < 5:
            continue
        # Clean up joined text
        p = re.sub(r'  +', ' ', p)
        final.append(p.strip())

    return final


def process():
    lines = read_raw()
    sorted_chapters = sorted(CHAPTER_LINES.items(), key=lambda x: x[1])

    os.makedirs(OUT_DIR, exist_ok=True)
    results = []

    for i, (ch_num, start_line) in enumerate(sorted_chapters):
        # start_line is 1-indexed line of the chapter marker
        # Chapter content starts on the NEXT line
        content_start = start_line  # 0-indexed = start_line - 1, but content is after marker so start_line

        if i + 1 < len(sorted_chapters):
            content_end = sorted_chapters[i + 1][1] - 1  # line before next marker (1-indexed)
        else:
            content_end = len(lines)

        # Extract lines (convert to 0-indexed)
        chapter_lines = lines[content_start:content_end]

        paragraphs = lines_to_paragraphs(chapter_lines)

        if not paragraphs:
            print(f"WARNING: Chapter {ch_num} has no paragraphs!")
            continue

        chapter_data = {
            "title": str(ch_num),
            "paragraphs": paragraphs
        }

        filename = f"chapter-{ch_num:03d}.json"
        filepath = os.path.join(OUT_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(chapter_data, f, ensure_ascii=False, indent=2)

        results.append((ch_num, len(paragraphs), filename))
        print(f"Chapter {ch_num:2d}: {len(paragraphs):3d} paragraphs -> {filename}")

    print(f"\nTotal: {len(results)} chapters processed")
    total_paras = sum(r[1] for r in results)
    print(f"Total paragraphs: {total_paras}")
    print(f"Output: {os.path.abspath(OUT_DIR)}")


if __name__ == '__main__':
    process()
