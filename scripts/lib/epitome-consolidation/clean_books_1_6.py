#!/usr/bin/env python3
"""
Clean books 1-6 of Epitome of Histories from the uncleaned originals.
Adapts the v3 cleaning approach (clean_paragraphs_v2.py) for books 1-6.
"""

import json
import re
from pathlib import Path

BASE_DIR = Path("/Users/bryancheong/claude_projects/translation-wiki")
SRC_DIR = BASE_DIR / "data/processed/epitome-of-histories"
OUT_DIR = BASE_DIR / "data/processed/epitome-of-histories-final"

GREEK_RE = re.compile(r'[\u0370-\u03FF\u1F00-\u1FFF]')

def greek_ratio(text):
    """Return fraction of alphabetic chars that are Greek."""
    greek = len(GREEK_RE.findall(text))
    alpha = len(re.findall(r'[a-zA-Z\u0370-\u03FF\u1F00-\u1FFF]', text))
    if alpha == 0:
        return 0
    return greek / alpha

def is_apparatus_paragraph(text):
    """Determine if a paragraph is pure apparatus (should be removed entirely)."""
    t = text.strip()
    if len(t) < 10:
        return True  # Too short to be real content

    # Check Greek ratio - apparatus paragraphs are mostly Latin
    ratio = greek_ratio(t)
    if ratio < 0.3:
        return True

    # FONTES/source headers
    if re.match(r'^[A-ZΑ-ΩἈἘ]{3,}\.?\s*(Cap|cap|Lib|lib|Ant|ant|Genesis|Exod|Levit|Numer|Deuter|Ioseph|Procop|Iosephi|Euseb)', t):
        return True
    if re.match(r'^FONTES', t, re.IGNORECASE):
        return True
    if re.match(r'^[A-ZἈἘ]{5,}\.', t):
        r = greek_ratio(t)
        if r < 0.5:
            return True

    # Short paragraphs with low Greek ratio are apparatus
    if len(t) < 60 and ratio < 0.7:
        return True

    # Paragraphs with ] brackets (variant notation) and low Greek
    if ']' in t and ratio < 0.65:
        return True

    # Page reference patterns like "p. 40 v. 8." or "p.57 v. 23."
    if re.match(r'^p\.\s*\d+\s*v\.\s*\d+', t):
        return True
    if re.search(r'p\.\s*\d+\s*v\.\s*\d+', t) and ratio < 0.5:
        return True

    # Latin scholarly commentary patterns
    latin_apparatus_markers = [
        r'codex\s+(Colber|Wolf|Busb)',
        r'codices',
        r'alter\s+cod',
        r'Wolfii',
        r'Ducangius',
        r'Dccawcius',
        r'Busbequianus',
        r'^[A-Z]{2,}\s+et\s+',
        r'losephi?\s+(Ant|cod)',
        r'losephus\b',
        r'Iosephus\b',
        r'Iosephi\b',
        r'Procop\.',
        r'ecisset\s+\(unde',
        r'"ita\s+Reg\."',
        r'\bsibi\s+constant\b',
        r'\bomissis\b',
        r'\bsubscripto\b',
        r'\btransponit\b',
        r'\bconstanter\b',
        r'\bead\.\s*man\.',
        r'\bsine\s+spir\.',
        r'\bperg\.\s*fol\.',
        r'\blitt\.\s+[a-z]',
        r'^[A-Z]\s+et\s+alter\s+cod',
        r'\bom\s+[A-Z]{1,3}\b',
        r'^[0-9]+\s+[a-z]+\]\s',
        r'^\d+\s+\w+\]\s',
        r'\bXenophon\b',
        r'\bTheodoretus?\b',
        r'\banonymus\s+monachus\b',
        r'\blatine\b',
        r'\bimmo\b',
        r'\bsynonyma\b',
        r'\bprogressos\b',
        r'\bcommode\b',
        r'\bdifferunt\b',
        r'\bpauca\s+differunt\b',
        r'\bomisso\b',
        r'\brectius\b',
        r'\bsumpta\s+videntur\b',
    ]
    for pat in latin_apparatus_markers:
        if re.search(pat, t, re.IGNORECASE):
            if ratio < 0.65:
                return True

    return False

