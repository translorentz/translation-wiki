#!/usr/bin/env python3
"""
Clean contamination from Epitome of Histories chapter files.
Removes critical apparatus markers, sigla, page numbers, and OCR artifacts.
"""

import json
import re
import shutil
from collections import Counter
from pathlib import Path
from datetime import datetime

BASE_DIR = Path("/Users/bryancheong/claude_projects/translation-wiki")
DATA_DIR = BASE_DIR / "data/processed/epitome-of-histories-clean"
BACKUP_DIR = DATA_DIR / "backup_v3"

# Statistics
stats = {
    'total_paragraphs': 0,
    'paragraphs_modified': 0,
    'patterns_removed': Counter(),
    'chapters_processed': 0,
}

def backup_files():
    """Create backup of all chapter files."""
    BACKUP_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    for chapter_num in range(13, 19):
        src = DATA_DIR / f"chapter-{chapter_num:03d}.json"
        if src.exists():
            dst = BACKUP_DIR / f"chapter-{chapter_num:03d}_{timestamp}.json"
            shutil.copy2(src, dst)
            print(f"Backed up: {src.name} -> {dst.name}")

def clean_paragraph(text: str) -> tuple:
    """
    Clean a paragraph of contamination.
    Returns (cleaned_text, list_of_removals).
    """
    original = text
    removals = []

    # 1. Remove page numbers at paragraph start (e.g., "924 ", "14 ", "90 ")
    # But be careful not to remove years or legitimate numbers
    # Pattern: 2-4 digit number at the very start, followed by space and capital Greek letter
    match = re.match(r'^(\d{2,4})\s+(?=[Α-ΩἈ-ὭἊὊ"\'Ὁ])', text)
    if match:
        text = text[match.end():]
        removals.append(('PAGE_NUM_START', match.group()))

    # 2. Remove Xwp sigla patterns (manuscript markers)
    # These appear embedded in text and look like: Rwp, Dwp, OwpDi, BwpDi, wwp, etc.
    # Pattern: letter + wp + optional 0-4 letters/digits
    xwp_pattern = r'\b[A-Za-z][wW][pP][A-Za-z0-9]{0,4}\b'
    for match in re.finditer(xwp_pattern, text):
        removals.append(('XWP_SIGLA', match.group()))
    text = re.sub(xwp_pattern, '', text)

    # 3. Remove page/folio markers (D HI, W HI, W HII, etc.)
    page_marker_pattern = r'[DWOB]\s*[HΠ]I{1,3}\d*'
    for match in re.finditer(page_marker_pattern, text):
        removals.append(('PAGE_MARKER', match.group()))
    text = re.sub(page_marker_pattern, '', text)

    # 4. Remove manuscript sigla with commas (ACE, AO, AE, etc.)
    # But NOT Roman numerals (III, XII, etc.)
    # Pattern: 2-5 capital letters followed by comma and space
    def is_roman_numeral(s):
        return bool(re.match(r'^[IVXLCDM]+$', s))

    sigla_pattern = r'\b([A-Z]{2,5}),\s*'
    def replace_sigla(m):
        if is_roman_numeral(m.group(1)):
            return m.group(0)  # Keep Roman numerals
        removals.append(('SIGLA_COMMA', m.group()))
        return ''
    text = re.sub(sigla_pattern, replace_sigla, text)

    # 5. Remove Latin apparatus terms
    latin_terms = [
        r'ead\.\s*man\.?',           # ead. man.
        r'subscripto',                # subscripto
        r'transponit',                # transponit
        r'constanter',                # constanter
        r'perg\.\s*fol\.\s*\d*:?',   # perg. fol. 166:
        r'grec\.\s*[xk]al',           # grec. xal
        r'litt\.\s*[a-z]+',           # litt. pujo
        r'ex\.\s*vers[u]*',           # ex. versu
        r'arg\.\s*ad',                # arg. ad
        r'v\.\s*argum\.\s*ad',        # v. argum. ad
        r'v\.\s*ad\.',                # v. ad.
        r'Procop\.\s*[IVX]+\.\s*,?',  # Procop. I. ,
        r'\(unum\s+[^)]+\)',          # (unum ...)
        r'octo\s+fere',               # octo fere
    ]
    for pattern in latin_terms:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            removals.append(('LATIN_APPARATUS', match.group()))
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)

    # 6. Remove bracketed apparatus markers
    # Ὁ} 394, } 394, etc.
    bracket_pattern = r'Ὁ?\}\s*\d{2,4}'
    for match in re.finditer(bracket_pattern, text):
        removals.append(('BRACKET_NUM', match.group()))
    text = re.sub(bracket_pattern, '', text)

    # 7. Remove standalone digit sequences that look like page refs
    # e.g., isolated 839 in middle of text
    # Pattern: space + 3-4 digits + space before Greek lowercase
    # Using Unicode category approach instead of range
    def is_greek_lower(c):
        return '\u0370' <= c <= '\u03FF' or '\u1F00' <= c <= '\u1FFF'

    # Simple approach: find isolated 3-4 digit numbers surrounded by spaces
    isolated_num_pattern = r'\s+(\d{3,4})\s+'
    def replace_isolated_num(m):
        # Only remove if it looks like a page number (not a year or legitimate number)
        num = int(m.group(1))
        if 100 <= num <= 999:  # Typical page numbers
            removals.append(('ISOLATED_NUM', m.group()))
            return ' '
        return m.group(0)
    text = re.sub(isolated_num_pattern, replace_isolated_num, text)

    # 8. Remove variant reading notation (skip - too aggressive)

    # 9. Clean up multiple spaces
    text = re.sub(r'\s{2,}', ' ', text)

    # 10. Clean up orphaned punctuation
    text = re.sub(r'\s+([,;:])', r'\1', text)
    text = re.sub(r'([,;:])\s*([,;:])', r'\1', text)

    # 11. Strip leading/trailing whitespace
    text = text.strip()

    return text, removals

