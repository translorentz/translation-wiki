#!/usr/bin/env python3
"""
Contamination detection v2 for Epitome of Histories Vol. 3 (Books 13-18).
More conservative patterns to reduce false positives.
"""

import json
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple

# ACTUAL apparatus patterns - more specific to avoid Greek word matches
SIGLA_PATTERNS = [
    r'\bRwp[JID]+[ti]?\b',  # RwpJDi, RwpJDt, etc (compound sigla only)
    r'\bOwpDi\b',           # OwpDi
    r'\bBwpDi\b',           # BwpDi
    r'\bAEDwwp\b',          # AEDwwp (combined sigla)
    r'\bBCDi\b',            # BCDi
    r'\bACE\s+[α-ω]',       # ACE followed by Greek (variant block start)
    r'\bWo\s*lat\.',        # Wo lat.
    r'[A-Z]{2,}wp',         # Multi-letter sigla + wp
]

# Latin apparatus that should NOT appear in Greek text
LATIN_APPARATUS = [
    r'\bomissis\b',         # omissis
    r'\bomisso\b',          # omisso
    r'\bsubscripto\b',      # subscripto
    r'\bconstanter\b',      # constanter
    r'\btransponit\b',      # transponit
    r'\bextritum\b',        # extritum
    r'\bin marg\.',         # in marg.
    r'\bead\.\s*man\.',     # ead. man.
    r'\bl\.\s*c\.',         # l. c.
    r'\bv\.\s*ad\b',        # v. ad
    r'\bcod\.',             # cod.
    r'\bcf\.',              # cf.
    r'\bfalso\b',           # falso
    r'Praeterea additur',   # Praeterea additur
    r'sine spir\.',         # sine spir.
    r'\bsic\)',             # sic)
    r'\bsie\)',             # sie) - typo variant
    r'\blacuna\s+codicis',  # lacuna codicis
]

# SPECIFIC page/line markers (avoid matching Greek)
PAGE_MARKERS = [
    r'[WPDM]\s*[ΠΤ][ΠIΤ]+',  # Greek uppercase page markers: W ΠΙ, D ΤΙ
    r'\)\s*\d{2,}\s+\d+',    # ) 11 391 patterns (specific line refs)
    r'P\s*I\d{2,}',         # P I11 etc
    r'D\s*\d+\]',           # D 11] etc
]

# Variant reading blocks - MUST have sigla + comma + Greek
VARIANT_BLOCKS = [
    r'[A-Z]{2,},\s*[α-ωά-ώ]',  # AE, + Greek
    r'[A-Z]{2,}\s+[α-ωά-ώ]{4,}\s*[,;]',  # ACE word, (variant listing)
]

# OCR garbage that produces gibberish
OCR_GARBAGE = [
    r'Ówi\d',               # Ówi9 (should be Greek letter)
    r'\bzaod\b',            # zaod (OCR garbage)
    r'\bxdi\b',             # xdi (should be καί)
    r'fla-Wi',              # broken hyphenation with Latin
]

def compile_patterns() -> List[Tuple[str, re.Pattern]]:
    """Compile all contamination patterns."""
    all_patterns = []
    for name, patterns in [
        ('sigla', SIGLA_PATTERNS),
        ('latin_apparatus', LATIN_APPARATUS),
        ('page_marker', PAGE_MARKERS),
        ('variant_block', VARIANT_BLOCKS),
        ('ocr_garbage', OCR_GARBAGE),
    ]:
        for p in patterns:
            try:
                all_patterns.append((name, re.compile(p, re.IGNORECASE)))
            except re.error as e:
                print(f"Warning: Invalid pattern '{p}': {e}", file=sys.stderr)
    return all_patterns

