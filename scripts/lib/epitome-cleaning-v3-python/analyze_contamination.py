#!/usr/bin/env python3
"""
Analyze contamination in Epitome of Histories chapter files.
Scans all paragraphs to identify exact contamination patterns.
"""

import json
import re
import os
from collections import Counter, defaultdict
from pathlib import Path

# Base paths
BASE_DIR = Path("/Users/bryancheong/claude_projects/translation-wiki")
DATA_DIR = BASE_DIR / "data/processed/epitome-of-histories-clean"

# Known contamination patterns to search for
KNOWN_PATTERNS = [
    # Sigla combinations
    r'[RDOWB]wp[JDit]*',  # Rwp, Dwp, RwpJDi, etc.
    r'[A-Z][wW][pP]',  # Generic Xwp pattern

    # Variant blocks
    r'[A-Z]{1,2},\s*(?=[A-Z]|$)',  # AE,, CE,, AH, etc.

    # Page markers
    r'[DWO]\s*[HΠ]I',  # D HI, W ΠI, etc.
    r'Ὁ\}\s*\d+',  # Ὁ} 394

    # Latin apparatus terms
    r'\b(?:ead\.?\s*man\.?|subscripto|transponit|constanter)\b',

    # Additional apparatus markers
    r'\b(?:om\.|add\.|del\.)\b',
    r'\[\d+\]',  # [123] style markers
    r'{\d+}',  # {123} style markers
]

def load_chapter(chapter_num: int) -> dict:
    """Load a chapter JSON file."""
    filepath = DATA_DIR / f"chapter-{chapter_num:03d}.json"
    if not filepath.exists():
        return None
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_suspicious_tokens(text: str) -> list:
    """Extract tokens that look like apparatus contamination."""
    suspicious = []

    # Find all-caps sequences that might be sigla
    caps_pattern = r'\b[A-Z]{2,5}\b'
    for match in re.finditer(caps_pattern, text):
        token = match.group()
        # Skip common Greek/Latin abbreviations
        if token not in {'THE', 'AND', 'FOR', 'BUT', 'NOT', 'ALL', 'THIS', 'WITH'}:
            suspicious.append(('CAPS', token, match.start()))

    # Find Xwp patterns
    xwp_pattern = r'[A-Z][wW][pP][A-Za-z]*'
    for match in re.finditer(xwp_pattern, text):
        suspicious.append(('XWP', match.group(), match.start()))

    # Find Latin abbreviations with periods
    latin_abbrev = r'\b[a-z]{2,4}\.\s*[a-z]{2,4}\.?'
    for match in re.finditer(latin_abbrev, text):
        suspicious.append(('LATIN_ABBREV', match.group(), match.start()))

    # Find page number patterns
    page_pattern = r'(?:p\.|pag\.|page)\s*\d+'
    for match in re.finditer(page_pattern, text, re.IGNORECASE):
        suspicious.append(('PAGE_REF', match.group(), match.start()))

    # Find bracket/brace content
    bracket_pattern = r'[\[\{][^\]\}]{1,20}[\]\}]'
    for match in re.finditer(bracket_pattern, text):
        content = match.group()
        if re.search(r'\d', content) or len(content) < 10:
            suspicious.append(('BRACKET', content, match.start()))

    return suspicious

def analyze_paragraph(para_text: str) -> dict:
    """Analyze a single paragraph for contamination."""
    results = {
        'length': len(para_text),
        'suspicious_tokens': [],
        'pattern_matches': [],
        'contamination_score': 0
    }

    # Check known patterns
    for pattern in KNOWN_PATTERNS:
        for match in re.finditer(pattern, para_text, re.IGNORECASE):
            results['pattern_matches'].append({
                'pattern': pattern,
                'match': match.group(),
                'position': match.start()
            })

    # Extract suspicious tokens
    results['suspicious_tokens'] = extract_suspicious_tokens(para_text)

    # Calculate contamination score
    total_suspicious = len(results['pattern_matches']) + len(results['suspicious_tokens'])
    if results['length'] > 0:
        results['contamination_score'] = total_suspicious / (results['length'] / 100)

    return results