def process_chapter(chapter_num: int, dry_run: bool = False) -> dict:
    """Process a single chapter file."""
    filepath = DATA_DIR / f"chapter-{chapter_num:03d}.json"

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    paragraphs = data.get('sourceContent', {}).get('paragraphs', [])
    chapter_stats = {
        'total': len(paragraphs),
        'modified': 0,
        'removals': []
    }

    for para in paragraphs:
        original_text = para.get('text', '')
        cleaned_text, removals = clean_paragraph(original_text)

        stats['total_paragraphs'] += 1

        if cleaned_text != original_text:
            chapter_stats['modified'] += 1
            stats['paragraphs_modified'] += 1
            chapter_stats['removals'].extend(removals)

            for removal_type, removal_text in removals:
                stats['patterns_removed'][removal_type] += 1

            if not dry_run:
                para['text'] = cleaned_text

    if not dry_run:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Chapter {chapter_num}: Modified {chapter_stats['modified']}/{chapter_stats['total']} paragraphs")
    else:
        print(f"[DRY RUN] Chapter {chapter_num}: Would modify {chapter_stats['modified']}/{chapter_stats['total']} paragraphs")

    stats['chapters_processed'] += 1
    return chapter_stats

def main(dry_run: bool = False):
    """Main entry point."""
    print("="*80)
    print(f"EPITOME OF HISTORIES CLEANING {'(DRY RUN)' if dry_run else ''}")
    print("="*80)

    if not dry_run:
        print("\nCreating backups...")
        backup_files()

    print("\nProcessing chapters...")
    all_chapter_stats = {}

    for chapter_num in range(13, 19):
        all_chapter_stats[chapter_num] = process_chapter(chapter_num, dry_run)

    # Print summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total paragraphs processed: {stats['total_paragraphs']}")
    print(f"Paragraphs modified: {stats['paragraphs_modified']}")
    print(f"Modification rate: {stats['paragraphs_modified']/stats['total_paragraphs']*100:.1f}%")

    print("\nPatterns removed by type:")
    for pattern_type, count in stats['patterns_removed'].most_common():
        print(f"  {pattern_type}: {count}")

    print("\nPer-chapter breakdown:")
    for ch_num, ch_stats in all_chapter_stats.items():
        print(f"  Chapter {ch_num}: {ch_stats['modified']}/{ch_stats['total']} modified")

    # Save detailed removal log
    if not dry_run:
        log_path = BASE_DIR / "scripts/lib/epitome-cleaning-v3-python/cleaning_log.json"
        log_data = {
            'timestamp': datetime.now().isoformat(),
            'dry_run': dry_run,
            'stats': {
                'total_paragraphs': stats['total_paragraphs'],
                'paragraphs_modified': stats['paragraphs_modified'],
                'patterns_removed': dict(stats['patterns_removed']),
            },
            'chapter_details': {
                str(k): {
                    'total': v['total'],
                    'modified': v['modified'],
                    'sample_removals': v['removals'][:20]
                }
                for k, v in all_chapter_stats.items()
            }
        }
        with open(log_path, 'w', encoding='utf-8') as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)
        print(f"\nCleaning log saved to: {log_path}")

if __name__ == '__main__':
    import sys
    dry_run = '--dry-run' in sys.argv
    main(dry_run=dry_run)
