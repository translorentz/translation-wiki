"""
Quality verification for cleaned Semeioseis Gnomikai output - V2.
V2 adds: broken word detection, apparatus marker detection, variant note detection.
"""

import re
import json
from pathlib import Path
from patterns import (
    MANUSCRIPT_SIGLA, LATIN_APPARATUS, PAGE_HEADER, ARABIC_SCRIPT,
    HEBREW_SCRIPT, GREEK_CHARS, has_greek, greek_ratio,
    BROKEN_WORD_IN_TEXT, DEGREE_MARKER, APPARATUS_VARIANT,
    APPARATUS_FOOTNOTE_REF, PAGE_REFERENCE, BIBLIO_ABBREV,
    DOUBLE_ASTERISK, EDITORIAL_BRACKETS, LATIN_ARTIFACT_IN_GREEK
)


def check_broken_words(text: str) -> list:
    """Find broken words (Greek-hyphen-space-Greek) in text."""
    return BROKEN_WORD_IN_TEXT.findall(text)


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
        'broken_word_count': 0,
        'apparatus_variant_count': 0,
        'degree_marker_count': 0,
        'editorial_bracket_count': 0,
        'ocr_noise_count': 0,
    }

    for i, para in enumerate(paragraphs):
        issues = []

        # V2: Check for broken words (highest priority)
        broken = check_broken_words(para)
        if broken:
            issues.append(f'broken_words({len(broken)})')
            results['broken_word_count'] += len(broken)

        # V2: Check for degree-sign apparatus markers
        degree_markers = DEGREE_MARKER.findall(para)
        if degree_markers:
            issues.append(f'degree_markers({len(degree_markers)})')
            results['degree_marker_count'] += len(degree_markers)

        # V2: Check for apparatus variant notes
        if APPARATUS_VARIANT.search(para):
            issues.append('apparatus_variant')
            results['apparatus_variant_count'] += 1

        if APPARATUS_FOOTNOTE_REF.search(para):
            issues.append('apparatus_footnote_ref')
            results['apparatus_variant_count'] += 1

        # V2: Check for page references
        if PAGE_REFERENCE.search(para):
            issues.append('page_reference')

        # V2: Check for editorial brackets
        if EDITORIAL_BRACKETS.search(para):
            issues.append('editorial_brackets')
            results['editorial_bracket_count'] += 1

        # V2: Check for double-asterisk notes
        if DOUBLE_ASTERISK.search(para):
            issues.append('double_asterisk')

        # V2: Check for OCR noise artifacts
        if LATIN_ARTIFACT_IN_GREEK.search(para):
            issues.append('latin_artifact')
            results['ocr_noise_count'] += 1

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

        # Check for inline footnote markers
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
    results = {
        'total': len(paragraphs),
        'very_short': 0,
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
    output_path = Path(output_dir)
    results = {
        'chapters': [],
        'total_paragraphs': 0,
        'total_contaminated': 0,
        'total_broken_words': 0,
        'overall_contamination_rate': 0,
    }

    for chapter_file in sorted(output_path.glob('chapter-*.json')):
        with open(chapter_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        validation = validate_chapter(data)
        results['chapters'].append(validation)
        results['total_paragraphs'] += validation['paragraph_count']
        results['total_contaminated'] += validation['contamination']['contaminated']
        results['total_broken_words'] += validation['contamination']['broken_word_count']

    if results['total_paragraphs'] > 0:
        results['overall_contamination_rate'] = (
            results['total_contaminated'] / results['total_paragraphs']
        )

    return results
