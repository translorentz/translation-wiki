#!/usr/bin/env python3
"""
Main cleaning pipeline for Semeioseis Gnomikai (chapters 82-120) - V3.

V3 FIXES (from V2 evaluator feedback, grade C+):
1. CRITICAL: Unhyphenated broken words (~60-70%) - process at RAW LINE level
   before joining. Detect short fragments at end of line that continue on next line.
2. Latin apparatus notes in body text (~12-15%) - aggressive Latin stripping
3. Asterisk markers in chapter titles (13%)
4. Empty chapter 118 removal
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
    STAR_MARKER, OMICRON_MARKER, is_greek_char, greek_char_count,
    VALID_SHORT_GREEK as _PATTERNS_VALID_SHORT_GREEK
)
from filters import should_remove_line, is_footnote_line, is_page_header

BASE_DIR = Path("/Users/bryancheong/claude_projects/translation-wiki")
RAW_FILE = BASE_DIR / "data/raw/semeioseis_gnomikai/semeioseis_gnomikai_82_120.txt"
OUTPUT_DIR = BASE_DIR / "data/processed/semeioseis-gnomikai"

# Chapter line map (same as V1/V2 - chapter segmentation was correct)
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

# Use the comprehensive valid words set from patterns.py
VALID_SHORT_GREEK = _PATTERNS_VALID_SHORT_GREEK

# Common Greek prefixes that get split at line breaks
# These are NOT valid standalone words and should be merged
GREEK_PREFIXES = {
    'ἀ', 'ἁ', 'ἐ', 'ἑ', 'ἰ', 'ἱ', 'ὀ', 'ὁ', 'ὑ',  # single vowel prefixes
    'κα', 'πα', 'μα', 'δα', 'βα', 'γα', 'λα', 'σα', 'τα', 'φα', 'χα', 'ψα',
    'κε', 'πε', 'με', 'δε', 'βε', 'γε', 'λε', 'σε', 'τε', 'φε', 'χε',
    'κι', 'πι', 'μι', 'δι', 'βι', 'γι', 'λι', 'σι', 'τι', 'φι', 'χι',
    'κο', 'πο', 'μο', 'δο', 'βο', 'γο', 'λο', 'σο', 'το', 'φο', 'χο',
    'κυ', 'πυ', 'μυ', 'δυ', 'βυ', 'γυ', 'λυ', 'συ', 'τυ', 'φυ', 'χυ',
    'πρε', 'προ', 'προ',
    'ἀπ', 'ἐπ', 'ὑπ', 'κατ', 'παρ', 'περ', 'συν', 'ξυν',
}


def read_raw_file():
    with open(RAW_FILE, 'r', encoding='utf-8') as f:
        return f.readlines()


def get_line_end_greek_fragment(line: str) -> str:
    """Extract the last token from a line if it's a short Greek fragment (likely a broken prefix)."""
    stripped = line.rstrip()
    if not stripped:
        return ''
    # Don't process if line ends with sentence punctuation
    if stripped[-1] in '.;·:,':
        return ''
    # Get last word/token
    parts = stripped.split()
    if not parts:
        return ''
    last = parts[-1]
    # Strip trailing punctuation for analysis
    last_clean = last.rstrip('.,;:·\'")')
    # Count Greek chars in the fragment
    grk_count = greek_char_count(last_clean)
    total = len(last_clean)
    if total == 0:
        return ''
    # Must be purely/mostly Greek
    if grk_count < total * 0.7:
        return ''
    # CONSERVATIVE: Only merge very short fragments (1-4 Greek chars)
    # These are almost certainly broken prefixes, not complete words
    if grk_count > 4:
        return ''
    if grk_count < 1:
        return ''
    return last_clean


def get_line_start_greek_word(line: str) -> str:
    """Extract the first word from a line if it starts with Greek."""
    stripped = line.strip()
    if not stripped:
        return ''
    parts = stripped.split()
    if not parts:
        return ''
    first = parts[0]
    # Must start with Greek
    if not first or not is_greek_char(first[0]):
        return ''
    return first


