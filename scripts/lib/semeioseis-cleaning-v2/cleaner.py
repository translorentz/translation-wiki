#!/usr/bin/env python3
"""
Main cleaning pipeline for Semeioseis Gnomikai (chapters 82-120) - V2.

V2 FIXES (from evaluator feedback):
1. CRITICAL: Word rejoining - fix broken words like `πα- ρασκευαστέον`
2. Strip inline apparatus markers: °), *°), 4°), 1°)
3. Strip apparatus variant notes and sigla from body text
4. Strip page/footnote references and bibliographic abbreviations
5. Remove editorial brackets [text]
6. Remove OCR noise (non-Greek artifacts like waragte13)
7. Fix number-in-word contamination: `περι- 1φρόνησιν` -> `περιφρόνησιν`
8. Clean garbled text fragments
"""

import json
import re
import sys
from pathlib import Path
from collections import Counter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from patterns import (
    PAGE_HEADER, ARABIC_SCRIPT, HEBREW_SCRIPT, DEVANAGARI_SCRIPT, GUJARATI_SCRIPT,
    CJK_SCRIPT, CYRILLIC_SCRIPT, MISC_NON_GREEK, CHAPTER_MARKER, LINE_BREAK_HYPHEN,
    GREEK_CHARS, has_greek, greek_ratio, MANUSCRIPT_SIGLA, LATIN_APPARATUS,
    BROKEN_WORD_IN_TEXT, DEGREE_MARKER, APPARATUS_VARIANT, APPARATUS_FOOTNOTE_REF,
    PAGE_REFERENCE, BIBLIO_ABBREV, DOUBLE_ASTERISK, NUMBER_IN_WORD,
    EDITORIAL_BRACKETS, LATIN_ARTIFACT_IN_GREEK, INLINE_FOOTNOTE_MARKER,
    STAR_MARKER, OMICRON_MARKER
)
from filters import should_remove_line, is_footnote_line, is_page_header

BASE_DIR = Path("/Users/bryancheong/claude_projects/translation-wiki")
RAW_FILE = BASE_DIR / "data/raw/semeioseis_gnomikai/semeioseis_gnomikai_82_120.txt"
OUTPUT_DIR = BASE_DIR / "data/processed/semeioseis-gnomikai"

# Chapter line map (same as V1 - chapter segmentation was correct)
CHAPTER_LINE_MAP = [
    (1, 82), (220, 83), (392, 84), (594, 85), (736, 86),
    (1040, 87), (1159, 88), (1250, 89), (1348, 90), (1454, 91),
    (1563, 92), (1703, 93), (1859, 94), (1955, 95), (2108, 96),
    (2563, 97), (2796, 98), (3328, 99), (3660, 100), (4138, 101),
    (4253, 102), (4414, 103), (4596, 104), (4794, 105), (5189, 106),
    (5313, 107), (5533, 108), (5759, 109), (5947, 110), (6340, 111),
    (6862, 112), (7073, 113), (7431, 114), (7641, 115), (8185, 116),
    (8306, 117), (8779, 119), (9003, 120),
]

stats = Counter()


def read_raw_file():
    with open(RAW_FILE, 'r', encoding='utf-8') as f:
        return f.readlines()


def rejoin_broken_words_in_text(text: str) -> str:
    """
    V2 CRITICAL FIX: Rejoin words broken by line-break hyphens in assembled text.
    Handles: `πα- ρασκευαστέον` -> `παρασκευαστέον`
    Also handles number-in-word: `περι- 1φρόνησιν` -> `περιφρόνησιν`
    """
    prev = None
    while prev != text:
        prev = text
        text = BROKEN_WORD_IN_TEXT.sub(lambda m: m.group(1) + m.group(3), text)
        stats['words_rejoined_in_text'] += 1
    # Subtract the final no-change iteration
    stats['words_rejoined_in_text'] -= 1
    return text


