#!/usr/bin/env python3
"""
Contamination detection for Epitome of Histories Vol. 3 (Books 13-18).
Scans for known apparatus patterns, sigla, Latin editorial terms, and page markers.
"""

import json
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple

# Known contamination patterns - fixed regex character classes
SIGLA_PATTERNS = [
    r'\bRwp[JID]*t?i?\b',
    r'\bDwp\b',
    r'\bOwpDi\b',
    r'\bBwpDi\b',
    r'\bRwpJDi\b',
    r'\bRwpJDt\b',
    r'\bCDi\b',
    r'[ABCDEPWR]wp',  # Xwp patterns
    r'\bDi\s+[α-ω]',  # Di followed by Greek (simplified range)
    r'\bEp\s+[α-ω]',
    r'\bAp\s+[α-ω]',
    r'\bWo\s*lat\.',  # Wo lat.
]

PAGE_MARKERS = [
    r'[WPDM]\s*[ΠΤI]+\s*\d*',  # W ΠΙ, D ΤΙ etc
    r'D\s*HI',
    r'W\s*[ΠT][ΠI]',
    r'\)\s*\d+\s*\d+',  # ) 11 391 patterns
    r'P\s*I\d+',
    r'D\s*\d+\]',
    r'W\s*MI',  # W MI pattern
    r'MI\s+[α-ω]',  # MI followed by Greek
    r'\b[wmd]\s*[iI]\s+[α-ω]',  # lowercase variants: wi, mi, di
]

LATIN_APPARATUS = [
    r'\bead\.\s*man\.',
    r'\bsubscripto\b',
    r'\bconstanter\b',
    r'\btransponit\b',
    r'\bomisso\b',
    r'\bomissis\b',
    r'\bquod\s+tenent\b',
    r'\btypotheta\s+apud\b',
    r'\bcorr\.',
    r'\badd\.\s*[α-ω]',  # add. followed by Greek
    r'\bom\.\s*[α-ω]',   # om. followed by Greek
    r'\bl\.\s*c\.',
    r'\bcf\.',
    r'\bv\.\s*(ad|tamen)',
    r'\bextritum\b',
    r'\bin\s+marg\.',
]

VARIANT_BLOCKS = [
    r'AE,\s*[α-ω]',  # AE, followed by Greek
    r'AH,\s*[α-ω]',
    r'CE,\s*[α-ω]',
    r'AEDwwp',  # Combined sigla
]

OCR_GARBAGE = [
    r'θΠΗΤῸ',
    r'lhrob',
    r'\)\s*\dV',
    r'MI[LΙ]\s',
    r'A\s+gro',
    r'A\s+fev',
    r'Ówi\d',  # OCR misread
    r'\bxdi\b',  # xdi instead of καί
    r'\bzaod\b',  # zaod instead of Greek
]

def compile_patterns() -> List[Tuple[str, re.Pattern]]:
    """Compile all contamination patterns."""
    all_patterns = []
    for name, patterns in [
        ('sigla', SIGLA_PATTERNS),
        ('page_marker', PAGE_MARKERS),
        ('latin_apparatus', LATIN_APPARATUS),
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
            start = max(0, m.start() - 20)
            end = min(len(text), m.end() + 20)
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

    # Show sample issues
    if overall['chapters']:
        print(f"\n=== SAMPLE ISSUES ===")
        issue_count = 0
        for ch in overall['chapters']:
            for issue_group in ch['issues'][:3]:  # First 3 issues per chapter
                print(f"\nChapter {ch['chapter']}, Para {issue_group['paragraph']}:")
                for iss in issue_group['issues'][:2]:
                    print(f"  Type: {iss['type']}")
                    print(f"  Match: '{iss['match']}'")
                    print(f"  Context: ...{iss['context']}...")
                issue_count += 1
                if issue_count >= 10:
                    break
            if issue_count >= 10:
                break

    return overall_rate < 5

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