def rejoin_unhyphenated_breaks(lines: list) -> list:
    """
    V3 CRITICAL FIX: Rejoin words broken across lines WITHOUT hyphens.

    Strategy: For each pair of consecutive lines, check if:
    1. Current line ends with a short Greek fragment (1-5 Greek chars)
    2. Next line starts with a Greek word
    3. The fragment is NOT a valid standalone Greek word
    Then merge the fragment with the start of the next line.
    """
    if not lines:
        return lines

    result = []
    i = 0
    while i < len(lines):
        line = lines[i]

        if i + 1 < len(lines):
            fragment = get_line_end_greek_fragment(line)
            next_start = get_line_start_greek_word(lines[i + 1])

            if fragment and next_start and fragment not in VALID_SHORT_GREEK:
                # Check it's not just a short valid word by more criteria
                # The fragment should look like a word prefix, not a complete word
                # Heuristic: if the fragment ends with a vowel or common prefix ending, merge
                should_merge = True

                # Don't merge if fragment is a known standalone word
                if fragment in VALID_SHORT_GREEK:
                    should_merge = False
                # Don't merge if fragment ends with sentence-ending punctuation
                if line.rstrip().endswith(('.', ';', '·', ':')):
                    should_merge = False
                # Don't merge if line ends with comma followed by fragment (the fragment is after punctuation = likely new word)
                stripped_line = line.rstrip()
                words = stripped_line.split()
                if len(words) >= 2:
                    second_last = words[-2].rstrip()
                    if second_last.endswith(',') or second_last.endswith(';') or second_last.endswith(':'):
                        # Fragment follows punctuation - check more carefully
                        # Still merge if fragment is clearly a prefix (very short, common prefix)
                        if greek_char_count(fragment) > 3:
                            should_merge = False

                if should_merge:
                    # Remove the fragment from end of current line
                    # and prepend it to the start of next line
                    line_stripped = line.rstrip()
                    # Find the fragment at the end
                    # Split on spaces, remove last token, rejoin
                    parts = line_stripped.rsplit(None, 1)
                    if len(parts) == 2:
                        line_prefix = parts[0]
                        # Get the next line and prepend fragment
                        next_line = lines[i + 1]
                        next_stripped = next_line.strip()
                        # Replace the first word of next line with merged word
                        next_parts = next_stripped.split(None, 1)
                        if next_parts:
                            merged_word = fragment + next_parts[0]
                            if len(next_parts) > 1:
                                new_next = merged_word + ' ' + next_parts[1]
                            else:
                                new_next = merged_word
                            result.append(line_prefix)
                            lines[i + 1] = new_next + '\n'
                            stats['unhyphenated_words_rejoined'] += 1
                            i += 1
                            continue
                    elif len(parts) == 1:
                        # The entire line is the fragment
                        next_line = lines[i + 1]
                        next_stripped = next_line.strip()
                        next_parts = next_stripped.split(None, 1)
                        if next_parts:
                            merged_word = fragment + next_parts[0]
                            if len(next_parts) > 1:
                                new_next = merged_word + ' ' + next_parts[1]
                            else:
                                new_next = merged_word
                            lines[i + 1] = new_next + '\n'
                            stats['unhyphenated_words_rejoined'] += 1
                            i += 1
                            continue

        result.append(line)
        i += 1

    return result


def rejoin_broken_words_in_text(text: str) -> str:
    """
    Rejoin words broken by line-break hyphens in assembled text.
    Handles: `πα- ρασκευαστέον` -> `παρασκευαστέον`
    """
    prev = None
    count = 0
    while prev != text:
        prev = text
        text = BROKEN_WORD_IN_TEXT.sub(lambda m: m.group(1) + m.group(3), text)
        count += 1
    stats['words_rejoined_in_text'] += max(0, count - 1)
    return text


def rejoin_unhyphenated_in_text(text: str) -> str:
    """
    V3: Additional pass to rejoin unhyphenated broken words in assembled text.
    CONSERVATIVE: Only merge fragments of 1-3 Greek chars that are clearly prefixes.
    """
    grk = r'[\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F\u1DC0-\u1DFF]'
    # Match short Greek fragment (1-3 chars) + space + continuation (2+ chars)
    pattern = re.compile(
        r'(?<=\s)(' + grk + r'{1,3})\s+(' + grk + r'{2,})(?=[\s\.\,\;\:\·]|$)'
    )

    prev = None
    count = 0
    while prev != text:
        prev = text

        def replace_if_fragment(m):
            frag = m.group(1)
            cont = m.group(2)
            # Don't merge valid standalone words
            if frag in VALID_SHORT_GREEK:
                return m.group(0)
            # Only merge fragments with 1-3 Greek chars
            if greek_char_count(frag) > 3:
                return m.group(0)
            return frag + cont

        text = pattern.sub(replace_if_fragment, text)
        count += 1
        if count > 10:
            break

    stats['unhyphenated_rejoined_in_text'] += max(0, count - 1)
    return text


