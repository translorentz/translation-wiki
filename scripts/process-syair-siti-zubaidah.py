#!/usr/bin/env python3
"""
Process Syair Siti Zubaidah raw OCR text into structured JSON chapters.

Input: data/raw/syar_siti/syar_siti.txt (12,454 lines)
Output: data/processed/syair-siti-zubaidah/chapter-NNN.json (~19 chapters)

Each chapter contains quatrains (4-line stanzas) as paragraph units.
"""

import json
import os
import re
import sys

RAW_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw', 'syar_siti', 'syar_siti.txt')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed', 'syair-siti-zubaidah')

# --- Step 1: OCR correction patterns ---

def ocr_fix(line: str) -> str:
    """Apply OCR correction regex patterns to a single line."""

    # Remove trailing OCR noise: underscores, tildes, stray punctuation clusters at end
    line = re.sub(r'[\s,]*[-_~.•]+[\s_~.\-,]*$', '', line)

    # --- Digit-to-letter fixes FIRST (before ! fix, since !1 combos exist) ---

    # Fix `1` (digit one) -> `l` in word context
    line = re.sub(r'\b1(?=[a-z])', 'l', line)
    line = re.sub(r'(?<=[a-zA-Z!])1(?=[a-z])', 'l', line)

    # Fix `9i` -> `di` at word start
    line = re.sub(r'\b9i\b', 'di', line)
    line = re.sub(r'\b9i(?=[a-z])', 'di', line)

    # Fix `0J` or `0j` -> word start patterns
    line = re.sub(r'\b0J\b', 'Di', line)
    line = re.sub(r'\b0j\b', 'di', line)

    # Fix `+` -> `t` in word context
    line = re.sub(r'(?<=[a-zA-Z])\+(?=[a-zA-Z])', 't', line)

    # --- ! -> l/i fix (after digit fixes) ---

    # `!` at word start -> `i` or `l` for specific known words
    line = re.sub(r'\b!(?=ni\b)', 'i', line)    # !ni -> ini
    line = re.sub(r'\b!(?=tu\b)', 'i', line)    # !tu -> itu
    line = re.sub(r'\b!(?=bu\b)', 'i', line)    # !bu -> ibu
    line = re.sub(r'\b!(?=ntan\b)', 'I', line)  # !ntan -> Intan
    line = re.sub(r'\b!(?=nang\b)', 'I', line)  # !nang -> Inang
    line = re.sub(r'\b!(?=agi\b)', 'l', line)   # !agi -> lagi
    line = re.sub(r'\b!(?=embatan\b)', 'j', line)  # !embatan -> jembatan
    # `!` inside/end of word -> `l` (most common substitution)
    line = re.sub(r'(?<=[a-zA-Z])!(?=[a-zA-Z0-9\s,.\'\";:?\-]|$)', 'l', line)

    # --- I -> l fix ---
    # `I` at start of word followed by lowercase -> `l`
    # EXCEPT known I-words (Islam, Ibrahim, Imam, Istana, etc.)
    line = re.sub(r'\bI(?=[a-z])', lambda m: _fix_capital_I(m, line), line)

    # Fix `J` -> `j` in middle of word (JaJu -> lalu already handled, but other cases)
    # Actually `J` as capital is fine for names (Jafar, Jauhari). Only fix mid-word `J`.

    # Remove stray isolated punctuation artifacts
    line = re.sub(r'\s+[_~•]+\s*$', '', line)

    # Nice-to-have: Fix tidal< -> tidak
    line = re.sub(r'\btidal<', 'tidak', line)

    # Nice-to-have: Fix !-in-words patterns the main pass missed
    # te!Jumlah -> terjumlah, ha!lku -> halku, be!Jalan -> berjalan, Be!)aJan -> Berjalan
    line = re.sub(r'!(?=[A-Z][a-z])', 'r', line)  # !J -> rJ -> handled below
    # General: any remaining ! between letters -> l
    line = re.sub(r'(?<=[a-zA-Z])!(?=[a-zA-Z])', 'l', line)

    # Fix double spaces
    line = re.sub(r'  +', ' ', line)

    # Fix #3: Strip any remaining tabs
    line = line.replace('\t', ' ')

    # Strip trailing whitespace
    line = line.rstrip()

    return line


