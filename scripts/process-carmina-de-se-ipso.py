#!/usr/bin/env python3
"""
Process Gregory's Carmina de se ipso from PDF.

This script:
1. Extracts text from PDF using pdftotext
2. Removes page footers and headers
3. Identifies poem sections by Greek numeral markers (Αʹ., Βʹ., etc.)
4. Splits continuous text into verse groups using Migne line numbers
5. Outputs structured JSON for each poem/chapter
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

# Directories
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
RAW_DIR = PROJECT_ROOT / "data" / "raw" / "gregory-greekdownloads"
OUTPUT_DIR = PROJECT_ROOT / "data" / "processed" / "gregory-carmina"

PDF_FILE = RAW_DIR / "carmina-de-se-ipso.pdf"

# Footer patterns to remove
FOOTER_PATTERNS = [
    r'Ερευνητικό έργο:.*?προέλευσής του\.',
    r'Εργαστήριο ∆ιαχείρισης.*?Επικοινωνίας.*?\d{4}\.',
    r'Χρηματοδότηση:.*?πόροι \d+%\)\.',
    r'Επιτρέπεται η ελεύθερη χρήση.*?προέλευσής του\.',
    r'www\.aegean\.gr/culturaltec/chmlab',
    r'∆ΡΟΜΟΙ ΤΗΣ ΠΙΣΤΗΣ',
    r'ΨΗΦΙΑΚΗ ΠΑΤΡΟΛΟΓΙΑ',
    r'Πανεπιστ[ήη]μιο Αιγαίου',
    r'Interreg ΙΙΙΑ',
    r'ETΠΑ \d+%',
    r'Εθν\. πόροι \d+%',
    r'Τμήμα Πολιτισμικής Τεχνολογίας',
    r'^\s*\d+\s*$',  # Page numbers alone
]

# Greek numeral sign (U+0374)
NUMERAL_SIGN = '\u0374'

# Poem marker pattern: Greek letters + numeral sign + period
POEM_MARKER_PATTERN = re.compile(
    rf'([Α-Ω]{{1,3}}[{NUMERAL_SIGN}΄ʹ])\.\s*',
    re.UNICODE
)

# Migne line number pattern (3-4 digits embedded in text)
LINE_NUMBER_PATTERN = re.compile(r'(?<!\d)\s+(\d{3,4})\s+(?=[Α-Ωα-ωἀ-ῶά-ώ])')


def extract_pdf_text(pdf_path: Path) -> str:
    """Extract text from PDF using pdftotext."""
    result = subprocess.run(
        ['pdftotext', '-layout', str(pdf_path), '-'],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"pdftotext failed: {result.stderr}")
    return result.stdout


def clean_text(text: str) -> str:
    """Remove footers, headers, and normalize whitespace."""
    lines = text.split('\n')
    cleaned_lines = []

    for line in lines:
        # Skip footer lines
        skip = False
        for pattern in FOOTER_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                skip = True
                break
        if skip:
            continue

        # Skip mostly empty lines that are just page numbers
        stripped = line.strip()
        if stripped.isdigit():
            continue

        cleaned_lines.append(line)

    text = '\n'.join(cleaned_lines)

    # Remove the file title at top
    text = re.sub(r'Carmina de se ipso\s*', '', text)

    # Remove main header
    text = re.sub(r'ΒΙΒΛΟΣ [Α-Ω][ʹ΄\u0374]\..*?ΕΑΥΤΟΥ\.', '', text, flags=re.DOTALL)

    # Normalize whitespace (but preserve some structure)
    text = re.sub(r'[ \t]+', ' ', text)  # Multiple spaces to one
    text = re.sub(r'\n{3,}', '\n\n', text)  # Multiple newlines to two

    return text.strip()


def split_into_poems(text: str) -> list[tuple[str, str]]:
    """
    Split text into poems by section markers.
    Returns list of (marker, content).
    """
    # Find all poem markers and their positions
    matches = list(POEM_MARKER_PATTERN.finditer(text))

    if not matches:
        print("Warning: No poem markers found")
        return [('Unknown', text)]

    poems = []
    for i, match in enumerate(matches):
        marker = match.group(1)
        start = match.end()

        # Find end (next marker or end of text)
        if i + 1 < len(matches):
            end = matches[i + 1].start()
        else:
            end = len(text)

        content = text[start:end].strip()

        if content:  # Only add non-empty poems
            poems.append((marker, content))

    return poems


def split_into_verses(text: str, max_chars: int = 800) -> list[str]:
    """
    Split poem text into verse groups using Migne line numbers.
    Target paragraph size: ~800 chars (manageable for translation).
    """
    # Normalize whitespace first
    text = re.sub(r'\s+', ' ', text).strip()

    # Split on Migne line numbers
    parts = LINE_NUMBER_PATTERN.split(text)

    verses = []
    current = ""

    for i, part in enumerate(parts):
        part = part.strip()
        if not part:
            continue

        # Check if this is a line number
        if re.match(r'^\d{3,4}$', part):
            # If current is getting long, save it and start new
            if len(current) > max_chars:
                if current.strip():
                    verses.append(current.strip())
                current = f"{part} "
            else:
                # Add line number to current
                current += f" {part} "
        else:
            current += part + " "

    # Don't forget the last verse
    if current.strip():
        verses.append(current.strip())

    # If still very long paragraphs, split at sentence boundaries
    final_verses = []
    for verse in verses:
        if len(verse) > max_chars * 2:
            # Split at sentence boundaries
            sentences = re.split(r'(?<=[.;·])\s+', verse)
            current = ""
            for sent in sentences:
                if len(current) + len(sent) > max_chars:
                    if current:
                        final_verses.append(current.strip())
                    current = sent + " "
                else:
                    current += sent + " "
            if current.strip():
                final_verses.append(current.strip())
        else:
            final_verses.append(verse)

    return final_verses


def greek_numeral_to_int(marker: str) -> int:
    """Convert Greek numeral marker to integer for sorting."""
    # Remove numeral sign
    marker = re.sub(rf'[{NUMERAL_SIGN}΄ʹ]', '', marker)

    values = {
        'Α': 1, 'Β': 2, 'Γ': 3, 'Δ': 4, 'Ε': 5, 'Ϛ': 6, 'Ζ': 7, 'Η': 8, 'Θ': 9,
        'Ι': 10, 'Κ': 20, 'Λ': 30, 'Μ': 40, 'Ν': 50, 'Ξ': 60, 'Ο': 70, 'Π': 80,
        'ϟ': 90, 'Ρ': 100
    }

    # Simple conversion for common patterns
    if len(marker) == 1:
        return values.get(marker, 0)
    elif len(marker) == 2:
        # ΙΑ = 11, ΙΒ = 12, etc.
        return values.get(marker[0], 0) + values.get(marker[1], 0)
    elif len(marker) == 3:
        return values.get(marker[0], 0) + values.get(marker[1], 0) + values.get(marker[2], 0)

    return 0


def process_carmina():
    """Main processing function."""
    print(f"Processing: {PDF_FILE}")

    if not PDF_FILE.exists():
        print(f"ERROR: PDF not found at {PDF_FILE}")
        sys.exit(1)

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Extract and clean text
    print("Extracting PDF text...")
    raw_text = extract_pdf_text(PDF_FILE)
    print(f"  Extracted {len(raw_text):,} characters")

    print("Cleaning text...")
    clean = clean_text(raw_text)
    print(f"  Cleaned to {len(clean):,} characters")

    print("Splitting into poems...")
    poems = split_into_poems(clean)
    print(f"  Found {len(poems)} poems")

    # Process each poem
    chapter_num = 0
    stats = {'total_paragraphs': 0, 'min_paras': 999, 'max_paras': 0}

    for marker, content in poems:
        chapter_num += 1

        # Extract title (first phrase ending in period)
        title_match = re.match(r'([^\.]+\.)', content)
        if title_match:
            title = title_match.group(1).strip()
            content = content[title_match.end():].strip()
        else:
            title = f"Poem {marker}"

        # Split content into verses
        verses = split_into_verses(content)

        if not verses:
            print(f"  Skipping empty poem {marker}: {title[:50]}...")
            chapter_num -= 1
            continue

        # Update stats
        stats['total_paragraphs'] += len(verses)
        stats['min_paras'] = min(stats['min_paras'], len(verses))
        stats['max_paras'] = max(stats['max_paras'], len(verses))

        # Create full title
        full_title = f"Carmina de se ipso: {marker}. {title}"

        # Create chapter JSON
        chapter_data = {
            "title": full_title,
            "paragraphs": verses
        }

        # Write to file
        filename = f"chapter-{chapter_num:03d}.json"
        output_path = OUTPUT_DIR / filename

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(chapter_data, f, ensure_ascii=False, indent=2)

        print(f"  Ch {chapter_num:2d}: {marker:>4s}. {title[:35]:<35s} ({len(verses):2d} paragraphs)")

    print(f"\n=== Summary ===")
    print(f"Total chapters: {chapter_num}")
    print(f"Total paragraphs: {stats['total_paragraphs']}")
    print(f"Paragraphs per chapter: {stats['min_paras']}-{stats['max_paras']}")
    print(f"Output in: {OUTPUT_DIR}")


if __name__ == "__main__":
    process_carmina()