def clean_apparatus_markers(text: str) -> str:
    """Remove apparatus footnote markers from body text."""
    text = DEGREE_MARKER.sub(' ', text)
    text = STAR_MARKER.sub('', text)
    text = OMICRON_MARKER.sub('', text)
    text = re.sub(r'(?<!\()\s*\d{1,2}\s*\)\s*', ' ', text)
    text = re.sub(r'\s+\*\s+', ' ', text)
    return text


def clean_apparatus_variants(text: str) -> str:
    """Remove apparatus variant notes embedded in body text."""
    text = APPARATUS_VARIANT.sub(' ', text)
    text = APPARATUS_FOOTNOTE_REF.sub(' ', text)
    text = PAGE_REFERENCE.sub(' ', text)
    text = re.sub(r'[ΒB][ΙIl]\.\s+[^\.\n]{2,40}\.?', ' ', text)
    text = DOUBLE_ASTERISK.sub(' ', text)
    text = re.sub(r'[ΕE]\.\s*[ΜM][οo]n\s*\.?\s*[^\.\n]{0,40}\.', ' ', text)
    return text


def clean_latin_apparatus_v3(text: str) -> str:
    """
    V3 AGGRESSIVE: Strip Latin apparatus notes embedded in Greek body text.
    This is much more aggressive than V2, targeting specific Latin words and patterns
    identified by the evaluator.
    """
    # --- Pattern 1: Latin word(s) followed by colon/comma then Greek ---
    # e.g., "inscripsit : περὶ" -> "περὶ"
    # e.g., "postea: νόμοι" -> "νόμοι"
    # e.g., "Item: τοὺς" -> "τοὺς"
    # e.g., "dicuntur γενναῖα" -> "γενναῖα"
    # e.g., "iterum : ἐπαλλοτρίας" -> "ἐπαλλοτρίας"
    latin_intro_words = (
        r'(?:inscripsit|Omisit|dicuntur|postea|Item|iterum|Verba|venire|vrbs|Deinde|'
        r'et\s+leguntur\s+haec|leguntur|confunduntur|saepe)'
    )
    text = re.sub(
        latin_intro_words + r'\s*[\:\,]?\s*',
        ' ', text, flags=re.IGNORECASE
    )

    # --- Pattern 2: Full apparatus notes with "pro X dat Y" or "et X pro Y" ---
    # e.g., "pro ὥςπερ dat ἥςπερ, et ἀπόκλειστο pro ἀποκέκλειστο."
    text = re.sub(
        r'\bpro\s+[\u0370-\u03FF\u1F00-\u1FFF\S]+\s+dat\s+[\u0370-\u03FF\u1F00-\u1FFF\S]+[\,\.]?\s*'
        r'(?:et\s+[\u0370-\u03FF\u1F00-\u1FFF\S]+\s+pro\s+[\u0370-\u03FF\u1F00-\u1FFF\S]+[\.\,]?\s*)*',
        ' ', text
    )

    # --- Pattern 3: Sigla blocks ---
    # "C. Mon." "C. Aug." "Reg. Paris." "Ο . C. Reg. Paris."
    # "C. Μon." "C. Μου," -- note: Μ is Greek capital mu, not Latin M
    text = re.sub(
        r'(?:Ο\s*\.\s*)?C\.\s*(?:Mon|Aug|Ciz|Reg|Μon|Μου)[\.\,]?\s*'
        r'(?:(?:Paris|Reg|Mon|Aug)[\.\,]?\s*)*'
        r'(?:[\u0370-\u03FF\u1F00-\u1FFF]+[\.\,]?\s*){0,3}',
        ' ', text
    )

    # --- Pattern 4: Codex references ---
    # "C.107." "Cod. σκυτοῤῥάφον"
    text = re.sub(r'C\.\s*\d{2,3}\.\s*', ' ', text)
    text = re.sub(r'\bCod\s*\.?\s*', ' ', text)

    # --- Pattern 5: Page/line references with apparatus ---
    # "25 σαφ. , Mon, σαφέστατ 3 μεγίστῳ , 6. Μου. μεγίστη."
    text = re.sub(
        r'\d{1,3}\s+[\u0370-\u03FF\u1F00-\u1FFF]+\.\s*,\s*(?:Mon|Μon|Μου)[\.\,]\s*'
        r'[\u0370-\u03FF\u1F00-\u1FFF\s\.\,\d]+[\.\:]',
        ' ', text
    )

    # --- Pattern 6: "Herod. N, N." citation references ---
    text = re.sub(r'\bHerod\.\s*\d[\d\s\,\.]*\)', ' ', text)

    # --- Pattern 7: "et N saepe confunduntur." ---
    text = re.sub(r'\bet\s+\d\s+saepe\s+\w+\.?', ' ', text)

    # --- Pattern 8: Apparatus with question mark ---
    # ": 21 εὐνοίᾳ , C. Μon. εὐγενείᾳ. : μενοι ?"
    text = re.sub(
        r':\s*\d+\s+[\u0370-\u03FF\u1F00-\u1FFF]+\s*,\s*C\.\s*[ΜM][οo][nu][\.\,]\s*'
        r'[\u0370-\u03FF\u1F00-\u1FFF]+[\.\:]\s*(?::\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s*\?)?',
        ' ', text
    )

    # --- Pattern 9: Garbled apparatus with sigla ---
    # "συμφυροL συνδιατ. , C. Μου, συνδιατιθορέα"
    text = re.sub(
        r'[\u0370-\u03FF\u1F00-\u1FFF]+L\s+[\u0370-\u03FF\u1F00-\u1FFF]+\.\s*,\s*C\.\s*[ΜM][οo][nu][\.\,]\s*'
        r'[\u0370-\u03FF\u1F00-\u1FFF]+',
        ' ', text
    )

    # --- Pattern 10: "vt Ciz," "vt etiam" ---
    text = re.sub(r'\bvt\s+(?:Ciz|etiam|C\.)\s*[\.\,]?\s*', ' ', text)

    # --- Pattern 11: "rum in Cod." (fragment from line break in apparatus) ---
    text = re.sub(r'\brum\s+in\s+\w+\.\s*', ' ', text)

    # --- Pattern 12: Isolated Latin words between Greek ---
    # Match Latin word surrounded by Greek context
    latin_words_pattern = (
        r'\b(?:Verba|ab|inscripsit|Omisit|dicuntur|postea|Item|iterum|venire|vrbs|'
        r'saepe|confunduntur|leguntur|haec|vt|Deinde|legendum|fortasse|vitiose|nonne|'
        r'addunt|addit|exhibent|habent|non|Sic|cum|etiam|quid|esse|verum|'
        r'fors|male|rectius|punctis|absunt|vsque|aberrans|praeeunte|consentiunt|'
        r'notatum|scriptum|delendum|videatur)\b'
    )
    text = re.sub(latin_words_pattern, ' ', text)

    # --- Pattern 13: "et" between two Greek words (apparatus connector) ---
    # Be careful: only strip when it looks like apparatus, not natural text
    text = re.sub(
        r'(?<=[\u0370-\u03FF\u1F00-\u1FFF\.\,])\s+et\s+(?=[\u0370-\u03FF\u1F00-\u1FFF])',
        ' ', text
    )
    text = re.sub(
        r'(?<=[\u0370-\u03FF\u1F00-\u1FFF\.\,])\s+et\s+\d\s+',
        ' ', text
    )

    # --- Pattern 14: Remaining standalone sigla ---
    text = re.sub(r'\b(?:Mon|Aug|Ciz|Cdd|Reg|Paris)\.?\s*', '', text)
    text = re.sub(r'\bΜon\.?\s*', '', text)
    text = re.sub(r'\bΜου[\.\,]?\s*', '', text)
    # Single-letter sigla: "C." when not part of a Greek word
    text = re.sub(r'(?<=[\s\.\,\;])C\.(?=[\s\.\,\;])', '', text)
    text = re.sub(r'^C\.(?=[\s\.\,\;])', '', text)

    # --- Pattern 15: Multi-word Latin sequences (3+ words) ---
    text = re.sub(r'(?:\b[a-zA-Z]{3,}\b[\s\,]*){3,}[\.\:\;]?', ' ', text)

    # --- Pattern 16: Short Latin words between Greek ---
    text = re.sub(
        r'(?<=[\u0370-\u03FF\u1F00-\u1FFF\s\,\.])\b(?:ita|que|hoc|vel|per|se|gb|leg|yt|dic|of|vlt|manu|mentum|dat|pro)\b(?=[\s\,\.;\u0370-\u03FF\u1F00-\u1FFF])',
        '', text
    )

    # --- Pattern 17: References like "Theod." ---
    text = re.sub(r'\bTheod\.?\s+[^\.\n]{0,30}[\.\,]', ' ', text)
    text = re.sub(r'\bHom\.?\s*[IVXLCDM\.\s]+', '', text)
    text = re.sub(r'\bap\.\s*\S+\.?\s*', ' ', text)
    text = re.sub(r'\bPlut\.?\s*[^\.]{0,40}[\.\:]', ' ', text)
    text = re.sub(r'\bCorn\.?\s+Nep\.?\s*[^\.]{0,20}[\.\:]', ' ', text)
    text = re.sub(r'\bOrell\.?\s+\S+(?:\s+\S+){0,5}[\.\:]?', '', text)
    text = re.sub(r'\bFabric\.?\s+\S+(?:\s+\S+){0,3}\.?', '', text)
    text = re.sub(r'\bBloch\.?\s+\S+(?:\s+\S+){0,3}\.?', '', text)

    # --- Pattern 18: Parenthetical apparatus ---
    text = re.sub(r'\(\s*(?:Mon|Aug|Ciz)\.?\s+[^\)]{0,30}\)', '', text)
    text = re.sub(r'\(\s*(?:Mon|Aug|Ciz)[\,\s][^\)]{0,40}\)', '', text)
    text = re.sub(r'\(\s*vitiose\s*\)', '', text)

    # --- Pattern 19: "non habent" and similar ---
    text = re.sub(r'\bnon\s+habent\b', '', text)
    text = re.sub(r'\bsed\s+[a-zA-Z\s\.\,]{3,30}', '', text)

    # --- Pattern 20: Cyrillic remnants ---
    text = CYRILLIC_SCRIPT.sub('', text)

    return text


