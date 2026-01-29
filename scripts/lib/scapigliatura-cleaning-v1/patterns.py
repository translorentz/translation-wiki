"""Regex patterns for OCR noise detection and removal."""
import re

# Front matter ends before INTRODUZIONE (line 58 in original)
FRONT_MATTER_END = re.compile(r'^INTRODUZIONE\.?\s*$')

# Chapter headings
CHAPTER_HEADING = re.compile(r'^CAPITOLO\s+(PRIMO|SECONDO|TERZO|QUARTO|QUINTO|SESTO|SETTIMO|OTTAVO|NONO|DECIMO|UNDECIMO|DODICESIMO|TREDICESIMO|QUATTORDICESIMO|QUINDICESIMO|SEDICESIMO)[\s.*■,\d]*$')

INTRODUZIONE_HEADING = re.compile(r'^INTRODUZIONE\.?\s*$')

# Page number lines: - N -, — N —, and garbled variants
PAGE_NUMBER = re.compile(
    r'^\s*[-—–]\s*[\d\w()]{1,5}\s*[-—–]\s*$'  # - 39 -, — 99 —, - (i8 -, - m -
    r'|^\s*\d{1,3}\s*[-—–]\s*$'                 # 38 —
    r'|^\s*[-—–]\s*\d{1,3}\s*$'                 # — 6
    r'|^\s*[-—–]\s*\d{1,3}\s*[-—–i]\s*$'        # - 34 i -
    r'|^\s*\d{1,3}\s*$'                          # bare page numbers
)

# Garbled noise lines: high ratio of non-alphabetic chars
def is_noise_line(line: str) -> bool:
    """Returns True if line is OCR noise (high symbol-to-letter ratio)."""
    stripped = line.strip()
    if not stripped:
        return False

    # Single character lines are almost always noise
    if len(stripped) == 1:
        return True

    # Very short lines (2-3 chars) that aren't common Italian words
    if len(stripped) <= 3:
        if stripped.lower() not in {'il', 'la', 'le', 'lo', 'un', 'in', 'di', 'da', 'si', 'no', 'ma', 'se', 'ha', 'ho', 'fa', 'io', 'al', 'ai', 'ad', 'oh', 'ah', 'su', 'me', 'te', 'ci', 'vi', 'che', 'chi', 'non', 'per', 'con', 'già', 'più', 'poi', 'ora', 'qui', 'lui', 'lei', 'noi', 'voi', 'due', 'tre', 'era', 'gli', 'una', 'uno', 'col', 'del', 'nel', 'sul', 'fra'}:
            return True

    # Count alphabetic vs non-alphabetic
    alpha = sum(1 for c in stripped if c.isalpha())
    total = len(stripped.replace(' ', ''))
    if total == 0:
        return True
    ratio = alpha / total

    # Lines with <40% alphabetic chars
    if ratio < 0.40 and len(stripped) > 3:
        return True
    # Lines > 5 chars that are mostly punctuation/symbols
    if total > 5 and ratio < 0.50:
        return True

    # Short lines (< 20 chars) with lots of non-word characters (garbled OCR)
    # e.g., "ri Qtnrtnm", "'fi! i", ";r:Ó j"
    if len(stripped) < 25:
        # Check if it contains mostly non-Italian-word patterns
        words = stripped.split()
        real_words = sum(1 for w in words if len(w) >= 3 and re.match(r'^[A-Za-zÀ-ÿ\']+$', w))
        if len(words) > 0 and real_words == 0 and not re.match(r'^[A-Za-zÀ-ÿ\s\'\-]+$', stripped):
            return True

    return False

# Leading margin characters
LEADING_MARGIN = re.compile(r'^[\\\|>\(\{\[]\s+')

# Soft hyphen at end of line
SOFT_HYPHEN = re.compile(r'¬\s*$')

# Footnote lines
FOOTNOTE = re.compile(r'^\s*[\*†‡f\d]\)\s+')

# Multiple blank lines
MULTI_BLANK = re.compile(r'\n{3,}')

# Stray mid-sentence bullets/dots
STRAY_BULLETS = re.compile(r'\s•\s')

# "FINE." marker
FINE_MARKER = re.compile(r'^FINE\.\s*$')
