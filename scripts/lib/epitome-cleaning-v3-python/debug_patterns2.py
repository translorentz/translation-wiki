#!/usr/bin/env python3
"""
Debug sigla patterns more thoroughly.
"""

import json
import re
from pathlib import Path

BASE_DIR = Path("/Users/bryancheong/claude_projects/translation-wiki")
DATA_DIR = BASE_DIR / "data/processed/epitome-of-histories-clean"

# Load all paragraphs
all_text = ""
for chapter_num in range(13, 19):
    filepath = DATA_DIR / f"chapter-{chapter_num:03d}.json"
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for para in data.get('sourceContent', {}).get('paragraphs', []):
        all_text += para.get('text', '') + "\n"

print("Searching for all sigla patterns in entire corpus:")
print("="*60)

# Pattern 1: Any sequence with 'wp' in it (broader search)
print("\n1. All 'wp' occurrences:")
for m in re.finditer(r'[A-Za-z0-9]{0,5}wp[A-Za-z0-9]{0,5}', all_text):
    match = m.group()
    # Get context
    start = max(0, m.start() - 15)
    end = min(len(all_text), m.end() + 15)
    context = all_text[start:end].replace('\n', ' ')
    print(f"  '{match}' in: ...{context}...")

# Pattern 2: Capital letter sequences that look like sigla
print("\n\n2. Capital letter sequences (2-6 chars) followed by comma or space:")
sigla_pattern = r'(?<=[^A-Z])([A-Z]{2,6})(?=[,\s])'
found_sigla = set()
for m in re.finditer(sigla_pattern, all_text):
    found_sigla.add(m.group(1))

# Filter out Roman numerals
roman = {'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV'}
sigla_only = sorted([s for s in found_sigla if s not in roman and not s.startswith('X')])
print(f"Potential sigla (excluding Roman numerals): {sigla_only[:50]}")

# Pattern 3: What comes after sigla patterns?
print("\n\n3. Patterns like 'SIGLA,' or 'SIGLA ' in context:")
sigla_context_pattern = r'([A-Z]{2,6}),\s+[^A-Z]'
for m in re.finditer(sigla_context_pattern, all_text[:50000]):  # First 50k chars
    sigla = m.group(1)
    if sigla not in roman:
        start = max(0, m.start() - 30)
        end = min(len(all_text), m.end() + 30)
        context = all_text[start:end].replace('\n', ' ')
        print(f"  '{sigla}' in: ...{context}...")

# Pattern 4: Look for apparatus indicators (Latin terms)
print("\n\n4. Latin apparatus terms:")
latin_patterns = [
    r'perg\.\s*fol\.',
    r'grec\.\s*[xk]al',
    r'v\.\s*ad\.',
    r'v\.\s*argum\.',
    r'\bom\.',
    r'\badd\.',
    r'\bdel\.',
    r'fol\.\s*\d+',
    r'cet\.',
    r'Procop\.',
]
for pat in latin_patterns:
    matches = list(re.finditer(pat, all_text, re.IGNORECASE))
    if matches:
        print(f"  Pattern '{pat}': {len(matches)} matches")
        for m in matches[:3]:
            start = max(0, m.start() - 20)
            end = min(len(all_text), m.end() + 20)
            context = all_text[start:end].replace('\n', ' ')
            print(f"    ...{context}...")
