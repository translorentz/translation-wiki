#!/usr/bin/env python3
"""Main cleaning pipeline for La Scapigliatura e il 6 Febbraio OCR text.

Reads raw DJVU text, applies cleaning phases, outputs chapter JSON files.
"""
import json
import os
import re
import sys

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(__file__))
from patterns import (
    FRONT_MATTER_END, CHAPTER_HEADING, INTRODUZIONE_HEADING,
    PAGE_NUMBER, is_noise_line, LEADING_MARGIN, SOFT_HYPHEN,
    FOOTNOTE, MULTI_BLANK, STRAY_BULLETS, FINE_MARKER
)
from corrections import apply_corrections

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
RAW_FILE = os.path.join(PROJECT_ROOT, 'data', 'difficult_extra_processing', 'scapigliatura', 'arrighiscapigliatura_djvu.txt')
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'data', 'processed', 'scapigliatura-e-il-6-febbraio')

# Chapter structure: Introduction + 16 chapters
# The duplicate CAPITOLO SEDICESIMO at lines 12883 and 13248 are two distinct sections:
#   - First (line 12883): "Tre rimorsi" (Three regrets)  -> Chapter 16
#   - Second (line 13248): "Il sei febbrajo" (The 6th of February) -> Chapter 17
# We treat them as separate chapters since they have distinct subtitles.

CHAPTER_NAMES = {
    0: 'Introduzione',
    1: 'Capitolo Primo',
    2: 'Capitolo Secondo',
    3: 'Capitolo Terzo',
    4: 'Capitolo Quarto',
    5: 'Capitolo Quinto',
    6: 'Capitolo Sesto',
    7: 'Capitolo Settimo',
    8: 'Capitolo Ottavo',
    9: 'Capitolo Nono',
    10: 'Capitolo Decimo',
    11: 'Capitolo Undecimo',
    12: 'Capitolo Dodicesimo',
    13: 'Capitolo Tredicesimo',
    14: 'Capitolo Quattordicesimo',
    15: 'Capitolo Quindicesimo',
    16: 'Capitolo Sedicesimo — Tre rimorsi',
    17: 'Capitolo Sedicesimo — Il sei febbrajo',
}


def read_raw_text() -> list[str]:
    """Read the raw DJVU text file."""
    with open(RAW_FILE, 'r', encoding='utf-8') as f:
        return f.readlines()


def strip_front_matter(lines: list[str]) -> list[str]:
    """Remove front matter (everything before INTRODUZIONE)."""
    for i, line in enumerate(lines):
        if FRONT_MATTER_END.match(line.strip()):
            return lines[i:]
    print("WARNING: INTRODUZIONE not found, returning all lines")
    return lines


def remove_page_numbers(lines: list[str]) -> list[str]:
    """Remove page number lines."""
    result = []
    for line in lines:
        stripped = line.strip()
        if PAGE_NUMBER.match(stripped):
            continue
        result.append(line)
    return result


def remove_noise_lines(lines: list[str]) -> list[str]:
    """Remove garbled OCR noise lines."""
    result = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            result.append(line)
            continue
        # Keep chapter headings, INTRODUZIONE, FINE
        if CHAPTER_HEADING.match(stripped) or INTRODUZIONE_HEADING.match(stripped) or FINE_MARKER.match(stripped):
            result.append(line)
            continue
        if is_noise_line(stripped):
            continue
        result.append(line)
    return result


def remove_footnotes(lines: list[str]) -> list[str]:
    """Remove footnote lines."""
    result = []
    for line in lines:
        if FOOTNOTE.match(line.strip()):
            continue
        result.append(line)
    return result


def strip_margin_chars(lines: list[str]) -> list[str]:
    """Strip leading margin characters."""
    result = []
    for line in lines:
        result.append(LEADING_MARGIN.sub('', line))
    return result


