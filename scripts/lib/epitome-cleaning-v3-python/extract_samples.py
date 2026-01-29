#!/usr/bin/env python3
"""
Extract full sample paragraphs for manual inspection.
"""

import json
from pathlib import Path

BASE_DIR = Path("/Users/bryancheong/claude_projects/translation-wiki")
DATA_DIR = BASE_DIR / "data/processed/epitome-of-histories-clean"

# Paragraphs identified as having contamination
SAMPLES = [
    (13, 17),   # OwpDt
    (13, 22),   # wwp with context
    (13, 27),   # Cwp
    (13, 33),   # Rwp, Dwp
    (13, 12),   # W HII
    (13, 19),   # ACE, sigla
    (14, 35),   # AO, sigla
    (15, 5),    # perg. fol.
    (15, 24),   # wwp
    (16, 16),   # wwp
]

def load_paragraph(chapter: int, para_index: int) -> str:
    filepath = DATA_DIR / f"chapter-{chapter:03d}.json"
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for para in data.get('sourceContent', {}).get('paragraphs', []):
        if para.get('index') == para_index:
            return para.get('text', '')
    return None

def main():
    print("="*80)
    print("FULL SAMPLE PARAGRAPHS")
    print("="*80)

    for chapter, para_idx in SAMPLES:
        text = load_paragraph(chapter, para_idx)
        if text:
            print(f"\n--- Chapter {chapter}, Paragraph {para_idx} ---")
            print(text[:1000])
            if len(text) > 1000:
                print(f"... [truncated, total {len(text)} chars]")
            print()

if __name__ == '__main__':
    main()
