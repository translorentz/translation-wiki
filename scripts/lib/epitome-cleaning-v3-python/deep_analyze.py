#!/usr/bin/env python3
"""
Deep analysis of contamination patterns with context.
Extracts exact contamination strings with surrounding text to understand patterns.
"""

import json
import re
from collections import defaultdict
from pathlib import Path

BASE_DIR = Path("/Users/bryancheong/claude_projects/translation-wiki")
DATA_DIR = BASE_DIR / "data/processed/epitome-of-histories-clean"

def load_all_paragraphs() -> list:
    """Load all paragraphs from all chapters."""
    all_paras = []
    for chapter_num in range(13, 19):
        filepath = DATA_DIR / f"chapter-{chapter_num:03d}.json"
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        for para in data.get('sourceContent', {}).get('paragraphs', []):
            all_paras.append({
                'chapter': chapter_num,
                'index': para.get('index'),
                'text': para.get('text', '')
            })
    return all_paras

def find_xwp_patterns(text: str) -> list:
    """Find all Xwp-style sigla patterns."""
    # These are manuscript sigla like Rwp, Dwp, OwpDi, etc.
    patterns = []

    # Standard Xwp pattern
    for m in re.finditer(r'([A-Za-z]wp[A-Za-z]{0,4})', text):
        patterns.append(('XWP', m.group(), m.start(), text[max(0,m.start()-30):m.end()+30]))

    return patterns

def find_page_markers(text: str) -> list:
    """Find page/folio markers."""
    patterns = []

    # D HI, W HI type markers (page indicators)
    for m in re.finditer(r'([DWOB]\s*[HΠ]I[I]*)', text):
        patterns.append(('PAGE_MARKER', m.group(), m.start(), text[max(0,m.start()-30):m.end()+30]))

    # Numeric page markers like "924 " at start
    for m in re.finditer(r'^(\d{2,4})\s+', text):
        patterns.append(('PAGE_NUM_START', m.group(), m.start(), text[:60]))

    return patterns

def find_apparatus_sigla(text: str) -> list:
    """Find critical apparatus sigla (manuscript identifiers)."""
    patterns = []

    # Standalone sigla with commas: AE,, CE,, AO,, etc.
    for m in re.finditer(r'([A-Z]{2,5}),\s*', text):
        sigla = m.group(1)
        # Skip Roman numerals and common abbreviations
        if sigla in {'III', 'XII', 'XIV', 'XVI', 'XVII', 'XVIII', 'XXI', 'XXIV'}:
            continue
        patterns.append(('SIGLA_COMMA', m.group(), m.start(), text[max(0,m.start()-30):m.end()+30]))

    return patterns

def find_latin_apparatus(text: str) -> list:
    """Find Latin critical apparatus terms."""
    patterns = []

    terms = [
        r'ead\.\s*man\.?',  # ead. man. = eadem manu (same hand)
        r'subscripto',
        r'transponit',
        r'constanter',
        r'perg\.\s*fol\.',  # perg. fol. = pergament folio
        r'grec\.\s*[xk]al',  # grec. kal
        r'litt\.\s*[a-z]+',  # litt. pujo etc.
        r'ex\.\s*vers',
        r'arg\.\s*ad',
    ]

    for pattern in terms:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            patterns.append(('LATIN_APPARATUS', m.group(), m.start(), text[max(0,m.start()-30):m.end()+30]))

    return patterns

def find_bracket_apparatus(text: str) -> list:
    """Find bracketed apparatus markers."""
    patterns = []

    # Ὁ} 394 style
    for m in re.finditer(r'Ὁ\}\s*\d+', text):
        patterns.append(('BRACKET_NUM', m.group(), m.start(), text[max(0,m.start()-30):m.end()+30]))

    # Any } followed by number
    for m in re.finditer(r'\}\s*\d{2,4}', text):
        patterns.append(('BRACE_NUM', m.group(), m.start(), text[max(0,m.start()-30):m.end()+30]))

    return patterns

def find_ocr_artifacts(text: str) -> list:
    """Find likely OCR artifacts."""
    patterns = []

    # Isolated single letters followed by comma (common OCR error)
    for m in re.finditer(r'\b([a-z]),\s+(?=[A-Z])', text):
        patterns.append(('OCR_SINGLE_LETTER', m.group(), m.start(), text[max(0,m.start()-30):m.end()+30]))

    return patterns

def comprehensive_analysis():
    """Run comprehensive analysis on all paragraphs."""
    all_paras = load_all_paragraphs()

    findings = {
        'XWP': [],
        'PAGE_MARKER': [],
        'PAGE_NUM_START': [],
        'SIGLA_COMMA': [],
        'LATIN_APPARATUS': [],
        'BRACKET_NUM': [],
        'BRACE_NUM': [],
        'OCR_SINGLE_LETTER': [],
    }

    unique_patterns = defaultdict(set)

    for para in all_paras:
        text = para['text']

        for cat, match, pos, context in find_xwp_patterns(text):
            findings[cat].append({'chapter': para['chapter'], 'index': para['index'], 'match': match, 'context': context})
            unique_patterns[cat].add(match)

        for cat, match, pos, context in find_page_markers(text):
            findings[cat].append({'chapter': para['chapter'], 'index': para['index'], 'match': match, 'context': context})
            unique_patterns[cat].add(match)

        for cat, match, pos, context in find_apparatus_sigla(text):
            findings[cat].append({'chapter': para['chapter'], 'index': para['index'], 'match': match, 'context': context})
            unique_patterns[cat].add(match)

        for cat, match, pos, context in find_latin_apparatus(text):
            findings[cat].append({'chapter': para['chapter'], 'index': para['index'], 'match': match, 'context': context})
            unique_patterns[cat].add(match)

        for cat, match, pos, context in find_bracket_apparatus(text):
            findings[cat].append({'chapter': para['chapter'], 'index': para['index'], 'match': match, 'context': context})
            unique_patterns[cat].add(match)

        for cat, match, pos, context in find_ocr_artifacts(text):
            findings[cat].append({'chapter': para['chapter'], 'index': para['index'], 'match': match, 'context': context})
            unique_patterns[cat].add(match)

    # Print report
    print("="*80)
    print("DEEP CONTAMINATION ANALYSIS")
    print("="*80)

    for category, items in findings.items():
        if items:
            print(f"\n--- {category} ({len(items)} occurrences, {len(unique_patterns[category])} unique) ---")
            print(f"Unique patterns: {sorted(unique_patterns[category])}")
            print("\nSamples with context:")
            for item in items[:5]:
                print(f"  Ch{item['chapter']} P{item['index']}: {item['match']!r}")
                print(f"    Context: ...{item['context']}...")

    # Save detailed findings
    output = {
        'summary': {cat: len(items) for cat, items in findings.items()},
        'unique_patterns': {cat: list(pats) for cat, pats in unique_patterns.items()},
        'all_findings': findings
    }

    output_path = BASE_DIR / "scripts/lib/epitome-cleaning-v3-python/deep_analysis.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"\nDetailed analysis saved to: {output_path}")

if __name__ == '__main__':
    comprehensive_analysis()
