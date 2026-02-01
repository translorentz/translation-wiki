#!/usr/bin/env python3
"""Second cleanup pass for Mai ve Siyah - fixes footnote markers, truncation artifacts, and ch20 specific issues."""

import json
import re
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed', 'mai-ve-siyah')

# Chapter 20 specific replacements (para index 0-based)
CH20_FIXES = {
    13: [
        ('malışer', 'mahşer'),
        ('malıfazası', 'mahfazası'),
    ],
    17: [
        ('kuru yoı;', 'kuru yor;'),  # will be further fixed by truncation rules
    ],
    21: [
        ('üslCıbunun', 'üslubunun'),
    ],
    25: [
        ('siyah ind yağınuru', 'siyah inci yağmuru'),
    ],
    27: [
        ('Karanl ıın', 'Karanlığın'),
    ],
}

def fix_footnote_markers(text):
    """Remove trailing digits 1-9 fused to words (footnote markers).
    Careful not to strip digits from actual numbers/dates."""
    # Match a letter followed by a single digit 1-9 at word boundary
    # Don't match if preceded by another digit (that's a real number)
    return re.sub(r"(?<=[a-zA-ZçğıöşüÇĞİÖŞÜâîû])([1-9])(?=[\s,.;:!?\-\)\]\"\u201c\u201d']|$)", '', text)

def fix_truncation(text):
    """Fix systematic trailing character truncation patterns."""
    # oı; → or;  (but keep the semicolon context)
    text = re.sub(r'oı;', 'or;', text)
    # oı. → or.
    text = re.sub(r'oı\.', 'or.', text)
    # oı, → or,
    text = re.sub(r'oı,', 'or,', text)
    # Word boundary pattern
    WB = r'(?=[\s,.;:!?\-\)\]\'"]|$)'
    # yoı at end of word → yor
    text = re.sub(r'yoı' + WB, 'yor', text)
    # laı at end of word → ları
    text = re.sub(r'laı' + WB, 'ları', text)
    # leı → leri
    text = re.sub(r'leı' + WB, 'leri', text)
    return text

def process_chapter(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    chapter_num = int(os.path.basename(filepath).replace('chapter-', '').replace('.json', ''))
    changes = 0

    for i, para in enumerate(data['paragraphs']):
        original = para

        # Apply chapter 20 specific fixes first
        if chapter_num == 20 and i in CH20_FIXES:
            for old, new in CH20_FIXES[i]:
                para = para.replace(old, new)

        # Apply global OCR corrections
        para = para.replace('malışer', 'mahşer')

        # Apply global fixes
        para = fix_truncation(para)
        para = fix_footnote_markers(para)

        if para != original:
            data['paragraphs'][i] = para
            changes += 1

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return changes

def main():
    total_changes = 0
    for i in range(1, 21):
        filepath = os.path.join(DATA_DIR, f'chapter-{i:03d}.json')
        if os.path.exists(filepath):
            changes = process_chapter(filepath)
            if changes > 0:
                print(f'  chapter-{i:03d}.json: {changes} paragraphs fixed')
            total_changes += changes

    print(f'\nTotal: {total_changes} paragraphs fixed across 20 chapters')

if __name__ == '__main__':
    main()