def join_soft_hyphens(lines: list[str]) -> list[str]:
    """Join lines broken with soft hyphens (¬)."""
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Check if line ends with ¬
        if SOFT_HYPHEN.search(line):
            # Remove ¬ and join with next line
            joined = SOFT_HYPHEN.sub('', line).rstrip()
            i += 1
            if i < len(lines):
                next_line = lines[i].lstrip()
                result.append(joined + next_line)
            else:
                result.append(joined + '\n')
        else:
            result.append(line)
        i += 1
    return result


def is_noise_paragraph(para: str) -> bool:
    """Check if an assembled paragraph is garbled OCR noise."""
    # Count alphabetic vs total non-space chars
    alpha = sum(1 for c in para if c.isalpha())
    total = len(para.replace(' ', ''))
    if total == 0:
        return True
    ratio = alpha / total
    # Paragraphs with < 55% alpha content are likely noise
    if ratio < 0.55:
        return True
    # Short paragraphs (< 80 chars) — more aggressive checks
    if len(para) < 80:
        words = para.split()
        VOWELS = set('aeiouàèéìòùAEIOUÀÈÉÌÒÙ')
        def is_plausible_italian(w):
            clean = re.sub(r'[^A-Za-zÀ-ÿ]', '', w)
            if len(clean) < 2:
                return False
            if len(clean) >= 3 and not any(c in VOWELS for c in clean):
                return False
            # Check for implausible patterns: 3+ consecutive identical chars
            if re.search(r'(.)\1{2,}', clean):
                return False
            # Mixed case mid-word (e.g., lV, iiO, sliniJ)
            if len(clean) >= 3 and re.search(r'[a-z][A-Z]', clean):
                return False
            # 3+ consecutive vowels (rare in Italian except for a few words)
            if re.search(r'[aeiouàèéìòùAEIOUÀÈÉÌÒÙ]{4,}', clean):
                return False
            return True
        real = sum(1 for w in words if is_plausible_italian(w))
        if len(words) > 0 and real / len(words) < 0.8:
            return True
    return False


def normalize_punctuation(text: str) -> str:
    """Clean up punctuation noise."""
    # Remove inline soft hyphens (¬ followed by space)
    text = re.sub(r'¬\s+', '', text)
    # Remove stray bullets mid-sentence
    text = STRAY_BULLETS.sub(' ', text)
    # Fix spaced-out commas: , , , -> ,
    text = re.sub(r'(?:,\s*){2,}', ', ', text)
    # Normalize multiple spaces
    text = re.sub(r'  +', ' ', text)
    return text


def clean_chapter_heading(heading: str) -> str:
    """Remove OCR noise from chapter headings (e.g., trailing ■ , 7)."""
    # Remove trailing noise after the chapter word
    heading = re.sub(r'[.\s]*[■\*\d,]+\s*$', '', heading)
    return heading.strip()


def split_into_chapters(lines: list[str]) -> list[tuple[int, str, list[str]]]:
    """Split cleaned lines into chapters.

    Returns list of (chapter_number, title, lines).
    """
    chapters = []
    current_chapter = -1
    current_lines = []
    sedicesimo_count = 0

    for line in lines:
        stripped = line.strip()

        # Check for INTRODUZIONE
        if INTRODUZIONE_HEADING.match(stripped):
            if current_chapter >= 0:
                chapters.append((current_chapter, CHAPTER_NAMES.get(current_chapter, ''), current_lines))
            current_chapter = 0
            current_lines = []
            continue

        # Check for CAPITOLO heading
        if CHAPTER_HEADING.match(stripped):
            if current_chapter >= 0:
                chapters.append((current_chapter, CHAPTER_NAMES.get(current_chapter, ''), current_lines))

            # Determine chapter number
            heading_clean = clean_chapter_heading(stripped)
            chapter_num = _heading_to_number(heading_clean)

            # Handle duplicate CAPITOLO SEDICESIMO
            if chapter_num == 16:
                sedicesimo_count += 1
                if sedicesimo_count == 2:
                    chapter_num = 17

            current_chapter = chapter_num
            current_lines = []
            continue

        # Check for FINE marker
        if FINE_MARKER.match(stripped):
            continue

        if current_chapter >= 0:
            current_lines.append(line)

    # Don't forget the last chapter
    if current_chapter >= 0 and current_lines:
        chapters.append((current_chapter, CHAPTER_NAMES.get(current_chapter, ''), current_lines))

    return chapters