def clean_apparatus_markers(text: str) -> str:
    """V2: Remove apparatus footnote markers from body text."""
    # Degree-sign markers: °), *°), 1°), 4°) etc.
    text = DEGREE_MARKER.sub(' ', text)
    # Star markers
    text = STAR_MARKER.sub('', text)
    # Omicron-style: 1ο), 2ο)
    text = OMICRON_MARKER.sub('', text)
    # Numbered markers: 1), 2) etc (careful not to remove legitimate parens)
    text = re.sub(r'(?<!\()\s*\d{1,2}\s*\)\s*', ' ', text)
    # Standalone asterisks between Greek
    text = re.sub(r'\s+\*\s+', ' ', text)
    return text


def clean_apparatus_variants(text: str) -> str:
    """V2: Remove apparatus variant notes embedded in body text."""
    # Full apparatus entries: "1: κατὰ μέρη ; Ε. Μon . καταμέλη , κατά μέλη."
    text = APPARATUS_VARIANT.sub(' ', text)
    # Footnote refs: "18 a) ἀνόνητος , 99. ἀνηνύτοις ἐλπίσι."
    text = APPARATUS_FOOTNOTE_REF.sub(' ', text)
    # Page references: "ν. 405. αν"
    text = PAGE_REFERENCE.sub(' ', text)
    # Bibliographic abbreviations: "ΒΙ. text"
    text = re.sub(r'[ΒB][ΙIl]\.\s+[^\.\n]{2,40}\.?', ' ', text)
    # Double-asterisk notes: "** ἐκ παλαιῶν"
    text = DOUBLE_ASTERISK.sub(' ', text)
    # Stray sigla: "E. Mon." "C. Mon." etc.
    text = re.sub(r'[ΕE]\.\s*[ΜM][οo]n\s*\.?\s*[^\.\n]{0,40}\.', ' ', text)
    return text


def clean_inline_markers(text: str) -> str:
    """Remove inline footnote markers and apparatus from body text."""
    # Leading markers
    text = re.sub(r'^[\·\-\•]\s*', '', text)
    # Inline apparatus fragments with sigla
    text = re.sub(
        r'[\u0370-\u03FF\u1F00-\u1FFF]+\s+C\.\s*(?:Mon|Aug|Ciz)\.?\s+[^\.\n]{0,60}(?:\.|$)',
        '', text
    )
    # Standalone sigla references
    text = re.sub(r'\bC\.\s*(?:Mon|Aug|Ciz|Paris)\.?\s*[^\.]{0,60}\.', ' ', text)
    text = re.sub(r'\bCdd\s*\.?\s*(?:Mon|Aug|nostri)\S*(?:\s+\S+){0,8}[\.\:\;]', '', text)
    text = re.sub(r'\bFabric\.?\s+\S+(?:\s+\S+){0,3}\.?', '', text)
    text = re.sub(r'\bBloch\.?\s+\S+(?:\s+\S+){0,3}\.?', '', text)
    text = re.sub(r'\bOrell\.?\s+\S+(?:\s+\S+){0,5}[\.\:]?', '', text)
    # Latin apparatus phrases
    text = re.sub(r'\bnon\s+habent\b', '', text)
    text = re.sub(r'\bsed\s+[a-zA-Z\s\.\,]{3,30}', '', text)
    text = re.sub(r'\(\s*vitiose\s*\)', '', text)
    text = re.sub(r'\.?\s*[Ll]egendum\s+[a-zA-Z\s\.\,]{3,40}', '', text)
    text = re.sub(r'\.?\s*fortasse\s+\S+(?:\s+\S+){0,3}[\.\:\;]?', '', text)
    text = re.sub(r'\.?\s*Theodorus\s+[a-zA-Z\s\.\,]{3,60}', '', text)
    # "cum Strab." references
    text = re.sub(r'\s*cum\s+[A-Z][a-z]+\.\s*[IVXLCDM]*\.?\s*', '', text)
    # ΚΕΦ. leaked
    text = re.sub(r'^ΚΕΦ\.\s*\S+\s*', '', text)
    # "Cod. Aug." patterns
    text = re.sub(r'\bCod\s*\.?\s*(?:Aug|Mon|Paris)\.?\s*[^\.]{0,40}[\.\:]', ' ', text)
    # "Mon. et Aug."
    text = re.sub(r'\bMon\.?\s+et\s+Aug\.?\s*[^\.]{0,40}[\.\:]', ' ', text)
    # "Germ." siglum
    text = re.sub(r'\bGerm\.?\s*[^\.]{0,30}[\.\:]', ' ', text)
    # "Sic etiam/dic"
    text = re.sub(r'\bSic\s+(?:etiam|dic)\S*\.?\s*[^\.]{0,40}[\.\:]', ' ', text)
    # "cf." references
    text = re.sub(r'\bcf\.?\s+\S+\.?\s*[^\.]{0,30}[\.\:]', ' ', text)
    # "Plut." references
    text = re.sub(r'\bPlut\.?\s*[^\.]{0,40}[\.\:]', ' ', text)
    # "Corn. Nep." references
    text = re.sub(r'\bCorn\.?\s+Nep\.?\s*[^\.]{0,20}[\.\:]', ' ', text)
    # Stray closing markers
    text = re.sub(r'\s*"\s*\)', ' ', text)
    return text


