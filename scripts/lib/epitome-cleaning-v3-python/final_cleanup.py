#!/usr/bin/env python3
"""
Final cleanup pass to remove the last remaining contamination.
"""

import json
import re
from pathlib import Path

BASE_DIR = Path("/Users/bryancheong/claude_projects/translation-wiki")
DATA_DIR = BASE_DIR / "data/processed/epitome-of-histories-clean"

def clean_remaining():
    """Clean the specific remaining issues."""

    # Fix 1: Chapter 15, paragraph 22 - "κρυστάλων AE, τμημάτων Ὁ"
    # The "AE, " and possibly "Ὁ" need removal
    filepath15 = DATA_DIR / "chapter-015.json"
    with open(filepath15, 'r', encoding='utf-8') as f:
        data15 = json.load(f)

    for para in data15.get('sourceContent', {}).get('paragraphs', []):
        if para.get('index') == 22:
            text = para.get('text', '')
            print(f"Before (ch15 p22): ...{text[text.find('κρυστάλων'):text.find('κρυστάλων')+60]}...")

            # Remove "AE, " pattern
            text = re.sub(r'\bAE,\s+', '', text)
            # Clean up any resulting double spaces
            text = re.sub(r'\s{2,}', ' ', text)
            para['text'] = text

            print(f"After (ch15 p22): ...{text[text.find('κρυστάλων'):text.find('κρυστάλων')+60]}...")

    with open(filepath15, 'w', encoding='utf-8') as f:
        json.dump(data15, f, indent=2, ensure_ascii=False)
    print("Saved chapter-015.json")

    # Fix 2: Chapter 18, paragraph 64 - "μογλενίται AR, μογλενῖται DDi"
    # The "AR, " and "DDi" need removal
    filepath18 = DATA_DIR / "chapter-018.json"
    with open(filepath18, 'r', encoding='utf-8') as f:
        data18 = json.load(f)

    for para in data18.get('sourceContent', {}).get('paragraphs', []):
        if para.get('index') == 64:
            text = para.get('text', '')
            print(f"Before (ch18 p64): ...{text[text.find('μογλενίται'):text.find('μογλενίται')+60]}...")

            # Remove "AR, " pattern
            text = re.sub(r'\bAR,\s+', '', text)
            # Also remove DDi if present (apparatus marker)
            text = re.sub(r'\bDDi\b', '', text)
            # Clean up
            text = re.sub(r'\s{2,}', ' ', text)
            para['text'] = text

            print(f"After (ch18 p64): ...{text[text.find('μογλενίται'):text.find('μογλενίται')+60]}...")

    with open(filepath18, 'w', encoding='utf-8') as f:
        json.dump(data18, f, indent=2, ensure_ascii=False)
    print("Saved chapter-018.json")

if __name__ == '__main__':
    clean_remaining()
