#!/usr/bin/env python3
"""Evaluate consolidated Epitome of Histories chapters for apparatus contamination."""

import json
import re
import sys
from pathlib import Path
from collections import defaultdict

# TRUE contamination patterns — Latin apparatus terms that should NOT appear in Greek text
CONTAMINATION_PATTERNS = [
    # Latin apparatus terms (case-insensitive where noted)
    (r'\bomissis\b', 'Latin apparatus: omissis', True),
    (r'\bsubscripto\b', 'Latin apparatus: subscripto', True),
    (r'\bconstanter\b', 'Latin apparatus: constanter', True),
    (r'\bead\.?\s*man\.?', 'Latin apparatus: ead. man.', True),
    (r'\bsine\s+spir\.?', 'Latin apparatus: sine spir.', True),
    (r'\bPraeterea\s+additur', 'Latin apparatus: Praeterea additur', False),
    (r'\bsequuntur\s+in\s+cod', 'Latin apparatus: sequuntur in cod.', True),
    (r'\blacuna\s+codicis', 'Latin apparatus: lacuna codicis', True),
    (r'\bin\s+marg\.', 'Latin apparatus: in marg.', True),
    (r'\bsupra\s+lin\.', 'Latin apparatus: supra lin.', True),
    (r'\bpost\s+corr\.', 'Latin apparatus: post corr.', True),
    (r'\bante\s+corr\.', 'Latin apparatus: ante corr.', True),
    (r'\bfol\.\s*\d', 'Latin apparatus: fol. number', False),
    (r'\baddidit\b', 'Latin apparatus: addidit', True),
    (r'\bdeleuit\b', 'Latin apparatus: deleuit', True),
    (r'\bdeest\s+in\b', 'Latin apparatus: deest in', True),

    # Apparatus with sigla: "om. BCD", "add. AE", "leg. Di"
    (r'\bom\.\s+[A-Z]{2,}', 'Apparatus: om. + sigla', False),
    (r'\badd\.\s+[A-Z]{2,}', 'Apparatus: add. + sigla', False),
    (r'\bleg\.\s+[A-Z]{2,}', 'Apparatus: leg. + sigla', False),

    # Cross-references
    (r'\bv\.\s*ad\s+[IVXLC]+', 'Cross-reference: v. ad', False),
    (r'\bvid\.\s+ad\b', 'Cross-reference: vid. ad', False),

    # Page/folio refs in Latin
    (r'\bpag\.\s*\d+', 'Page reference: pag. N', False),

    # Editorial notes embedded in text
    (r'\binscription\w+\s+habet\b', 'Editorial: inscriptionem habet', True),
    (r'\bexcerptum\b', 'Editorial: excerptum', True),
    (r'\bscribendum\s+est\b', 'Editorial: scribendum est', True),
    (r'\bcodices\b', 'Editorial: codices', True),
    (r'\bDionis\s+(?:excerptum|codices|libro)', 'Editorial: Dionis reference', True),
    (r'\bPlanud\.\s*\d+', 'Editorial: Planud. reference', False),
    (r'\baliis\s+verbis\s+in\b', 'Editorial: aliis verbis in', True),

    # Compound manuscript sigla (3+ uppercase Latin letters NOT followed by Greek)
    # Only flag ones that look like actual sigla patterns: BCDE, ACDi, RwpJDt, etc.
    (r'\b[A-Z]{2}[a-z]?[A-Z][a-z]?\b', 'Compound siglum (e.g. BCDi)', False),

    # Apparatus brackets with Latin content
    (r'\([A-Za-z]+\s+nota\b', 'Apparatus note in parens', False),

    # "cap." as chapter reference in Latin
    (r'\bcap\.\s*\d+', 'Latin chapter reference: cap. N', False),

    # Proverb/biblical refs in Latin
    (r'\bProverb\.\s*[IVXLC]+', 'Latin biblical reference', False),

    # "his:" as apparatus note intro
    (r'\bhis:\s+[a-z]', 'Apparatus intro: his:', False),

    # Regii as manuscript name
    (r'^Regii\b', 'Manuscript name: Regii', False),

    # "Dio libro" type references
    (r'\bDio\s+libro\b', 'Editorial: Dio libro', True),

    # Double brackets (apparatus)
    (r'\[\[.+?\]\]', 'Double brackets (apparatus)', False),
]