def clean_foreign_scripts(text: str) -> str:
    text = ARABIC_SCRIPT.sub('', text)
    text = HEBREW_SCRIPT.sub('', text)
    text = DEVANAGARI_SCRIPT.sub('', text)
    text = GUJARATI_SCRIPT.sub('', text)
    text = CJK_SCRIPT.sub('', text)
    text = CYRILLIC_SCRIPT.sub('', text)
    text = MISC_NON_GREEK.sub('', text)
    return text


def clean_page_number_prefix(text: str) -> str:
    text = re.sub(r'^\d{2,4}\s+(?=[\u0370-\u03FF\u1F00-\u1FFF])', '', text)
    return text


def rejoin_broken_words_lines(lines: list) -> list:
    """Rejoin words broken across lines with hyphens (line-level)."""
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        match = LINE_BREAK_HYPHEN.search(line)
        if match and i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            if next_line and has_greek(next_line):
                prefix = line[:match.start()] + match.group(1)
                word_match = re.match(r'(\S+)(.*)', next_line)
                if word_match:
                    joined = prefix + word_match.group(1)
                    remainder = word_match.group(2).strip()
                    result.append(joined + (' ' + remainder if remainder else ''))
                    stats['words_rejoined_line'] += 1
                    i += 2
                    continue
        result.append(line)
        i += 1
    return result


