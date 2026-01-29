#!/usr/bin/env python3
"""
Final evaluation of Epitome Vol. 3 cleaning.
Focus on patterns that actually cause translation problems.
"""

import json
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple

# CRITICAL patterns - these WILL cause translation problems
CRITICAL_PATTERNS = [
    # Latin apparatus terms that should NEVER appear
    (r'\bomissis\b', 'latin_apparatus', 'omissis'),
    (r'\bomisso\b', 'latin_apparatus', 'omisso'),
    (r'\bsubscripto\b', 'latin_apparatus', 'subscripto'),
    (r'\bconstanter\b', 'latin_apparatus', 'constanter'),
    (r'\btransponit\b', 'latin_apparatus', 'transponit'),
    (r'\bextritum\b', 'latin_apparatus', 'extritum'),
    (r'Praeterea additur', 'latin_apparatus', 'Praeterea additur'),
    (r'sine spir\.', 'latin_apparatus', 'sine spir.'),
    (r'lacuna codicis', 'latin_apparatus', 'lacuna codicis'),
    (r'\bead\.\s*man\.', 'latin_apparatus', 'ead. man.'),
    (r'in marg\.', 'latin_apparatus', 'in marg.'),
    (r'\bfalso\b', 'latin_apparatus', 'falso'),
    (r'sequuntur in cod\.', 'latin_apparatus', 'sequuntur in cod.'),

    # Compound manuscript sigla (not single letters)
    (r'\bRwp[JID]+[ti]?\b', 'sigla', 'Rwp compound'),
    (r'\bOwpDi\b', 'sigla', 'OwpDi'),
    (r'\bBwpDi\b', 'sigla', 'BwpDi'),
    (r'\bAEDwwp\b', 'sigla', 'AEDwwp'),
    (r'\bBCDi\b', 'sigla', 'BCDi'),
    (r'\bBCWo\b', 'sigla', 'BCWo'),

    # Clear variant reading blocks with sigla
    (r'[A-Z]{2,}\*?\s*Di,', 'variant_block', 'Sigla Di,'),
    (r'v\.\s*ad\s+[IVXLC]+', 'cross_reference', 'v. ad + Roman numeral'),
]

def analyze_all_chapters() -> Dict:
    """Analyze all chapters and return results."""
    base_dir = Path('/Users/bryancheong/claude_projects/translation-wiki/data/processed/epitome-of-histories-clean')

    patterns = []
    for pattern_str, category, desc in CRITICAL_PATTERNS:
        try:
            patterns.append((re.compile(pattern_str, re.IGNORECASE), category, desc))
        except re.error as e:
            print(f"Warning: Invalid pattern '{pattern_str}': {e}", file=sys.stderr)

    overall = {
        'total_paragraphs': 0,
        'contaminated_paragraphs': 0,
        'chapters': {},
        'all_issues': [],
    }

    for chapter_num in range(13, 19):
        filepath = base_dir / f'chapter-{chapter_num:03d}.json'
        if not filepath.exists():
            continue

        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        paragraphs = data.get('sourceContent', {}).get('paragraphs', [])
        chapter_results = {
            'total': len(paragraphs),
            'contaminated': 0,
            'issues': [],
        }

        for para in paragraphs:
            idx = para.get('index', -1)
            text = para.get('text', '')

            para_issues = []
            for pattern, category, desc in patterns:
                for m in pattern.finditer(text):
                    start = max(0, m.start() - 30)
                    end = min(len(text), m.end() + 30)
                    para_issues.append({
                        'category': category,
                        'description': desc,
                        'match': m.group(),
                        'context': text[start:end],
                    })

            if para_issues:
                chapter_results['contaminated'] += 1
                chapter_results['issues'].append({
                    'paragraph': idx,
                    'issues': para_issues,
                })
                overall['all_issues'].append({
                    'chapter': chapter_num,
                    'paragraph': idx,
                    'issues': para_issues,
                })

        overall['chapters'][chapter_num] = chapter_results
        overall['total_paragraphs'] += chapter_results['total']
        overall['contaminated_paragraphs'] += chapter_results['contaminated']

    return overall

def main():
    results = analyze_all_chapters()

    print("=" * 70)
    print("EPITOME VOL. 3 EVALUATION REPORT - FINAL ASSESSMENT")
    print("=" * 70)
    print()

    # Per-chapter breakdown
    print("PER-CHAPTER BREAKDOWN:")
    print("-" * 50)
    for ch_num in range(13, 19):
        ch = results['chapters'].get(ch_num, {'total': 0, 'contaminated': 0})
        rate = ch['contaminated'] / ch['total'] * 100 if ch['total'] > 0 else 0
        status = "PASS" if rate < 5 else "FAIL"
        print(f"  Chapter {ch_num}: {ch['contaminated']}/{ch['total']} contaminated ({rate:.1f}%) - {status}")

    print()

    # Overall
    overall_rate = results['contaminated_paragraphs'] / results['total_paragraphs'] * 100 if results['total_paragraphs'] > 0 else 0
    print("OVERALL STATISTICS:")
    print("-" * 50)
    print(f"  Total paragraphs: {results['total_paragraphs']}")
    print(f"  Contaminated: {results['contaminated_paragraphs']}")
    print(f"  Contamination rate: {overall_rate:.1f}%")

    # Category breakdown
    categories = {}
    for issue in results['all_issues']:
        for iss in issue['issues']:
            cat = iss['category']
            categories[cat] = categories.get(cat, 0) + 1

    print()
    print("ISSUES BY CATEGORY:")
    print("-" * 50)
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")

    # Grade
    print()
    print("=" * 70)
    if overall_rate < 5:
        grade = "B+"
        status = "APPROVED FOR TRANSLATION"
    elif overall_rate < 10:
        grade = "B"
        status = "MARGINAL - Consider additional cleaning"
    elif overall_rate < 15:
        grade = "C+"
        status = "NOT APPROVED - Significant contamination"
    else:
        grade = "D or lower"
        status = "NOT APPROVED - Heavy contamination"

    print(f"GRADE: {grade}")
    print(f"STATUS: {status}")
    print("=" * 70)

    # Sample issues
    if results['all_issues']:
        print()
        print("SAMPLE ISSUES (first 15):")
        print("-" * 50)
        for i, issue in enumerate(results['all_issues'][:15]):
            print(f"\n{i+1}. Chapter {issue['chapter']}, Para {issue['paragraph']}:")
            for iss in issue['issues'][:2]:
                print(f"   - [{iss['category']}] {iss['description']}")
                print(f"     Match: '{iss['match']}'")
                print(f"     Context: ...{iss['context']}...")

    return overall_rate < 5

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