def clean_inline_markers(text: str) -> str:
    """Remove inline footnote markers and apparatus from body text."""
    text = re.sub(r'^[\·\-\•]\s*', '', text)
    text = re.sub(
        r'[\u0370-\u03FF\u1F00-\u1FFF]+\s+C\.\s*(?:Mon|Aug|Ciz)\.?\s+[^\.\n]{0,60}(?:\.|$)',
        '', text
    )
    text = re.sub(r'\bC\.\s*(?:Mon|Aug|Ciz|Paris)\.?\s*[^\.]{0,60}\.', ' ', text)
    text = re.sub(r'\bCdd\s*\.?\s*(?:Mon|Aug|nostri)\S*(?:\s+\S+){0,8}[\.\:\;]', '', text)
    text = re.sub(r'\bFabric\.?\s+\S+(?:\s+\S+){0,3}\.?', '', text)
    text = re.sub(r'\bBloch\.?\s+\S+(?:\s+\S+){0,3}\.?', '', text)
    text = re.sub(r'\bOrell\.?\s+\S+(?:\s+\S+){0,5}[\.\:]?', '', text)
    text = re.sub(r'\bnon\s+habent\b', '', text)
    text = re.sub(r'\bsed\s+[a-zA-Z\s\.\,]{3,30}', '', text)
    text = re.sub(r'\(\s*vitiose\s*\)', '', text)
    text = re.sub(r'\.?\s*[Ll]egendum\s+[a-zA-Z\s\.\,]{3,40}', '', text)
    text = re.sub(r'\.?\s*fortasse\s+\S+(?:\s+\S+){0,3}[\.\:\;]?', '', text)
    text = re.sub(r'\.?\s*Theodorus\s+[a-zA-Z\s\.\,]{3,60}', '', text)
    text = re.sub(r'\s*cum\s+[A-Z][a-z]+\.\s*[IVXLCDM]*\.?\s*', '', text)
    text = re.sub(r'^ΚΕΦ\.\s*\S+\s*', '', text)
    text = re.sub(r'\bCod\s*\.?\s*(?:Aug|Mon|Paris)\.?\s*[^\.]{0,40}[\.\:]', ' ', text)
    text = re.sub(r'\bMon\.?\s+et\s+Aug\.?\s*[^\.]{0,40}[\.\:]', ' ', text)
    text = re.sub(r'\bGerm\.?\s*[^\.]{0,30}[\.\:]', ' ', text)
    text = re.sub(r'\bSic\s+(?:etiam|dic)\S*\.?\s*[^\.]{0,40}[\.\:]', ' ', text)
    text = re.sub(r'\bcf\.?\s+\S+\.?\s*[^\.]{0,30}[\.\:]', ' ', text)
    text = re.sub(r'\bPlut\.?\s*[^\.]{0,40}[\.\:]', ' ', text)
    text = re.sub(r'\bCorn\.?\s+Nep\.?\s*[^\.]{0,20}[\.\:]', ' ', text)
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


