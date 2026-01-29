"""
Quality verification for cleaned Semeioseis Gnomikai output - V3.
V3 adds: unhyphenated broken word detection, Latin word detection in body text.
"""

import re
import json
from pathlib import Path
from patterns import (
    MANUSCRIPT_SIGLA, LATIN_APPARATUS, PAGE_HEADER, ARABIC_SCRIPT,
    HEBREW_SCRIPT, GREEK_CHARS, has_greek, greek_ratio,
    BROKEN_WORD_IN_TEXT, DEGREE_MARKER, APPARATUS_VARIANT,
    APPARATUS_FOOTNOTE_REF, PAGE_REFERENCE, BIBLIO_ABBREV,
    DOUBLE_ASTERISK, EDITORIAL_BRACKETS, LATIN_ARTIFACT_IN_GREEK,
    LATIN_EDITORIAL_WORDS, SIGLA_PATTERN, is_greek_char, greek_char_count
)


from patterns import VALID_SHORT_GREEK


def detect_unhyphenated_breaks(text: str) -> list:
    """
    V3: Detect spaces within Greek words that result from unhyphenated line breaks.
    CONSERVATIVE: Only flag fragments of 1-3 Greek chars that are NOT valid standalone words.
    """
    issues = []
    # Pattern: Short Greek fragment (1-3 chars) followed by space then Greek continuation
    pattern = re.compile(
        r'(?:^|(?<=\s))'
        r'([\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F\u1DC0-\u1DFF]{1,3})'
        r'\s+'
        r'([\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F\u1DC0-\u1DFF]{2,})'
        r'(?=[\s\.\,\;\:\·]|$)'
    )
    for m in pattern.finditer(text):
        frag = m.group(1)
        if frag in VALID_SHORT_GREEK:
            continue
        if not GREEK_CHARS.search(frag):
            continue
        # Must have at least 1 Greek letter
        if greek_char_count(frag) < 1:
            continue
        # V4: Skip standalone breathing marks / diacriticals (not real word fragments)
        stripped_frag = frag.strip('\u0300\u0301\u0313\u0314\u0342\u0345\u1FBD\u1FBF\u1FC0\u1FC1\u1FCD\u1FCE\u1FCF\u1FDD\u1FDE\u1FDF\u1FED\u1FEE\u1FEF\u1FFD\u1FFE\u0027\u2019')
        if not stripped_frag or all(ord(c) in range(0x0300, 0x036F+1) or ord(c) in range(0x1DC0, 0x1DFF+1) for c in stripped_frag):
            continue
        # V4: Skip elided forms (ending with ᾽ or ')
        if frag.endswith('᾽') or frag.endswith('\u1fbd') or frag.endswith("'"):
            continue
        issues.append(f"{frag} {m.group(2)}")
    return issues


def detect_latin_in_body(text: str) -> list:
    """V3: Detect Latin editorial words/phrases in body text."""
    issues = []
    for m in LATIN_EDITORIAL_WORDS.finditer(text):
        word = m.group(0)
        # Skip very short common words that could be noise (et, in, etc.)
        if len(word) <= 3:
            continue
        issues.append(word)
    # Also check for sigla (skip very short ones like "C.")
    for m in SIGLA_PATTERN.finditer(text):
        s = m.group(0).strip()
        if len(s) > 3:  # Only flag sigla longer than "C."
            issues.append(s)
    return issues


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
        'unhyphenated_break_count': 0,
        'apparatus_variant_count': 0,
        'degree_marker_count': 0,
        'editorial_bracket_count': 0,
        'ocr_noise_count': 0,
        'latin_in_body_count': 0,
    }

    for i, para in enumerate(paragraphs):
        issues = []

        # V2: Check for hyphenated broken words
        broken = check_broken_words(para)
        if broken:
            issues.append(f'broken_words({len(broken)})')
            results['broken_word_count'] += len(broken)

        # V3: Check for unhyphenated broken words
        unhyph = detect_unhyphenated_breaks(para)
        if unhyph:
            issues.append(f'unhyphenated_breaks({len(unhyph)}): {unhyph[:3]}')
            results['unhyphenated_break_count'] += len(unhyph)

        # V3: Check for Latin words in body text
        latin_words = detect_latin_in_body(para)
        if latin_words:
            issues.append(f'latin_in_body({len(latin_words)}): {latin_words[:3]}')
            results['latin_in_body_count'] += len(latin_words)

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

        # V2: Check for editorial brackets
        if EDITORIAL_BRACKETS.search(para):
            issues.append('editorial_brackets')
            results['editorial_bracket_count'] += 1

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


def check_title_markers(title: str) -> list:
    """V3: Check for asterisk/footnote markers in chapter titles."""
    issues = []
    if re.search(r'\*\s*\)', title):
        issues.append('asterisk_marker: *)')
    if re.search(r'\d\s*\)', title):
        issues.append(f'number_marker in title')
    if '***' in title:
        issues.append('triple_asterisk')
    return issues


def validate_chapter(chapter_data: dict) -> dict:
    paragraphs = chapter_data.get('sourceContent', {}).get('paragraphs', [])
    contamination = check_contamination(paragraphs)
    coherence = check_paragraph_coherence(paragraphs)
    title = chapter_data.get('title', '')
    title_issues = check_title_markers(title)
    return {
        'chapterNumber': chapter_data.get('chapterNumber'),
        'title': title,
        'paragraph_count': len(paragraphs),
        'contamination': contamination,
        'coherence': coherence,
        'title_issues': title_issues,
    }


def validate_all_chapters(output_dir: str) -> dict:
    output_path = Path(output_dir)
    results = {
        'chapters': [],
        'total_paragraphs': 0,
        'total_contaminated': 0,
        'total_broken_words': 0,
        'total_unhyphenated_breaks': 0,
        'total_latin_in_body': 0,
        'total_title_issues': 0,
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
        results['total_unhyphenated_breaks'] += validation['contamination']['unhyphenated_break_count']
        results['total_latin_in_body'] += validation['contamination']['latin_in_body_count']
        results['total_title_issues'] += len(validation['title_issues'])

    if results['total_paragraphs'] > 0:
        results['overall_contamination_rate'] = (
            results['total_contaminated'] / results['total_paragraphs']
        )

    return results
