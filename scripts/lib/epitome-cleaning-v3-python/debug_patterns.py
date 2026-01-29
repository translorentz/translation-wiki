#!/usr/bin/env python3
"""
Debug why patterns aren't matching properly.
"""

import json
import re
from pathlib import Path

BASE_DIR = Path("/Users/bryancheong/claude_projects/translation-wiki")
DATA_DIR = BASE_DIR / "data/processed/epitome-of-histories-clean"

# Sample texts with known contamination
samples = [
    "αὐτομάτοις φάρμακόν τε OwpDt παρὰ ϑετο",
    "ἀδαρνάρσην O, ἀδανάρσην AEDwwp2Di Τούτου",
    "συνδεισινον προουπηντήκει BCwp, τῷ κωνσταντίῳ",
    "κωνστάντιος εἵλετο ἐπιβουλῆς ARwp, £i βου-",
    "κοαίστορι B5Dwp παραλύσαι",
    "τοῦ ἁγίου ΜΙητροφάνους ϑανόντος ὅ ϑεῖος",  # Has MI
    "EDwwp ἰδοῦ-",
]

def test_pattern(pattern, text, name):
    """Test a regex pattern against sample text."""
    matches = list(re.finditer(pattern, text))
    if matches:
        print(f"  {name}: {[m.group() for m in matches]}")
    return matches

print("Testing XWP patterns:")
print("="*60)

for sample in samples:
    print(f"\nSample: {sample[:50]}...")

    # Original pattern (from cleaning script)
    p1 = r'\b[A-Za-z][wW][pP][A-Za-z0-9]{0,4}\b'
    test_pattern(p1, sample, "Pattern 1 (original)")

    # Without word boundary at end
    p2 = r'\b[A-Za-z][wW][pP][A-Za-z0-9]{0,4}'
    test_pattern(p2, sample, "Pattern 2 (no end boundary)")

    # More specific patterns
    p3 = r'[A-Z][wW][pP][A-Za-z0-9]{0,4}'
    test_pattern(p3, sample, "Pattern 3 (capital start only)")

    # Even more specific
    p4 = r'[ABCDEGHIJKLMNOPRSTUWXYZ][wW][pP][A-Za-z0-9IiJjDdTt]{0,5}'
    test_pattern(p4, sample, "Pattern 4 (common sigla)")

print("\n\nTesting on actual file content:")
print("="*60)

# Load a chapter and find all Xwp patterns
filepath = DATA_DIR / "chapter-013.json"
with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

all_matches = []
for para in data.get('sourceContent', {}).get('paragraphs', []):
    text = para.get('text', '')
    # Find anything that looks like Xwp
    for m in re.finditer(r'[A-Za-z][wW][pP]', text):
        # Get context
        start = max(0, m.start() - 20)
        end = min(len(text), m.end() + 20)
        context = text[start:end]
        all_matches.append({
            'match': m.group(),
            'context': context,
            'para_idx': para.get('index')
        })

print(f"\nFound {len(all_matches)} Xwp patterns in chapter 13:")
for item in all_matches[:15]:
    print(f"  Para {item['para_idx']}: '{item['match']}' in: ...{item['context']}...")

# Check for lowercase wp variants
print("\n\nChecking for lowercase 'wp' variants:")
lowercase_matches = []
for para in data.get('sourceContent', {}).get('paragraphs', []):
    text = para.get('text', '')
    for m in re.finditer(r'wp[A-Za-z0-9]{0,4}', text):
        start = max(0, m.start() - 20)
        end = min(len(text), m.end() + 20)
        lowercase_matches.append(text[start:end])

for lm in lowercase_matches[:10]:
    print(f"  ...{lm}...")