def post_clean_paragraph(text: str) -> str:
    """
    V2: Comprehensive post-processing on assembled paragraphs.
    Applied AFTER paragraph assembly, catches contamination that survived line-level filtering.
    """
    # --- V2: Remove OCR noise artifacts FIRST (before word rejoining) ---
    # Latin/numeric noise in Greek context: "waragte13"
    text = LATIN_ARTIFACT_IN_GREEK.sub('', text)

    # --- V2 CRITICAL: Rejoin broken words in assembled text ---
    text = rejoin_broken_words_in_text(text)

    # --- V2: Remove apparatus markers ---
    text = clean_apparatus_markers(text)

    # --- V2: Remove apparatus variant notes ---
    text = clean_apparatus_variants(text)

    # --- V2: Remove broader apparatus footnote patterns ---
    # "N a) word , nonne word ? NN. word word." (full apparatus with letter sub-ref)
    text = re.sub(r'\d+\s*[a-z]\)\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s*,\s*[^\.\n]{0,80}\.', ' ', text)
    # "nonne word ?" pattern
    text = re.sub(r'\bnonne\s+[\u0370-\u03FF\u1F00-\u1FFF\s]+\s*\?', '', text)
    # Stray "NN." page references (2-3 digit numbers followed by period in apparatus context)
    text = re.sub(r'\b\d{2,3}\.\s+[\u0370-\u03FF\u1F00-\u1FFF]+(?:\s+[\u0370-\u03FF\u1F00-\u1FFF]+){0,3}\.', ' ', text)

    # --- V2: Remove editorial brackets ---
    text = EDITORIAL_BRACKETS.sub(lambda m: m.group(0)[1:-1], text)  # Keep content, remove brackets
    # Specific known noise
    text = re.sub(r'\btueded\b', '', text)
    text = re.sub(r'\baq\s+asad\b', '', text)
    text = re.sub(r'\.\.\.dans\b', '', text)

    # --- V2: Remove stray numbers that are page/footnote refs ---
    # Stray "N." at start of sentence or after punctuation (page numbers)
    text = re.sub(r'(?<=\.\s)\d{1,3}\.\s*(?=[\u0370-\u03FF\u1F00-\u1FFF])', '', text)
    # Stray standalone numbers between Greek text
    text = re.sub(r'(?<=[\u0370-\u03FF\u1F00-\u1FFF]\s)\d{1,2}(?=[\u0370-\u03FF\u1F00-\u1FFF])', '', text)

    # --- Latin apparatus remnants (from V1, kept and refined) ---
    # Multi-word Latin sequences (3+ words)
    text = re.sub(r'(?:\b[a-zA-Z]{3,}\b[\s\,]*){3,}[\.\:\;]?', ' ', text)
    # Short Latin words between Greek
    text = re.sub(r'(?<=[\u0370-\u03FF\u1F00-\u1FFF\s\,\.])\b(?:ita|que|hoc|vel|per|se|gb|leg|yt|dic|of|vlt|manu|mentum|verum|esse|quid)\b(?=[\s\,\.;\u0370-\u03FF\u1F00-\u1FFF])', '', text)
    # "Theod." reference
    text = re.sub(r'\bTheod\.?\s+[^\.\n]{0,30}[\.\,]', ' ', text)
    # "Sic X"
    text = re.sub(r'\bSic\s+\S+\s*', ' ', text)
    # "Deinde Mon."
    text = re.sub(r'\bDeinde\s+(?:Mon|Aug)\.?\s*[^\.]{0,30}[\.\:]', ' ', text)
    # Standalone "Aug." "Mon." "Cd." sigla
    text = re.sub(r'\b(?:Aug|Mon|Ciz|Cd)\.', '', text)
    # Parenthetical apparatus
    text = re.sub(r'\(\s*(?:Mon|Aug|Ciz)\.?\s+[^\)]{0,30}\)', '', text)
    text = re.sub(r'\(\s*(?:Mon|Aug|Ciz)[\,\s][^\)]{0,40}\)', '', text)
    # "Hom. II. IX." references
    text = re.sub(r'\bHom\.?\s*[IVXLCDM\.\s]+', '', text)
    # Roman numerals
    text = re.sub(r'\b[IVXLCDM]{2,4}\.?\s*(?=[\s\,\.\;\u0370-\u03FF\u1F00-\u1FFF])', '', text)
    # Stray "€." OCR artifact
    text = re.sub(r'€\.', '', text)
    # "ap." references
    text = re.sub(r'\bap\.\s*\S+\.?\s*', ' ', text)
    # "σαφ. , €. Mon,"
    text = re.sub(r'σαφ\.\s*,\s*€\.\s*Mon\s*,\s*\S+', '', text)
    # Cyrillic remnants
    text = CYRILLIC_SCRIPT.sub('', text)

    # --- V2: Clean garbled text fragments ---
    # Garbled Greek fragments at paragraph end (short non-sentence-ending fragments)
    # "προλικό της" - remove short garbled fragments at end that don't end with proper punctuation
    text = re.sub(r'\.\s+[\u0370-\u03FF\u1F00-\u1FFF]{2,10}\s+[\u0370-\u03FF\u1F00-\u1FFF]{2,5}\s*$', '.', text)
    # Remove very short non-Greek fragments at paragraph end
    text = re.sub(r'\s+[a-zA-Z]{2,6}\s*$', '', text)

    # --- General cleanup ---
    text = re.sub(r'\s*\.\s*\.', '.', text)
    text = re.sub(r'\s*,\s*,', ',', text)
    text = re.sub(r'\s{2,}', ' ', text)
    text = text.strip()
    return text