def clean_title_v3(title: str) -> str:
    """V3: Clean asterisk and footnote markers from chapter titles."""
    # Remove *) patterns
    title = re.sub(r'\s*\*\s*\)\s*', ' ', title)
    # Remove N ) patterns (number + space + closing paren)
    title = re.sub(r'\s*\d+\s*\)\s*', ' ', title)
    # Remove ***· or *** patterns
    title = re.sub(r'\*{2,}\s*·?\s*', '', title)
    # Remove stray ) after space
    title = re.sub(r'\s+\)', ' ', title)
    # Clean up whitespace
    title = re.sub(r'\s{2,}', ' ', title)
    return title.strip()


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
    V3: Comprehensive post-processing on assembled paragraphs.
    """
    # --- Remove OCR noise artifacts FIRST ---
    text = LATIN_ARTIFACT_IN_GREEK.sub('', text)

    # --- Rejoin hyphenated broken words ---
    text = rejoin_broken_words_in_text(text)

    # --- V3: Rejoin unhyphenated broken words (second pass) ---
    text = rejoin_unhyphenated_in_text(text)

    # --- Remove apparatus markers ---
    text = clean_apparatus_markers(text)

    # --- Remove apparatus variant notes ---
    text = clean_apparatus_variants(text)

    # --- V3: Aggressive Latin apparatus removal ---
    text = clean_latin_apparatus_v3(text)

    # --- Broader apparatus footnote patterns ---
    text = re.sub(r'\d+\s*[a-z]\)\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s*,\s*[^\.\n]{0,80}\.', ' ', text)
    text = re.sub(r'\bnonne\s+[\u0370-\u03FF\u1F00-\u1FFF\s]+\s*\?', '', text)
    text = re.sub(r'\b\d{2,3}\.\s+[\u0370-\u03FF\u1F00-\u1FFF]+(?:\s+[\u0370-\u03FF\u1F00-\u1FFF]+){0,3}\.', ' ', text)

    # --- Remove editorial brackets ---
    text = EDITORIAL_BRACKETS.sub(lambda m: m.group(0)[1:-1], text)

    # --- Known noise ---
    text = re.sub(r'\btueded\b', '', text)
    text = re.sub(r'\baq\s+asad\b', '', text)
    text = re.sub(r'\.\.\.dans\b', '', text)

    # --- Stray page/footnote refs ---
    text = re.sub(r'(?<=\.\s)\d{1,3}\.\s*(?=[\u0370-\u03FF\u1F00-\u1FFF])', '', text)
    text = re.sub(r'(?<=[\u0370-\u03FF\u1F00-\u1FFF]\s)\d{1,2}(?=[\u0370-\u03FF\u1F00-\u1FFF])', '', text)

    # --- Roman numerals ---
    text = re.sub(r'\b[IVXLCDM]{2,4}\.?\s*(?=[\s\,\.\;\u0370-\u03FF\u1F00-\u1FFF])', '', text)

    # --- Stray punctuation artifacts ---
    text = re.sub(r'€\.', '', text)
    text = re.sub(r'σαφ\.\s*,\s*€\.\s*Mon\s*,\s*\S+', '', text)

    # --- Garbled fragments ---
    text = re.sub(r'\.\s+[\u0370-\u03FF\u1F00-\u1FFF]{2,10}\s+[\u0370-\u03FF\u1F00-\u1FFF]{2,5}\s*$', '.', text)
    text = re.sub(r'\s+[a-zA-Z]{2,6}\s*$', '', text)

    # --- General cleanup ---
    text = re.sub(r'\s*\.\s*\.', '.', text)
    text = re.sub(r'\s*,\s*,', ',', text)
    text = re.sub(r'\s*:\s*:', ':', text)
    text = re.sub(r'\s*;\s*;', ';', text)
    # Clean isolated punctuation
    text = re.sub(r'\s+[\.\,\;\:]\s+[\.\,\;\:]', '.', text)
    # Multiple spaces
    text = re.sub(r'\s{2,}', ' ', text)
    text = text.strip()
    # Remove leading/trailing punctuation artifacts
    text = re.sub(r'^[\.\,\;\:\s]+', '', text)
    text = re.sub(r'[\.\,\;\:\s]+$', lambda m: '.' if '.' in m.group() else '', text)
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
    # First collect raw lines for this chapter (before any cleaning)
    raw_chapter_lines = []
    for i in range(start_line, min(end_line, len(lines))):
        raw_chapter_lines.append(lines[i])

    # V3: Rejoin unhyphenated broken words at the raw line level FIRST
    raw_chapter_lines = rejoin_unhyphenated_breaks(raw_chapter_lines)

    clean_lines = []
    in_footnote_block = False

    for raw_line in raw_chapter_lines:
        raw_line_stripped = raw_line.rstrip('\n')

        if 'ΚΕΦ' in raw_line_stripped and raw_chapter_lines.index(raw_line) <= 1:
            continue

        if 'INDEX' in raw_line_stripped:
            remaining = raw_chapter_lines[raw_chapter_lines.index(raw_line):]
            if len(remaining) > 1 and 'VOCABULORUM' in remaining[1]:
                break

        should_remove, reason = should_remove_line(raw_line_stripped)
        if should_remove:
            stats[f'removed_{reason}'] += 1
            if reason in ('FOOTNOTE', 'APPARATUS', 'LATIN_EDITORIAL'):
                in_footnote_block = True
            continue

        if has_greek(raw_line_stripped) and greek_ratio(raw_line_stripped) > 0.7 and len(raw_line_stripped.strip()) > 30:
            in_footnote_block = False

        if in_footnote_block and not has_greek(raw_line_stripped):
            stats['removed_FOOTNOTE_CONTINUATION'] += 1
            continue
        if in_footnote_block and has_greek(raw_line_stripped) and greek_ratio(raw_line_stripped) < 0.4:
            stats['removed_FOOTNOTE_CONTINUATION'] += 1
            continue

        cleaned = raw_line_stripped.strip()
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
            re.match(r'^[\u1F45\u1F4D\u0028]τι\b', line) or
            re.match(r'^\u1F4D\u03C0\u03C9\u03C2', line) or
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

    # V3: Clean title markers
    title = clean_title_v3(title)
    title = rejoin_broken_words_in_text(title)
    title = rejoin_unhyphenated_in_text(title)

    # Rejoin broken words at line level
    body_lines = clean_lines[body_start:]
    body_lines = rejoin_broken_words_lines(body_lines)

    # Build paragraphs
    paragraphs = build_paragraphs(body_lines)

    # V3: Post-processing with all fixes
    paragraphs = [post_clean_paragraph(p) for p in paragraphs]
    paragraphs = [p for p in paragraphs if p.strip() and len(p.strip()) > 10]

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
    print("Semeioseis Gnomikai Cleaning Pipeline V3")
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
        print("Chapter 118 not found - will not output empty chapter (V3 fix)")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # V3: Remove stale chapter-118 if it exists
    ch118_file = OUTPUT_DIR / "chapter-118.json"
    if ch118_file.exists() and ch118_line <= 0:
        ch118_file.unlink()
        print("Removed empty chapter-118.json")

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

        # V3: Skip empty chapters
        if not chapter_data['sourceContent']['paragraphs']:
            print(f"  Chapter {chapter_num:3d}: SKIPPED (empty)")
            continue

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
    print(f"Total hyphenated broken words: {results['total_broken_words']}")
    print(f"Total unhyphenated broken words: {results['total_unhyphenated_breaks']}")
    print(f"Total Latin in body: {results['total_latin_in_body']}")
    print(f"Total title issues: {results['total_title_issues']}")
    print(f"Contamination rate: {results['overall_contamination_rate']:.1%}")

    # Per-chapter details for contaminated ones
    if results['total_contaminated'] > 0:
        print(f"\nContaminated paragraphs ({results['total_contaminated']}):")
        for ch in results['chapters']:
            for issue in ch['contamination']['issues']:
                print(f"  Ch {ch['chapterNumber']} para {issue['paragraph_index']}: {issue['issues']}")
                print(f"    Snippet: {issue['snippet'][:100]}")
            if ch['title_issues']:
                print(f"  Ch {ch['chapterNumber']} TITLE: {ch['title_issues']}")


if __name__ == '__main__':
    main()