def scan_all_chapters():
    """Scan all chapter files and compile contamination statistics."""
    all_stats = {
        'chapters': {},
        'pattern_frequency': Counter(),
        'suspicious_tokens': Counter(),
        'total_paragraphs': 0,
        'contaminated_paragraphs': 0,
        'sample_contaminations': []
    }

    for chapter_num in range(13, 19):  # Books 13-18
        chapter_data = load_chapter(chapter_num)
        if not chapter_data:
            print(f"Chapter {chapter_num} not found")
            continue

        paragraphs = chapter_data.get('sourceContent', {}).get('paragraphs', [])
        chapter_stats = {
            'total_paragraphs': len(paragraphs),
            'contaminated': 0,
            'patterns_found': Counter(),
            'examples': []
        }

        for para in paragraphs:
            text = para.get('text', '')
            all_stats['total_paragraphs'] += 1

            analysis = analyze_paragraph(text)

            if analysis['pattern_matches'] or analysis['suspicious_tokens']:
                chapter_stats['contaminated'] += 1
                all_stats['contaminated_paragraphs'] += 1

                for pm in analysis['pattern_matches']:
                    pattern_key = f"{pm['pattern'][:30]} -> {pm['match']}"
                    chapter_stats['patterns_found'][pattern_key] += 1
                    all_stats['pattern_frequency'][pm['match']] += 1

                for st in analysis['suspicious_tokens']:
                    all_stats['suspicious_tokens'][st[1]] += 1

                # Store sample contaminations (first 5 per chapter)
                if len(chapter_stats['examples']) < 5:
                    chapter_stats['examples'].append({
                        'para_index': para.get('index', '?'),
                        'text_preview': text[:200],
                        'matches': analysis['pattern_matches'][:3],
                        'suspicious': analysis['suspicious_tokens'][:3]
                    })

                    if len(all_stats['sample_contaminations']) < 50:
                        all_stats['sample_contaminations'].append({
                            'chapter': chapter_num,
                            'para_index': para.get('index', '?'),
                            'text_preview': text[:300],
                            'matches': [m['match'] for m in analysis['pattern_matches'][:5]],
                            'suspicious': [s[1] for s in analysis['suspicious_tokens'][:5]]
                        })

        all_stats['chapters'][chapter_num] = chapter_stats
        print(f"Chapter {chapter_num}: {chapter_stats['contaminated']}/{chapter_stats['total_paragraphs']} contaminated paragraphs")

    return all_stats

def print_report(stats: dict):
    """Print a detailed contamination report."""
    print("\n" + "="*80)
    print("CONTAMINATION ANALYSIS REPORT")
    print("="*80)

    total_paras = stats['total_paragraphs']
    contaminated = stats['contaminated_paragraphs']
    rate = (contaminated / total_paras * 100) if total_paras > 0 else 0

    print(f"\nOverall: {contaminated}/{total_paras} paragraphs contaminated ({rate:.1f}%)")

    print("\n--- Most Common Contamination Tokens ---")
    for token, count in stats['pattern_frequency'].most_common(30):
        print(f"  {count:4d}x  {token!r}")

    print("\n--- Most Common Suspicious Tokens ---")
    for token, count in stats['suspicious_tokens'].most_common(30):
        print(f"  {count:4d}x  {token!r}")

    print("\n--- Sample Contaminated Paragraphs ---")
    for sample in stats['sample_contaminations'][:20]:
        print(f"\nChapter {sample['chapter']}, Para {sample['para_index']}:")
        print(f"  Preview: {sample['text_preview'][:150]}...")
        if sample['matches']:
            print(f"  Pattern matches: {sample['matches']}")
        if sample['suspicious']:
            print(f"  Suspicious tokens: {sample['suspicious']}")

def save_report(stats: dict, filepath: Path):
    """Save the report to a JSON file for further processing."""
    # Convert Counters to dicts for JSON serialization
    output = {
        'total_paragraphs': stats['total_paragraphs'],
        'contaminated_paragraphs': stats['contaminated_paragraphs'],
        'contamination_rate': stats['contaminated_paragraphs'] / stats['total_paragraphs'] * 100 if stats['total_paragraphs'] > 0 else 0,
        'pattern_frequency': dict(stats['pattern_frequency'].most_common(100)),
        'suspicious_tokens': dict(stats['suspicious_tokens'].most_common(100)),
        'sample_contaminations': stats['sample_contaminations'],
        'chapters': {}
    }

    for ch_num, ch_stats in stats['chapters'].items():
        output['chapters'][ch_num] = {
            'total_paragraphs': ch_stats['total_paragraphs'],
            'contaminated': ch_stats['contaminated'],
            'patterns_found': dict(ch_stats['patterns_found']),
            'examples': ch_stats['examples']
        }

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nReport saved to: {filepath}")

if __name__ == '__main__':
    print("Analyzing Epitome of Histories chapters 13-18 for contamination...")
    stats = scan_all_chapters()
    print_report(stats)

    # Save detailed report
    report_path = BASE_DIR / "scripts/lib/epitome-cleaning-v3-python/contamination_report.json"
    save_report(stats, report_path)
