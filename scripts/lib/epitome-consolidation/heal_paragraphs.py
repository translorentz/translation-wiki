#!/usr/bin/env python3
"""
Heal broken paragraph boundaries in Epitome of Histories chapter JSONs.

OCR page boundaries caused paragraphs to split mid-sentence. This script
detects and merges such breaks based on:
  1. Previous paragraph lacks terminal punctuation (. ; middle-dot)
  2. Next paragraph starts with lowercase Greek or a continuation particle
  3. Very short fragments (<50 chars) that don't stand alone
"""

import json
import os
import re
import sys
import unicodedata

INPUT_DIR = os.path.join(
    os.path.dirname(__file__),
    "..", "..", "..", "data", "processed", "epitome-of-histories-final"
)
# We'll write healed files back to the same directory (overwrite).
# A backup copy is made first.

# Greek terminal punctuation
TERMINAL_PUNCT = set(".;·")

# Greek lowercase letter ranges (including accented/polytonic)
def starts_with_lowercase_greek(text: str) -> bool:
    """Check if text starts with a lowercase Greek letter (including polytonic)."""
    text = text.lstrip()
    if not text:
        return False
    ch = text[0]
    # Direct lowercase Greek range
    if '\u03b1' <= ch <= '\u03c9':  # α-ω
        return True
    # Polytonic Greek (extended): lowercase with diacritics
    cat = unicodedata.category(ch)
    if cat == 'Ll':
        # Check if it's in Greek block or Greek Extended
        cp = ord(ch)
        if (0x0370 <= cp <= 0x03FF or   # Greek and Coptic
            0x1F00 <= cp <= 0x1FFF):     # Greek Extended
            return True
    return False


def ends_without_terminal(text: str) -> bool:
    """Check if text ends without sentence-ending punctuation."""
    text = text.rstrip()
    if not text:
        return True
    last_char = text[-1]
    # Check last meaningful character
    return last_char not in TERMINAL_PUNCT


def is_short_fragment(text: str, threshold: int = 50) -> bool:
    """Check if paragraph is a very short fragment."""
    return len(text.strip()) < threshold


def looks_like_apparatus(text: str) -> bool:
    """Detect OCR apparatus/critical notes that got mixed in as paragraphs.
    These often start with editor names or Latin abbreviations."""
    stripped = text.strip()
    # Common apparatus markers
    apparatus_starts = [
        "Wolfius", "Syncellus", "cangii", "codices", "codex",
        "nap!", "losephus", "Ducangii"
    ]
    for marker in apparatus_starts:
        if stripped.startswith(marker):
            return True
    return False


def should_merge(prev_text: str, curr_text: str) -> bool:
    """Determine if curr_text should be merged into prev_text.

    Merge when:
      - prev ends without terminal punct AND curr starts lowercase Greek
      - curr is a tiny fragment (<50 chars) AND prev ends without terminal punct
      - curr starts with apparatus note AND prev ends mid-sentence

    Don't merge:
      - Both are complete sentences
      - Across clear section boundaries (numbered sections like "5." or "6.")
    """
    prev_stripped = prev_text.rstrip()
    curr_stripped = curr_text.strip()

    if not prev_stripped or not curr_stripped:
        return False

    # Don't merge if current paragraph starts with a section number like "5." or "6."
    if re.match(r'^\d+[\.,]', curr_stripped):
        return False

    # Don't merge if current starts with a clear capital Greek letter after
    # prev ends with terminal punctuation
    if not ends_without_terminal(prev_stripped):
        return False

    # Previous ends without terminal punctuation - check continuation signals

    # Signal 1: next starts with lowercase Greek
    if starts_with_lowercase_greek(curr_stripped):
        return True

    # Signal 2: next is a very short fragment
    if is_short_fragment(curr_stripped):
        return True

    # Signal 3: apparatus text continuation
    if looks_like_apparatus(curr_stripped):
        return True

    # Signal 4: prev ends with a hyphen-like break (common in OCR)
    if prev_stripped.endswith('-') or prev_stripped.endswith('--'):
        return True

    # Signal 5: common continuation words at start
    continuation_words = ['καὶ', 'δὲ', 'τε', 'γὰρ', 'ἀλλὰ', 'ἀλλ᾽', 'οὐδὲ']
    first_word = curr_stripped.split()[0] if curr_stripped.split() else ""
    if first_word.rstrip(',') in continuation_words and ends_without_terminal(prev_stripped):
        # Already covered by ends_without_terminal check above
        return True

    return False


def heal_chapter(paragraphs: list) -> tuple:
    """Heal paragraph breaks in a chapter. Returns (healed_paragraphs, merge_count)."""
    if len(paragraphs) <= 1:
        return paragraphs, 0

    healed = [paragraphs[0].copy()]
    merge_count = 0

    for i in range(1, len(paragraphs)):
        prev_text = healed[-1]["text"]
        curr_text = paragraphs[i]["text"]

        if should_merge(prev_text, curr_text):
            # Merge: append current text to previous with a space
            healed[-1]["text"] = prev_text.rstrip() + " " + curr_text.lstrip()
            merge_count += 1
        else:
            healed.append(paragraphs[i].copy())

    # Re-index
    for idx, p in enumerate(healed):
        p["index"] = idx

    return healed, merge_count


def main():
    input_dir = os.path.abspath(INPUT_DIR)

    if not os.path.isdir(input_dir):
        print(f"ERROR: Directory not found: {input_dir}")
        sys.exit(1)

    files = sorted(f for f in os.listdir(input_dir) if f.endswith(".json"))

    if not files:
        print(f"No JSON files found in {input_dir}")
        sys.exit(1)

    print(f"Processing {len(files)} chapter files from {input_dir}")
    print("=" * 70)

    total_before = 0
    total_after = 0
    total_merges = 0
    report_lines = []

    for fname in files:
        fpath = os.path.join(input_dir, fname)

        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)

        paragraphs = data["sourceContent"]["paragraphs"]
        before_count = len(paragraphs)

        healed, merge_count = heal_chapter(paragraphs)
        after_count = len(healed)

        total_before += before_count
        total_after += after_count
        total_merges += merge_count

        ch_num = data.get("chapterNumber", "?")
        title = data.get("title", fname)

        report_lines.append({
            "chapter": ch_num,
            "title": title,
            "before": before_count,
            "after": after_count,
            "merges": merge_count
        })

        status = f"  {fname}: {before_count} -> {after_count} paragraphs ({merge_count} merges)"
        print(status)

        # Write back
        data["sourceContent"]["paragraphs"] = healed
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    print("=" * 70)
    print(f"TOTAL: {total_before} -> {total_after} paragraphs ({total_merges} merges)")

    # Write report data as JSON for the report script to consume
    report_path = os.path.join(input_dir, "..", "..", "..", "docs", "epitome-paragraph-healing-report.json")
    report_path = os.path.abspath(report_path)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({
            "total_before": total_before,
            "total_after": total_after,
            "total_merges": total_merges,
            "chapters": report_lines
        }, f, ensure_ascii=False, indent=2)
    print(f"\nReport data written to {report_path}")


if __name__ == "__main__":
    main()