def check_paragraph(text: str, patterns: List[Tuple[str, re.Pattern]]) -> List[Dict]:
    """Check a paragraph for contamination patterns."""
    issues = []
    for name, pattern in patterns:
        matches = list(pattern.finditer(text))
        for m in matches:
            # Get context around match
            start = max(0, m.start() - 25)
            end = min(len(text), m.end() + 25)
            context = text[start:end]
            issues.append({
                'type': name,
                'match': m.group(),
                'context': context,
                'position': m.start(),
            })
    return issues

def analyze_chapter(filepath: Path, patterns: List[Tuple[str, re.Pattern]]) -> Dict:
    """Analyze a single chapter file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    paragraphs = data.get('sourceContent', {}).get('paragraphs', [])
    results = {
        'chapter': data.get('chapterNumber', 'unknown'),
        'total_paragraphs': len(paragraphs),
        'contaminated_paragraphs': 0,
        'issues': [],
        'issue_types': {},
    }

    for para in paragraphs:
        idx = para.get('index', -1)
        text = para.get('text', '')
        para_issues = check_paragraph(text, patterns)

        if para_issues:
            results['contaminated_paragraphs'] += 1
            results['issues'].append({
                'paragraph': idx,
                'issues': para_issues,
                'text_sample': text[:200] if len(text) > 200 else text,
            })
            for issue in para_issues:
                t = issue['type']
                results['issue_types'][t] = results['issue_types'].get(t, 0) + 1

    return results

def main():
    base_dir = Path('/Users/bryancheong/claude_projects/translation-wiki/data/processed/epitome-of-histories-clean')
    patterns = compile_patterns()

    overall = {
        'total_paragraphs': 0,
        'contaminated_paragraphs': 0,
        'chapters': [],
        'all_issue_types': {},
    }

    for chapter_num in range(13, 19):
        filepath = base_dir / f'chapter-{chapter_num:03d}.json'
        if not filepath.exists():
            print(f"Warning: {filepath} not found", file=sys.stderr)
            continue

        result = analyze_chapter(filepath, patterns)
        overall['total_paragraphs'] += result['total_paragraphs']
        overall['contaminated_paragraphs'] += result['contaminated_paragraphs']
        overall['chapters'].append(result)

        for t, count in result['issue_types'].items():
            overall['all_issue_types'][t] = overall['all_issue_types'].get(t, 0) + count

        rate = result['contaminated_paragraphs'] / result['total_paragraphs'] * 100 if result['total_paragraphs'] > 0 else 0
        print(f"Chapter {result['chapter']}: {result['contaminated_paragraphs']}/{result['total_paragraphs']} contaminated ({rate:.1f}%)")

    overall_rate = overall['contaminated_paragraphs'] / overall['total_paragraphs'] * 100 if overall['total_paragraphs'] > 0 else 0

    print(f"\n=== OVERALL ===")
    print(f"Total paragraphs: {overall['total_paragraphs']}")
    print(f"Contaminated: {overall['contaminated_paragraphs']}")
    print(f"Contamination rate: {overall_rate:.1f}%")
    print(f"\nIssue types:")
    for t, count in sorted(overall['all_issue_types'].items(), key=lambda x: -x[1]):
        print(f"  {t}: {count}")

    # Grade
    if overall_rate < 5:
        grade = 'B+ or higher - APPROVED'
    elif overall_rate < 10:
        grade = 'B'
    elif overall_rate < 15:
        grade = 'C+'
    elif overall_rate < 20:
        grade = 'D+'
    else:
        grade = 'D or lower'

    print(f"\n=== GRADE: {grade} ===")

    # Show all issues for detailed review
    if overall['chapters']:
        print(f"\n=== ALL ISSUES ===")
        for ch in overall['chapters']:
            for issue_group in ch['issues']:
                print(f"\nChapter {ch['chapter']}, Para {issue_group['paragraph']}:")
                for iss in issue_group['issues']:
                    print(f"  Type: {iss['type']}")
                    print(f"  Match: '{iss['match']}'")
                    print(f"  Context: ...{iss['context']}...")

    return overall_rate < 5

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