def build_paragraphs(lines: list) -> list:
    if not lines:
        return []

    paragraphs = []
    current = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current:
                paragraphs.append(' '.join(current))
                current = []
            continue

        if current:
            prev = current[-1]
            prev_ends_sentence = prev.rstrip().endswith(('.', '\u00b7', ';'))
            starts_with_capital = bool(re.match(r'^[\u0391-\u03A9\u1F08-\u1F6F\u1F88-\u1FAF]', stripped))
            if prev_ends_sentence and starts_with_capital and len(stripped) > 20:
                total_len = sum(len(s) for s in current)
                if total_len > 200:
                    paragraphs.append(' '.join(current))
                    current = [stripped]
                    continue

        current.append(stripped)

    if current:
        paragraphs.append(' '.join(current))

    # Merge very short paragraphs
    merged = []
    for para in paragraphs:
        if merged and len(para) < 50 and not para[0].isupper():
            merged[-1] = merged[-1] + ' ' + para
        else:
            merged.append(para)

    return merged


def process_chapter(lines: list, chapter_num: int, start_line: int, end_line: int) -> dict:
    clean_lines = []
    in_footnote_block = False

    for i in range(start_line, min(end_line, len(lines))):
        line = lines[i]
        raw_line = line.rstrip('\n')

        if 'ΚΕΦ' in raw_line and i <= start_line + 1:
            continue

        if 'INDEX' in raw_line:
            if i + 1 < len(lines) and 'VOCABULORUM' in lines[i + 1]:
                break

        should_remove, reason = should_remove_line(raw_line)
        if should_remove:
            stats[f'removed_{reason}'] += 1
            if reason in ('FOOTNOTE', 'APPARATUS', 'LATIN_EDITORIAL'):
                in_footnote_block = True
            continue

        if has_greek(raw_line) and greek_ratio(raw_line) > 0.7 and len(raw_line.strip()) > 30:
            in_footnote_block = False

        if in_footnote_block and not has_greek(raw_line):
            stats['removed_FOOTNOTE_CONTINUATION'] += 1
            continue
        if in_footnote_block and has_greek(raw_line) and greek_ratio(raw_line) < 0.4:
            stats['removed_FOOTNOTE_CONTINUATION'] += 1
            continue

        cleaned = raw_line.strip()
        cleaned = clean_inline_markers(cleaned)
        cleaned = clean_foreign_scripts(cleaned)
        cleaned = clean_page_number_prefix(cleaned)
        cleaned = re.sub(r'THEODORUS\s+METOCHITA\.?\s*\d*', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'\s+\d{3}\s*$', '', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()

        if cleaned and (has_greek(cleaned) or len(cleaned) > 5):
            clean_lines.append(cleaned)

    # Extract title
    title_lines = []
    body_start = 0
    for j, line in enumerate(clean_lines):
        if j < 3 and (
            re.match(r'^[\u1F45\u1F4D\u0028]τι\b', line) or  # Ὅτι
            re.match(r'^\u1F4D\u03C0\u03C9\u03C2', line) or  # Ὅπως
            re.match(r'^Θεωρία\b', line) or
            re.match(r'^Περ[ὶί]\b', line) or
            re.match(r'^Ἐξέτασις\b', line) or
            (j == 0 and len(line) < 200)
        ):
            title_lines.append(line)
            body_start = j + 1
            if line.rstrip().endswith('.') or line.rstrip().endswith(':'):
                break
        elif j == 0:
            title_lines.append(line)
            body_start = 1
            if line.rstrip().endswith('.'):
                break
        else:
            break

    title = ' '.join(title_lines).strip()
    title = title.rstrip('.').rstrip(':').strip()

    # Rejoin broken words at line level
    body_lines = clean_lines[body_start:]
    body_lines = rejoin_broken_words_lines(body_lines)

    # Build paragraphs
    paragraphs = build_paragraphs(body_lines)

    # V2: Post-processing with all fixes
    paragraphs = [post_clean_paragraph(p) for p in paragraphs]
    paragraphs = [p for p in paragraphs if p.strip() and len(p.strip()) > 10]

    # Also rejoin words in title
    title = rejoin_broken_words_in_text(title)

    stats['chapters_processed'] += 1
    stats['total_paragraphs'] += len(paragraphs)

    return {
        'chapterNumber': chapter_num,
        'title': title,
        'sourceContent': {
            'paragraphs': paragraphs
        }
    }


def find_chapter_118(lines: list) -> int:
    for i in range(8400, 8770):
        if i >= len(lines):
            break
        line = lines[i].strip()
        if 'ΚΕΦ' in line and 'ριη' in line:
            return i
    return -1


def main():
    print("=" * 60)
    print("Semeioseis Gnomikai Cleaning Pipeline V2")
    print("=" * 60)

    lines = read_raw_file()
    print(f"Read {len(lines)} lines from {RAW_FILE}")

    ch118_line = find_chapter_118(lines)
    chapter_map = list(CHAPTER_LINE_MAP)
    if ch118_line > 0:
        for idx, (line_num, ch_num) in enumerate(chapter_map):
            if ch_num == 119:
                chapter_map.insert(idx, (ch118_line, 118))
                print(f"Found chapter 118 at line {ch118_line}")
                break
    else:
        print("WARNING: Chapter 118 not found - may be merged with 117")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for i, (start_line_1indexed, chapter_num) in enumerate(chapter_map):
        start_line = start_line_1indexed - 1

        if i + 1 < len(chapter_map):
            end_line = chapter_map[i + 1][0] - 1
        else:
            end_line = len(lines)
            for j in range(start_line, len(lines)):
                if 'INDEX' in lines[j]:
                    end_line = j
                    break

        chapter_data = process_chapter(lines, chapter_num, start_line, end_line)

        output_file = OUTPUT_DIR / f"chapter-{chapter_num:03d}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(chapter_data, f, ensure_ascii=False, indent=2)

        para_count = len(chapter_data['sourceContent']['paragraphs'])
        title_preview = chapter_data['title'][:60]
        print(f"  Chapter {chapter_num:3d}: {para_count:2d} paragraphs | {title_preview}")

    print("\n" + "=" * 60)
    print("STATISTICS")
    print("=" * 60)
    for key, value in sorted(stats.items()):
        print(f"  {key}: {value}")
    print(f"\nOutput written to: {OUTPUT_DIR}")

    # Run validation
    print("\n" + "=" * 60)
    print("VALIDATION")
    print("=" * 60)
    from validators import validate_all_chapters
    results = validate_all_chapters(str(OUTPUT_DIR))
    print(f"Total paragraphs: {results['total_paragraphs']}")
    print(f"Total contaminated: {results['total_contaminated']}")
    print(f"Total broken words: {results['total_broken_words']}")
    print(f"Contamination rate: {results['overall_contamination_rate']:.1%}")

    # Detailed breakdown
    broken_para_count = 0
    apparatus_para_count = 0
    for ch in results['chapters']:
        cont = ch['contamination']
        if cont['broken_word_count'] > 0:
            broken_para_count += 1
        for issue in cont['issues']:
            for iss in issue.get('issues', []):
                if 'broken_word' in iss:
                    broken_para_count += 1
                    break

    # Count paragraphs with broken words
    broken_paras = 0
    for ch in results['chapters']:
        for issue in ch['contamination']['issues']:
            for iss in issue.get('issues', []):
                if 'broken_word' in iss:
                    broken_paras += 1
                    break

    print(f"\nParagraphs with broken words: {broken_paras}/{results['total_paragraphs']}")
    print(f"Degree markers found: {sum(ch['contamination']['degree_marker_count'] for ch in results['chapters'])}")
    print(f"Apparatus variants found: {sum(ch['contamination']['apparatus_variant_count'] for ch in results['chapters'])}")
    print(f"Editorial brackets found: {sum(ch['contamination']['editorial_bracket_count'] for ch in results['chapters'])}")
    print(f"OCR noise found: {sum(ch['contamination']['ocr_noise_count'] for ch in results['chapters'])}")

    if results['total_contaminated'] > 0:
        print("\nContaminated paragraphs detail:")
        for ch in results['chapters']:
            for issue in ch['contamination']['issues']:
                print(f"  Ch {ch['chapterNumber']} para {issue['paragraph_index']}: {issue['issues']}")
                print(f"    Snippet: {issue['snippet'][:80]}")


if __name__ == '__main__':
    main()