# Known Malay words that genuinely start with I (capital):
_I_WORDS = {'Islam', 'Ibrahim', 'Imam', 'Istana', 'Intan', 'Ismail', 'Irak',
             'Ini', 'Itu', 'Ibunda', 'Istimewa', 'Iman', 'Ilmu', 'Indah',
             'Inang', 'Ipar', 'Ikan', 'Ikut', 'Izin', 'Ingat', 'Isi',
             'Isteri', 'Istri', 'Indra'}

def _fix_capital_I(match, line):
    """Decide whether I at word start should become l."""
    pos = match.start()
    # Extract the full word starting at this position
    word_match = re.match(r'I[a-z]+', line[pos:])
    if word_match:
        word = word_match.group()
        # Check if this is a known I-word
        for iw in _I_WORDS:
            if word.startswith(iw[1:]):  # Compare without the I
                # Hmm, this doesn't work well. Let's check the full word.
                pass
        # Check if the capitalized form is a known word
        if word.capitalize() in _I_WORDS or word in _I_WORDS:
            return 'I'  # Keep as-is
        # Check common patterns that should stay as I
        if re.match(r'I(?:slam|brahim|mam|stana|ntan|smail|ni\b|tu\b|bunda|sti|lmu|ndah|nang|par|kan|kut|zin|ngat|si\b|rak\b|man\b|ndra)', line[pos:]):
            return 'I'
        return 'l'
    return 'I'


def is_page_number(line: str) -> bool:
    """Check if a line is a standalone page number (including OCR-garbled ones)."""
    stripped = line.strip()
    # Pure digits (original check)
    if re.match(r'^\s*\d{1,3}\s*$', stripped):
        return True
    # Roman numerals: I, II, III, IV, IX, X, etc.
    if re.match(r'^\s*[IVX]{1,4}\s*$', stripped):
        return True
    # OCR-garbled page numbers: short lines (<6 chars) with digits but few consecutive letters
    # Known patterns: "S4", "J27", "i48", "ISS", "29 1", "30)", "\09", "f8f"
    if len(stripped) < 6 and re.search(r'\d', stripped):
        # Count consecutive letter runs
        letter_runs = re.findall(r'[a-zA-Z]+', stripped)
        max_letters = max((len(r) for r in letter_runs), default=0)
        if max_letters < 3:
            return True
    # Short lines that are known garbled patterns without digits
    if stripped in ('ISS',):
        return True
    return False


def is_library_stamp(line: str) -> bool:
    """Check if line is part of the library stamp artifact."""
    stamp_patterns = [
        r'PERPU>TAK',
        r'PUS\s*~\s*T\s*rE',
        r'PE\s*j\s*,Ff',
        r'OEP\s*~TE',
        r'DAN\s+KEBU[DO]AYAAN',
    ]
    return any(re.search(p, line) for p in stamp_patterns)


def strip_inline_stanza_number(line: str) -> str:
    """Remove leading stanza reference numbers, /N/ markers, and !N! markers."""
    # Pattern: digits followed by tab at start of line
    line = re.sub(r'^\d+\s*\t', '', line)
    # Pattern: /N/ followed by tab OR space (Fix #4: handle /N/ without tab)
    line = re.sub(r'^/\s*\d+\s*/\s*[\t ]+', '', line)
    # Pattern: digits followed by spaces then tab
    line = re.sub(r'^\d+\s+\t', '', line)
    # Fix #4: Handle !N! garbled stanza markers (e.g., !4! = "141")
    line = re.sub(r'^!\d+!\s*[\t ]+', '', line)
    line = re.sub(r'^!\d+!\s*', '', line)
    # Fix #2: Strip embedded volume page refs (e.g., "II 001", "II 021")
    line = re.sub(r'\bII\s*\d{2,3}\b', '', line)
    # Fix #2: Strip /NNN/ page refs mid-line or at start
    line = re.sub(r'/\s*\d{2,3}\s*/', '', line)
    # Fix #3: Strip all tab characters
    line = line.replace('\t', ' ')
    # Clean up double spaces from removals
    line = re.sub(r'  +', ' ', line)
    return line