def load_chapter(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def check_contamination(text, para_idx):
    findings = []
    for pattern, desc, case_insensitive in CONTAMINATION_PATTERNS:
        flags = re.IGNORECASE if case_insensitive else 0
        for m in re.finditer(pattern, text, flags):
            ctx_start = max(0, m.start() - 40)
            ctx_end = min(len(text), m.end() + 40)
            findings.append({
                'para_idx': para_idx,
                'description': desc,
                'match': m.group(),
                'context': text[ctx_start:ctx_end],
            })
    return findings

def check_paragraph_quality(paragraphs):
    issues = []
    for p in paragraphs:
        idx = p['index']
        text = p['text']

        if len(text.strip()) < 20:
            issues.append((idx, f'Orphaned fragment ({len(text.strip())} chars): "{text.strip()}"'))

        latin_chars = len(re.findall(r'[a-zA-Z]', text))
        greek_chars = len(re.findall(r'[\u0370-\u03FF\u1F00-\u1FFF]', text))
        total = latin_chars + greek_chars
        if total > 50 and latin_chars > 0.6 * total:
            issues.append((idx, f'High Latin ratio ({latin_chars}/{total} = {latin_chars/total:.0%})'))

        if len(text) > 5000:
            issues.append((idx, f'Very long paragraph ({len(text)} chars)'))

    return issues

def evaluate_chapter(filepath):
    data = load_chapter(filepath)
    chapter_num = data.get('chapterNumber', '?')
    paragraphs = data.get('sourceContent', {}).get('paragraphs', [])

    total_chars = sum(len(p['text']) for p in paragraphs)
    total_paras = len(paragraphs)

    all_findings = []
    for p in paragraphs:
        all_findings.extend(check_contamination(p['text'], p['index']))

    contaminated_chars = sum(len(f['match']) for f in all_findings)
    quality_issues = check_paragraph_quality(paragraphs)

    rate = contaminated_chars / total_chars * 100 if total_chars > 0 else 0
    if rate < 2: grade = 'A'
    elif rate < 5: grade = 'B+'
    elif rate < 8: grade = 'B'
    elif rate < 15: grade = 'C'
    else: grade = 'D'

    return {
        'chapter': chapter_num,
        'total_paragraphs': total_paras,
        'total_chars': total_chars,
        'findings': all_findings,
        'contaminated_chars': contaminated_chars,
        'contamination_rate': rate,
        'quality_issues': quality_issues,
        'grade': grade,
    }

def main():
    directory = sys.argv[1] if len(sys.argv) > 1 else 'data/processed/epitome-of-histories-final'
    path = Path(directory)
    if not path.exists():
        print(f"Directory {directory} does not exist yet.")
        sys.exit(1)

    files = sorted(path.glob('chapter-*.json'))
    if not files:
        print(f"No chapter files found in {directory}")
        sys.exit(1)

    print(f"Evaluating {len(files)} chapters in {directory}\n")
    print("=" * 80)

    all_results = []
    for f in files:
        result = evaluate_chapter(f)
        all_results.append(result)

        print(f"\nBook {result['chapter']}: {result['total_paragraphs']} paras, {result['total_chars']} chars")
        print(f"  Grade: {result['grade']} ({result['contamination_rate']:.2f}%, {len(result['findings'])} findings)")

        if result['findings']:
            for finding in result['findings'][:8]:
                print(f"    [para {finding['para_idx']}] {finding['description']}: \"{finding['match']}\"")
                print(f"      ...{finding['context']}...")
            if len(result['findings']) > 8:
                print(f"    ... and {len(result['findings']) - 8} more")

        if result['quality_issues']:
            for idx, issue in result['quality_issues'][:5]:
                print(f"    [Q para {idx}] {issue}")
            if len(result['quality_issues']) > 5:
                print(f"    ... and {len(result['quality_issues']) - 5} more quality issues")

    print("\n" + "=" * 80)
    print("\nSUMMARY")
    print("-" * 50)
    for r in all_results:
        print(f"  Book {r['chapter']:>2}: Grade {r['grade']:>2} ({r['contamination_rate']:.2f}%, {len(r['findings'])} findings)")

    all_a = all(r['grade'] == 'A' for r in all_results)
    print(f"\n{'ALL GRADE A - APPROVED' if all_a else 'NOT YET APPROVED'}")

if __name__ == '__main__':
    main()
