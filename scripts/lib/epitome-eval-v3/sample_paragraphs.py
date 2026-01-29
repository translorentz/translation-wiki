#!/usr/bin/env python3
"""
Random paragraph sampler for manual inspection.
"""

import json
import random
import sys
from pathlib import Path
from typing import List, Dict

def sample_paragraphs(n: int = 30, seed: int = None) -> List[Dict]:
    """Sample n random paragraphs from all chapters."""
    if seed is not None:
        random.seed(seed)

    base_dir = Path('/Users/bryancheong/claude_projects/translation-wiki/data/processed/epitome-of-histories-clean')

    all_paragraphs = []

    for chapter_num in range(13, 19):
        filepath = base_dir / f'chapter-{chapter_num:03d}.json'
        if not filepath.exists():
            continue

        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        paragraphs = data.get('sourceContent', {}).get('paragraphs', [])
        for para in paragraphs:
            all_paragraphs.append({
                'chapter': chapter_num,
                'index': para.get('index', -1),
                'text': para.get('text', ''),
            })

    # Sample
    if n >= len(all_paragraphs):
        sample = all_paragraphs
    else:
        sample = random.sample(all_paragraphs, n)

    return sample

def calculate_greek_ratio(text: str) -> float:
    """Calculate the ratio of Greek characters in text."""
    greek_chars = sum(1 for c in text if '\u0370' <= c <= '\u03FF' or '\u1F00' <= c <= '\u1FFF')
    total_chars = len(text.replace(' ', '').replace('\n', ''))
    if total_chars == 0:
        return 0.0
    return greek_chars / total_chars

def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 42

    samples = sample_paragraphs(n, seed)

    print(f"=== {len(samples)} RANDOM PARAGRAPH SAMPLES (seed={seed}) ===\n")

    for i, s in enumerate(samples, 1):
        greek_ratio = calculate_greek_ratio(s['text'])
        text_preview = s['text'][:300] + '...' if len(s['text']) > 300 else s['text']

        print(f"--- Sample {i}: Chapter {s['chapter']}, Para {s['index']} (Greek: {greek_ratio:.1%}) ---")
        print(text_preview)
        print()

    # Summary stats
    greek_ratios = [calculate_greek_ratio(s['text']) for s in samples]
    avg_greek = sum(greek_ratios) / len(greek_ratios) if greek_ratios else 0

    print(f"\n=== SUMMARY ===")
    print(f"Samples: {len(samples)}")
    print(f"Average Greek ratio: {avg_greek:.1%}")
    print(f"Min Greek ratio: {min(greek_ratios):.1%}")
    print(f"Max Greek ratio: {max(greek_ratios):.1%}")

if __name__ == '__main__':
    main()