def _heading_to_number(heading: str) -> int:
    """Convert chapter heading text to number."""
    # Order matters: check longer words first to avoid substring matches
    # (e.g., UNDECIMO contains DECIMO)
    word_to_num = [
        ('QUATTORDICESIMO', 14),
        ('TREDICESIMO', 13),
        ('DODICESIMO', 12),
        ('QUINDICESIMO', 15),
        ('SEDICESIMO', 16),
        ('UNDECIMO', 11),
        ('DECIMO', 10),
        ('SETTIMO', 7),
        ('SECONDO', 2),
        ('OTTAVO', 8),
        ('QUINTO', 5),
        ('QUARTO', 4),
        ('PRIMO', 1),
        ('TERZO', 3),
        ('SESTO', 6),
        ('NONO', 9),
    ]
    for word, num in word_to_num:
        if word in heading:
            return num
    return 0


def lines_to_paragraphs(lines: list[str]) -> list[str]:
    """Convert lines to paragraphs (blank-line delimited)."""
    paragraphs = []
    current = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current:
                para = ' '.join(current)
                para = re.sub(r'  +', ' ', para).strip()
                if para:
                    paragraphs.append(para)
                current = []
        else:
            current.append(stripped)

    if current:
        para = ' '.join(current)
        para = re.sub(r'  +', ' ', para).strip()
        if para:
            paragraphs.append(para)

    return paragraphs


def write_chapter_json(chapter_num: int, title: str, paragraphs: list[str]):
    """Write a chapter JSON file."""
    data = {
        'chapterNumber': chapter_num,
        'title': title,
        'sourceContent': {
            'paragraphs': [
                {'index': i, 'text': p}
                for i, p in enumerate(paragraphs)
            ]
        }
    }
    filename = f'chapter-{chapter_num:03d}.json'
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Written: {filename} ({len(paragraphs)} paragraphs)")


def main():
    """Run the full cleaning pipeline."""
    print("=== Scapigliatura OCR Cleaning Pipeline v1 ===\n")

    # Read raw text
    print("Reading raw text...")
    lines = read_raw_text()
    print(f"  {len(lines)} lines read")

    # Phase 1: Structural cleanup
    print("\nPhase 1: Structural cleanup")
    lines = strip_front_matter(lines)
    print(f"  After front matter removal: {len(lines)} lines")

    lines = remove_page_numbers(lines)
    print(f"  After page number removal: {len(lines)} lines")

    lines = remove_noise_lines(lines)
    print(f"  After noise removal: {len(lines)} lines")

    lines = remove_footnotes(lines)
    print(f"  After footnote removal: {len(lines)} lines")

    lines = strip_margin_chars(lines)
    print(f"  After margin char removal: {len(lines)} lines")

    # Phase 2: Soft-hyphen rejoining
    print("\nPhase 2: Soft-hyphen rejoining")
    lines = join_soft_hyphens(lines)
    print(f"  After hyphen joining: {len(lines)} lines")

    # Phase 3: Text corrections (applied per-line then per-paragraph)
    print("\nPhase 3: Splitting into chapters")
    chapters = split_into_chapters(lines)
    print(f"  Found {len(chapters)} chapters")

    # Process each chapter
    print("\nPhase 4: Processing chapters")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for chapter_num, title, chapter_lines in chapters:
        # Convert to paragraphs
        paragraphs = lines_to_paragraphs(chapter_lines)

        # Apply corrections to each paragraph
        cleaned_paragraphs = []
        for para in paragraphs:
            para = apply_corrections(para)
            para = normalize_punctuation(para)
            para = para.strip()
            if para and not is_noise_paragraph(para):
                cleaned_paragraphs.append(para)

        write_chapter_json(chapter_num, title, cleaned_paragraphs)

    print(f"\nDone! {len(chapters)} chapter files written to {OUTPUT_DIR}")


if __name__ == '__main__':
    main()
