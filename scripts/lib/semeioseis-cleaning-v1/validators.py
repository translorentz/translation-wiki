"""
Quality verification for cleaned Semeioseis Gnomikai output.
"""

import re
import json
from pathlib import Path
from patterns import (
    MANUSCRIPT_SIGLA, LATIN_APPARATUS, PAGE_HEADER, ARABIC_SCRIPT,
    HEBREW_SCRIPT, GREEK_CHARS, has_greek, greek_ratio
)


def check_contamination(paragraphs: list) -> dict:
    """Check a list of paragraphs for remaining contamination."""
    results = {
        'total_paragraphs': len(paragraphs),
        'contaminated': 0,
        'issues': [],
        'apparatus_count': 0,
        'latin_count': 0,
        'header_count': 0,
        'foreign_script_count': 0,
        'footnote_marker_count': 0,
    }

    for i, para in enumerate(paragraphs):
        issues = []

        # Check for manuscript sigla
        if MANUSCRIPT_SIGLA.search(para):
            issues.append('manuscript_sigla')
            results['apparatus_count'] += 1

        # Check for Latin apparatus phrases
        if LATIN_APPARATUS.search(para):
            issues.append('latin_apparatus')
            results['latin_count'] += 1

        # Check for page headers embedded in text
        if re.search(r'THEODORUS\s+METOCHITA', para, re.IGNORECASE):
            issues.append('page_header')
            results['header_count'] += 1

        # Check for Arabic/foreign script
        if ARABIC_SCRIPT.search(para) or HEBREW_SCRIPT.search(para):
            issues.append('foreign_script')
            results['foreign_script_count'] += 1

        # Check for inline footnote markers like "1)" "2)" in body text
        # But not at start of sentences (which could be legitimate numbering)
        fn_markers = re.findall(r'(?<!\()\b\d{1,2}\s*\)', para)
        if fn_markers:
            issues.append(f'footnote_markers({len(fn_markers)})')
            results['footnote_marker_count'] += len(fn_markers)

        if issues:
            results['contaminated'] += 1
            results['issues'].append({
                'paragraph_index': i,
                'issues': issues,
                'snippet': para[:100]
            })

    results['contamination_rate'] = (
        results['contaminated'] / results['total_paragraphs']
        if results['total_paragraphs'] > 0 else 0
    )
    return results


def check_paragraph_coherence(paragraphs: list) -> dict:
    """Check paragraph quality (not too short, not fragments)."""
    results = {
        'total': len(paragraphs),
        'very_short': 0,  # < 20 chars
        'no_greek': 0,
        'low_greek_ratio': 0,
        'issues': [],
    }

    for i, para in enumerate(paragraphs):
        if len(para.strip()) < 20:
            results['very_short'] += 1
            results['issues'].append({
                'index': i,
                'issue': 'very_short',
                'text': para[:50]
            })
        if not has_greek(para):
            results['no_greek'] += 1
            results['issues'].append({
                'index': i,
                'issue': 'no_greek',
                'text': para[:50]
            })
        elif greek_ratio(para) < 0.5:
            results['low_greek_ratio'] += 1
            results['issues'].append({
                'index': i,
                'issue': 'low_greek_ratio',
                'ratio': greek_ratio(para),
                'text': para[:80]
            })

    return results


def validate_chapter(chapter_data: dict) -> dict:
    """Validate a single chapter's output."""
    paragraphs = chapter_data.get('sourceContent', {}).get('paragraphs', [])
    contamination = check_contamination(paragraphs)
    coherence = check_paragraph_coherence(paragraphs)
    return {
        'chapterNumber': chapter_data.get('chapterNumber'),
        'paragraph_count': len(paragraphs),
        'contamination': contamination,
        'coherence': coherence,
    }


def validate_all_chapters(output_dir: str) -> dict:
    """Validate all chapter files in output directory."""
    output_path = Path(output_dir)
    results = {
        'chapters': [],
        'total_paragraphs': 0,
        'total_contaminated': 0,
        'overall_contamination_rate': 0,
    }

    for chapter_file in sorted(output_path.glob('chapter-*.json')):
        with open(chapter_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        validation = validate_chapter(data)
        results['chapters'].append(validation)
        results['total_paragraphs'] += validation['paragraph_count']
        results['total_contaminated'] += validation['contamination']['contaminated']

    if results['total_paragraphs'] > 0:
        results['overall_contamination_rate'] = (
            results['total_contaminated'] / results['total_paragraphs']
        )

    return results
