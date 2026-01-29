#!/usr/bin/env python3
"""
Validate the cleaned output by checking for remaining contamination.
Calculates contamination rate and grades the result.
"""

import json
import re
from collections import Counter
from pathlib import Path

BASE_DIR = Path("/Users/bryancheong/claude_projects/translation-wiki")
DATA_DIR = BASE_DIR / "data/processed/epitome-of-histories-clean"

def check_paragraph(text: str) -> list:
    """Check a paragraph for remaining contamination."""
    issues = []

    # Check for wp patterns
    wp_matches = list(re.finditer(r'[A-Za-z0-9]{0,4}[wW][pP][A-Za-z0-9]{0,4}', text))
    for m in wp_matches:
        # Check if it has sigla characteristics
        if re.search(r'[A-Z]', m.group()):
            issues.append(('WP_SIGLA', m.group(), m.start()))

    # Check for page markers
    page_markers = list(re.finditer(r'[DWOB]\s*[HΠ]I{1,3}', text))
    for m in page_markers:
        issues.append(('PAGE_MARKER', m.group(), m.start()))

    # Check for sigla with commas (non-Roman)
    roman = {'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII', 'XIII', 'XIV', 'XV',
             'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV'}
    sigla_matches = list(re.finditer(r'\b([A-Z]{2,5}),\s', text))
    for m in sigla_matches:
        if m.group(1) not in roman:
            issues.append(('SIGLA_COMMA', m.group(), m.start()))

    # Check for Latin apparatus terms
    latin_terms = [
        r'ead\.\s*man\.?',
        r'perg\.\s*fol\.',
        r'grec\.\s*[xk]al',
        r'v\.\s*ad\.',
        r'v\.\s*argum\.',
        r'Procop\.',
        r'cet\.',
    ]
    for pattern in latin_terms:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            issues.append(('LATIN_APPARATUS', m.group(), m.start()))

    # Check for obvious apparatus artifacts
    artifacts = [
        r'Ὁ\}\s*\d+',  # Ὁ} 394
        r'\(8ic\)',
        r'——\s*oor\.',
        r'/of\.',
    ]
    for pattern in artifacts:
        for m in re.finditer(pattern, text):
            issues.append(('ARTIFACT', m.group(), m.start()))

    return issues

def validate_all_chapters():
    """Validate all chapter files and compute contamination rate."""
    total_paragraphs = 0
    contaminated_paragraphs = 0
    all_issues = []
    issue_types = Counter()

    for chapter_num in range(13, 19):
        filepath = DATA_DIR / f"chapter-{chapter_num:03d}.json"
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        paragraphs = data.get('sourceContent', {}).get('paragraphs', [])
        chapter_contaminated = 0

        for para in paragraphs:
            text = para.get('text', '')
            total_paragraphs += 1

            issues = check_paragraph(text)
            if issues:
                contaminated_paragraphs += 1
                chapter_contaminated += 1
                for issue_type, matched, pos in issues:
                    issue_types[issue_type] += 1
                    if len(all_issues) < 50:
                        all_issues.append({
                            'chapter': chapter_num,
                            'para_idx': para.get('index'),
                            'type': issue_type,
                            'match': matched,
                            'context': text[max(0,pos-30):pos+len(matched)+30]
                        })

        print(f"Chapter {chapter_num}: {chapter_contaminated}/{len(paragraphs)} contaminated")

    # Calculate rate
    rate = contaminated_paragraphs / total_paragraphs * 100 if total_paragraphs > 0 else 0

    print("\n" + "="*60)
    print("VALIDATION RESULTS")
    print("="*60)
    print(f"Total paragraphs: {total_paragraphs}")
    print(f"Contaminated paragraphs: {contaminated_paragraphs}")
    print(f"Contamination rate: {rate:.1f}%")

    # Grade
    if rate < 3:
        grade = 'A'
    elif rate < 5:
        grade = 'B+'
    elif rate < 10:
        grade = 'B'
    elif rate < 15:
        grade = 'C+'
    elif rate < 20:
        grade = 'C'
    else:
        grade = 'D'

    print(f"\nGRADE: {grade}")
    print(f"(Target: < 5% for B+ or better)")

    print("\nIssue breakdown:")
    for issue_type, count in issue_types.most_common():
        print(f"  {issue_type}: {count}")

    if all_issues:
        print("\nSample remaining issues:")
        for issue in all_issues[:20]:
            print(f"  Ch{issue['chapter']} P{issue['para_idx']}: [{issue['type']}] '{issue['match']}'")
            print(f"    ...{issue['context']}...")

    return rate, grade, all_issues

if __name__ == '__main__':
    validate_all_chapters()