def clean_paragraph_text(text):
    """Clean contamination from within a paragraph that's mostly Greek."""
    original = text

    # 1. Remove page numbers at start
    text = re.sub(r'^(\d{2,4})\s+(?=[\u0370-\u03FF\u1F00-\u1FFF"\'Ὁ])', '', text)

    # 2. Remove wp sigla patterns
    wp_pattern = r'[A-Za-z0-9]{0,6}[wW][pP][A-Za-z0-9IiJjDd]{0,6}'
    text = re.sub(wp_pattern, '', text)

    # 3. Page/folio markers
    text = re.sub(r'[DWOB]\s*[HΠ]I{1,3}\d*', '', text)
    # Also P followed by number like P1263
    text = re.sub(r'\bP\d{3,4}\b', '', text)
    # W followed by number
    text = re.sub(r'\bW\s*\d{3,4}\b', '', text)

    # 4. Latin apparatus terms embedded in Greek
    latin_terms = [
        r'ead\.\s*man\.?',
        r'subscripto',
        r'transponit',
        r'constanter',
        r'perg\.\s*fol\.\s*\d*:?',
        r'grec\.\s*[xk]al',
        r'litt\.\s*[a-z]+',
        r'ex\.?\s*vers[u]*',
        r'arg\.\s*ad',
        r'v\.\s*argum\.\s*ad',
        r'v\.\s*ad\.?\s*[IVXLC]*,?',
        r'Procop\.\s*[IVX]*\.?\s*,?',
        r'\(unum\s+[^)]+\)',
        r'octo\s+fere',
        r'cet\.\s*',
        r'mss\."\s*:\s*Duc\)',
        r'Zeilf\.',
        r'\bAlt\b,?',
        r'\bDuc\)',
        r'Ducangius',
    ]
    for pattern in latin_terms:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)

    # 5. Bracketed apparatus markers
    text = re.sub(r'Ὁ?\}\s*\d{2,4}', '', text)

    # 6. Standalone sigla before Greek
    text = re.sub(r'\b([A-Z])\s*,\s+(?=[\u0370-\u03FF\u1F00-\u1FFF])', '', text)

    # 7. Isolated page numbers
    text = re.sub(r'\s(\d{3})\s(?=[\u0370-\u03FF\u1F00-\u1FFF])', ' ', text)

    # 8. Residual patterns
    residuals = [
        r'\(8ic\)', r'——\s*oor\.', r'/of\.', r'—\s*doyovra',
        r'£i\s+', r'»\s*', r'p\*\s*', r'\bmu-\b', r'\(\s*\)',
    ]
    for pat in residuals:
        text = re.sub(pat, '', text)

    # 9. Remove "slg" (standalone sigla artifact)
    text = re.sub(r'\bslg\b', '', text)

    # 10. Clean up whitespace
    text = re.sub(r'\s{2,}', ' ', text)
    text = re.sub(r'\s+([,;:\.])', r'\1', text)
    text = re.sub(r'([,;:])\s*([,;:])', r'\1', text)
    text = re.sub(r'^\s*[,;:]\s*', '', text)
    text = text.strip()

    return text

def should_join_with_previous(text):
    """Check if paragraph starts mid-sentence (should be joined with previous)."""
    t = text.strip()
    if not t:
        return False
    # Starts with lowercase Greek letter (continuation)
    if re.match(r'^[α-ωά-ώ]', t):
        return True
    # Starts with a connecting word fragment
    if re.match(r'^(τος|δαυτ|μένος|τούς|μὴν|μέν|τερισ)', t):
        return True
    return False

def process_chapter(chapter_num):
    """Process a single chapter: remove apparatus, clean text, join fragments."""
    path = SRC_DIR / f"chapter-{chapter_num:03d}.json"
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    src_paras = data['sourceContent']['paragraphs']
    print(f"\nBook {chapter_num}: {len(src_paras)} input paragraphs")

    # Phase 1: Remove pure apparatus paragraphs
    kept = []
    removed = 0
    for p in src_paras:
        if is_apparatus_paragraph(p['text']):
            removed += 1
        else:
            kept.append(p['text'])
    print(f"  Removed {removed} apparatus paragraphs, {len(kept)} remain")

    # Phase 2: Clean remaining paragraphs
    cleaned = [clean_paragraph_text(t) for t in kept]
    # Remove any that became empty
    cleaned = [t for t in cleaned if len(t.strip()) > 5]

    # Phase 3: Join fragments
    joined = []
    for t in cleaned:
        if joined and should_join_with_previous(t):
            joined[-1] = joined[-1].rstrip() + ' ' + t
        else:
            joined.append(t)

    # Phase 4: Final cleanup - remove short paragraphs and remaining low-Greek paragraphs
    final = []
    for t in joined:
        t = t.strip()
        if len(t) <= 15:
            continue
        gr = len(GREEK_RE.findall(t))
        alpha = len(re.findall(r'[a-zA-Z\u0370-\u03FF\u1F00-\u1FFF]', t))
        ratio = gr / alpha if alpha else 0
        if ratio < 0.6:
            continue
        final.append(t)

    print(f"  After cleaning: {len(final)} paragraphs")

    # Build output
    output = {
        "chapterNumber": chapter_num,
        "title": f"Book {chapter_num}",
        "sourceContent": {
            "paragraphs": [{"index": i, "text": t} for i, t in enumerate(final)]
        }
    }

    out_path = OUT_DIR / f"chapter-{chapter_num:03d}.json"
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"  Written to {out_path.name}")

    return len(src_paras), len(final)

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print("=" * 60)
    print("EPITOME OF HISTORIES - BOOKS 1-6 CLEANING")
    print("=" * 60)

    for ch in range(1, 7):
        orig, final = process_chapter(ch)

if __name__ == '__main__':
    main()