def process():
    # Read raw file
    with open(RAW_PATH, 'r', encoding='utf-8') as f:
        all_lines = f.readlines()

    print(f"Read {len(all_lines)} lines from raw file")

    # Step 1: Extract syair section (lines 249-12443, 1-indexed)
    # In 0-indexed: 248 to 12442
    syair_lines = all_lines[248:12443]
    print(f"Syair section: {len(syair_lines)} lines")

    # Step 2: Clean lines
    cleaned = []
    stamp_removed = 0
    page_nums_removed = 0
    blank_lines = 0

    for i, raw_line in enumerate(syair_lines):
        line = raw_line.rstrip('\n').rstrip('\r')

        # Skip library stamp (around original lines 324-328, i.e., offset 75-79)
        if is_library_stamp(line):
            stamp_removed += 1
            continue

        # Skip standalone page numbers
        if is_page_number(line):
            page_nums_removed += 1
            continue

        # Skip empty/blank lines (we'll regroup later)
        if line.strip() == '' or line.strip() == '•':
            blank_lines += 1
            continue

        # Strip inline stanza numbers
        line = strip_inline_stanza_number(line)

        # Apply OCR fixes
        line = ocr_fix(line)

        # Skip if line is now empty after cleaning
        if not line.strip():
            continue

        cleaned.append(line.strip())

    print(f"After cleaning: {len(cleaned)} content lines")
    print(f"  Stamp lines removed: {stamp_removed}")
    print(f"  Page numbers removed: {page_nums_removed}")
    print(f"  Blank lines skipped: {blank_lines}")

    # Step 3: Group into quatrains (every 4 lines)
    quatrains = []
    for i in range(0, len(cleaned) - 3, 4):
        q = '\n'.join(cleaned[i:i+4])
        quatrains.append(q)

    # Handle remainder lines (if not divisible by 4)
    remainder = len(cleaned) % 4
    if remainder:
        leftover = '\n'.join(cleaned[-(remainder):])
        quatrains.append(leftover)
        print(f"  WARNING: {remainder} leftover lines (not a full quatrain)")

    print(f"Total quatrains: {len(quatrains)}")

    # Step 4: Divide into ~19 chapters of roughly equal size
    num_chapters = 19
    per_chapter = len(quatrains) // num_chapters
    extra = len(quatrains) % num_chapters

    # Create output directory
    os.makedirs(OUT_DIR, exist_ok=True)

    # Distribute quatrains into chapters
    idx = 0
    for ch in range(1, num_chapters + 1):
        count = per_chapter + (1 if ch <= extra else 0)
        chapter_quatrains = quatrains[idx:idx + count]
        idx += count

        paragraphs = []
        for qi, q in enumerate(chapter_quatrains):
            paragraphs.append({
                "index": qi,
                "text": q
            })

        chapter_data = {
            "chapterNumber": ch,
            "title": f"Chapter {ch}",
            "sourceContent": {
                "paragraphs": paragraphs
            }
        }

        out_path = os.path.join(OUT_DIR, f"chapter-{ch:03d}.json")
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(chapter_data, f, ensure_ascii=False, indent=2)

        print(f"  Chapter {ch}: {len(chapter_quatrains)} quatrains -> {out_path}")

    print(f"\nDone! {num_chapters} chapters written to {OUT_DIR}")
    return quatrains


def validate(quatrains):
    """Validate output quality by sampling quatrains."""
    print("\n=== VALIDATION ===")

    # Check a sample of quatrains for issues
    issues = []
    for i, q in enumerate(quatrains):
        lines = q.split('\n')
        # Check for remaining OCR artifacts
        if '!' in q and re.search(r'[a-z]![a-z]', q):
            issues.append(f"Quatrain {i}: possible remaining ! artifact: {q[:80]}")
        if re.search(r'\b\d{1,3}\b', q) and len(lines) == 1:
            issues.append(f"Quatrain {i}: possible page number leaked: {q[:80]}")
        if 'PERPU' in q or 'KEBU' in q:
            issues.append(f"Quatrain {i}: library stamp leaked: {q[:80]}")
        # Check line count
        if len(lines) != 4:
            issues.append(f"Quatrain {i}: has {len(lines)} lines instead of 4")

    if issues:
        print(f"Found {len(issues)} potential issues:")
        for issue in issues[:20]:
            print(f"  - {issue}")
        if len(issues) > 20:
            print(f"  ... and {len(issues) - 20} more")
    else:
        print("No obvious issues found in automated check.")

    # Sample 5 quatrains for manual inspection
    print("\n=== SAMPLE QUATRAINS ===")
    import random
    random.seed(42)
    samples = sorted(random.sample(range(len(quatrains)), min(10, len(quatrains))))
    for s in samples:
        print(f"\n--- Quatrain {s} ---")
        print(quatrains[s])


if __name__ == '__main__':
    quatrains = process()
    validate(quatrains)
