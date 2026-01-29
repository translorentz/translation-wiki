#!/usr/bin/env python3
"""
Clean contamination from Epitome of Histories chapter files.
Version 2: Improved patterns based on deep analysis.
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

    # 1. Remove page numbers at paragraph start
    # Pattern: 2-4 digit number at start, followed by space and capital/quoted Greek
    match = re.match(r'^(\d{2,4})\s+(?=[Α-ΩἈ-ὭἊὊ"\'Ὁ])', text)
    if match:
        text = text[match.end():]
        removals.append(('PAGE_NUM_START', match.group()))

    # 2. Remove ALL sigla+wp patterns (the core contamination)
    # These look like: AEDwwp2Di, BCwp, ARwp, OwpDt, CEBswpJX, etc.
    # Pattern: optional leading letters/digits + wp + optional trailing letters/digits
    # But make sure not to match Greek words that happen to contain 'wp'

    # Comprehensive wp sigla pattern
    # Matches: optional 0-6 capital letters/digits + optional lowercase letters + wp + optional trailing chars
    wp_pattern = r'[A-Za-z0-9]{0,6}[wW][pP][A-Za-z0-9IiJjDd]{0,6}'

    for match in re.finditer(wp_pattern, text):
        matched = match.group()
        # Validate: should contain at least one capital letter (sigla marker)
        if re.search(r'[A-Z]', matched) or matched.startswith(('wp', 'Wp', 'wP', 'WP')):
            removals.append(('WP_SIGLA', matched))

    # Remove all wp sigla patterns
    text = re.sub(wp_pattern, '', text)

    # 3. Remove page/folio markers (D HI, W HI, W HII, etc.)
    page_marker_pattern = r'[DWOB]\s*[HΠ]I{1,3}\d*'
    for match in re.finditer(page_marker_pattern, text):
        removals.append(('PAGE_MARKER', match.group()))
    text = re.sub(page_marker_pattern, '', text)

    # 4. Remove manuscript sigla with commas
    # Pattern: 2-6 capital letters followed by comma (but not Roman numerals)
    roman_numerals = {'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII', 'XIII',
                      'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII',
                      'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX'}

    def replace_sigla(m):
        sigla = m.group(1)
        if sigla in roman_numerals:
            return m.group(0)  # Keep Roman numerals
        removals.append(('SIGLA_COMMA', m.group()))
        return ''

    sigla_pattern = r'\b([A-Z]{2,6}),\s*'
    text = re.sub(sigla_pattern, replace_sigla, text)

    # 5. Remove Latin apparatus terms
    latin_terms = [
        r'ead\.\s*man\.?',           # ead. man.
        r'subscripto',
        r'transponit',
        r'constanter',
        r'perg\.\s*fol\.\s*\d*:?',   # perg. fol. 166:
        r'grec\.\s*[xk]al',           # grec. xal
        r'litt\.\s*[a-z]+',           # litt. pujo
        r'ex\.?\s*vers[u]*',          # ex. versu
        r'arg\.\s*ad',                # arg. ad
        r'v\.\s*argum\.\s*ad',        # v. argum. ad
        r'v\.\s*ad\.\s*[A-Z]*,?',     # v. ad. XI,
        r'Procop\.\s*[IVX]*\.\s*,?',  # Procop. I. ,
        r'\(unum\s+[^)]+\)',          # (unum ...)
        r'octo\s+fere',               # octo fere
        r'cet\.\s*',                  # cet.
        r'tres\s+',                   # tres (Latin for "three" in apparatus)
        r'mss\."\s*:\s*Duc\)',        # mss.": Duc)
        r'Zeilf\.',                   # Zeilf.
        r'Scey\w*',                   # Scey... (abbreviation)
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

    # 7. Remove standalone sigla patterns that might remain
    # Single uppercase letters followed by comma when it looks like variant notation
    # e.g., "O, ἀδανάρσην" - the "O, " part
    # Use Unicode blocks instead of problematic ranges
    # Greek: \u0370-\u03FF and Extended Greek: \u1F00-\u1FFF
    standalone_sigla = r'\b([A-Z])\s*,\s+(?=[\u0370-\u03FF\u1F00-\u1FFF])'
    for match in re.finditer(standalone_sigla, text):
        removals.append(('STANDALONE_SIGLA', match.group()))
    text = re.sub(standalone_sigla, '', text)

    # 8. Remove isolated page numbers in text (like "839 " in middle)
    # Be careful: only remove when clearly a page marker (3-digit number isolated)
    isolated_num_pattern = r'\s(\d{3})\s(?=[\u0370-\u03FF\u1F00-\u1FFF])'
    for match in re.finditer(isolated_num_pattern, text):
        removals.append(('ISOLATED_NUM', match.group()))
    text = re.sub(isolated_num_pattern, ' ', text)

    # 9. Remove residual apparatus notation patterns
    # "(8ic)", "—— oor.", "/of.", etc.
    residual_patterns = [
        r'\(8ic\)',           # (8ic)
        r'——\s*oor\.',        # —— oor.
        r'/of\.',             # /of.
        r'μ-\s*',             # trailing μ- artifacts
        r'—\s*doyovra',       # — doyovra (corrupted)
        r'£i\s+',             # £i (OCR error for et)
        r'»\s*',              # » (quote marks from apparatus)
        r'p\*\s*',            # p* (MS indicator)
        r'Duc\)',             # Duc)
        r'\bAlt\b,?',         # Alt (apparatus term)
        r'\bmu-\b',           # mu-
        r'\(\s*\)',           # empty parentheses left over
    ]
    for pattern in residual_patterns:
        for match in re.finditer(pattern, text):
            removals.append(('RESIDUAL', match.group()))
        text = re.sub(pattern, '', text)

    # 10. Clean up multiple spaces and orphaned punctuation
    text = re.sub(r'\s{2,}', ' ', text)
    text = re.sub(r'\s+([,;:\.])', r'\1', text)
    text = re.sub(r'([,;:])\s*([,;:])', r'\1', text)
    text = re.sub(r'^\s*[,;:]\s*', '', text)  # Leading punctuation
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
    print(f"EPITOME OF HISTORIES CLEANING V2 {'(DRY RUN)' if dry_run else ''}")
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

    # Show sample removals
    print("\nSample removals:")
    sample_count = 0
    for ch_num, ch_stats in all_chapter_stats.items():
        for removal_type, removal_text in ch_stats['removals'][:5]:
            print(f"  [{removal_type}] {removal_text!r}")
            sample_count += 1
            if sample_count >= 30:
                break
        if sample_count >= 30:
            break

    # Save detailed removal log
    log_path = BASE_DIR / "scripts/lib/epitome-cleaning-v3-python/cleaning_log_v2.json"
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
                'sample_removals': v['removals'][:50]
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
