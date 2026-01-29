"""
Detection functions for identifying contamination lines in Semeioseis Gnomikai - V2.
"""

import re
from patterns import (
    PAGE_HEADER, FOOTNOTE_START, FOOTNOTE_START_STAR, FOOTNOTE_CONTINUATION,
    MANUSCRIPT_SIGLA, LATIN_APPARATUS, ARABIC_SCRIPT, HEBREW_SCRIPT,
    DEVANAGARI_SCRIPT, GUJARATI_SCRIPT, CJK_SCRIPT, MISC_NON_GREEK,
    STANDALONE_PAGE_NUM, OCR_NOISE_LINE, PURE_NOISE,
    has_greek, greek_ratio, GREEK_CHARS
)


def is_page_header(line: str) -> bool:
    return bool(PAGE_HEADER.match(line))


def is_footnote_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if FOOTNOTE_START.match(stripped):
        return True
    if FOOTNOTE_START_STAR.match(stripped):
        return True
    if FOOTNOTE_CONTINUATION.match(stripped):
        return True
    if MANUSCRIPT_SIGLA.search(stripped) and greek_ratio(stripped) < 0.6:
        return True
    if LATIN_APPARATUS.search(stripped) and greek_ratio(stripped) < 0.6:
        return True
    if re.match(r'^[\*\-]?\s*[\u0370-\u03FF\u1F00-\u1FFF]+[\s,]+(?:C\.|Cdd|abest|deest|desunt)', stripped):
        return True
    if MANUSCRIPT_SIGLA.search(stripped) and len(stripped) < 80:
        return True
    if re.search(r'\bOrell\.', stripped) and len(stripped) < 100:
        return True
    return False


def is_apparatus_line(line: str) -> bool:
    stripped = line.strip()
    if re.match(r'^[\*\-]?\s*\d{0,2}\s*\)?\s*[\u0370-\u03FF\u1F00-\u1FFF]', stripped):
        if MANUSCRIPT_SIGLA.search(stripped):
            return True
    if MANUSCRIPT_SIGLA.search(stripped) and not has_greek(stripped[:20]):
        return True
    return False


def is_arabic_or_foreign(line: str) -> bool:
    stripped = line.strip()
    if ARABIC_SCRIPT.search(stripped):
        return True
    if HEBREW_SCRIPT.search(stripped):
        return True
    if DEVANAGARI_SCRIPT.search(stripped):
        return True
    if GUJARATI_SCRIPT.search(stripped):
        return True
    if CJK_SCRIPT.search(stripped):
        if 'ΚΕΦ' not in stripped:
            return True
    return False


def is_ocr_noise(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return True
    if len(stripped) <= 3 and not has_greek(stripped):
        return True
    if OCR_NOISE_LINE.match(stripped) and not has_greek(stripped):
        return True
    if PURE_NOISE.match(stripped):
        return True
    if len(stripped) == 1 and not GREEK_CHARS.match(stripped):
        return True
    return False


def is_standalone_page_number(line: str) -> bool:
    return bool(STANDALONE_PAGE_NUM.match(line.strip()))


def is_latin_editorial(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    latin_starts = [
        'sic ', 'sed ', 'quod ', 'nec ', 'Lege:', 'Lege ', 'fors.',
        'Infra ', 'In Indice', 'Erasm.', 'cf.', 'Livius', 'Plut.',
        'Vol.', 'ed.', 'Est vers.', 'qui vero', 'Theodorus loca',
        'Archidami', 'Scriptor', 'ab hoc', 'consentiunt',
        'notatum', 'in margine', 'Nota.', 'Numeri vocabulis',
        'numeris appositae', 'indicant',
    ]
    for start in latin_starts:
        if stripped.startswith(start):
            return True
    if len(stripped) > 10 and greek_ratio(stripped) < 0.2 and has_greek(stripped) is False:
        latin_words = len(re.findall(r'\b[a-zA-Z]{3,}\b', stripped))
        if latin_words >= 3:
            return True
    return False


def is_index_line(line: str) -> bool:
    stripped = line.strip()
    if stripped.startswith('INDEX'):
        return True
    if stripped.startswith('VOCABULORUM'):
        return True
    if stripped.startswith('Nota.'):
        return True
    return False


def should_remove_line(line: str) -> tuple:
    if is_page_header(line):
        return True, 'PAGE_HEADER'
    if is_standalone_page_number(line):
        return True, 'PAGE_NUMBER'
    if is_footnote_line(line):
        return True, 'FOOTNOTE'
    if is_apparatus_line(line):
        return True, 'APPARATUS'
    if is_latin_editorial(line):
        return True, 'LATIN_EDITORIAL'
    if is_arabic_or_foreign(line):
        return True, 'FOREIGN_SCRIPT'
    if is_ocr_noise(line):
        return True, 'OCR_NOISE'
    if is_index_line(line):
        return True, 'INDEX'
    return False, ''
