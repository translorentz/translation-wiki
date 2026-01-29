"""
Regex patterns for cleaning Semeioseis Gnomikai OCR text - V2.
V2 fixes: word rejoining, apparatus markers, variant notes, OCR noise.
"""

import re

# --- Page headers ---
PAGE_HEADER = re.compile(
    r'^\s*\d*\s*THEODORUS\s+METOCHITA\.?\s*\d*\s*$',
    re.IGNORECASE
)

# --- Footnote blocks (multi-line apparatus at bottom of pages) ---
FOOTNOTE_START = re.compile(
    r'^\s*[\*\-]?\s*\d{1,2}\s*\)\s+\S',
)
FOOTNOTE_START_STAR = re.compile(
    r'^\s*\*\s*\d{1,2}\s*\)\s+',
)
FOOTNOTE_CONTINUATION = re.compile(
    r'^\s*(?:sed|quod|nec|Lege|Infra|In\s+Indice|Erasm|praeeunte|addit|addunt|Livius|Plut|Vol|cf\.|ed\.|p\.\s*\d)',
    re.IGNORECASE
)

# Manuscript sigla
MANUSCRIPT_SIGLA = re.compile(
    r'\b(?:C\.\s*(?:Mon|Aug|Ciz)|Cdd\.?\s*(?:Mon|Aug|nostri)|Bloch\.?|Fabric\.?|Reisk\.?)\b'
)

# Latin apparatus phrases
LATIN_APPARATUS = re.compile(
    r'\b(?:sic\s+Cdd|abest\s+a\s+C|deest\s+in\s+C|desunt\s+in\s+C|desideratur\s+in|'
    r'omittit\s+C|in\s+C\.\s*Mon|sunt\s+neglecta|fors\.\s*legendum|'
    r'consentiunt\s+in|notatum\s+est|in\s+margine|in\s+ora|'
    r'male\s+\S|rectius|Infra\s+dic|supra\s+est\s+scriptum|'
    r'sed\s+(?:Bloch|Mou|Mon)|quam\s+lection|'
    r'vti\s+etiam|delendum\s+videatur|'
    r'ab\s+hoc\s+\S+\s+ad\s+seq|aberrans\s+omisit|'
    r'punctis\s*,\s*ita|vsque\s+ad|absunt\s+a\s+C)\b',
    re.IGNORECASE
)

# --- V2: Apparatus footnote markers in body text ---
# Degree-sign markers: °), *°), 1°), 4°) etc.
DEGREE_MARKER = re.compile(r'\s*\d*\s*\*?\s*°\s*\)\s*')
# Numbered markers: 1), 2), etc (not preceded by open paren)
INLINE_FOOTNOTE_MARKER = re.compile(r'(?<!\()\s*\d{1,2}\s*\)\s*')
# Star marker
STAR_MARKER = re.compile(r'\s*\*\s*\)\s*')
# Omicron-style: 1ο), 2ο)
OMICRON_MARKER = re.compile(r'\d[οo]\s*\)')

# --- V2: Apparatus variant notes in body text ---
# Pattern: "N: variant ; Sigla . variant , variant."
APPARATUS_VARIANT = re.compile(
    r'\d+\s*:\s*[\u0370-\u03FF\u1F00-\u1FFF\s]+;\s*[ΕE]\.\s*[ΜM][οo]n\s*\.?\s*[^\.\n]{0,60}\.'
)
# Pattern: "N a) word , NN. word word."
APPARATUS_FOOTNOTE_REF = re.compile(
    r'\d+\s*[a-z]\)\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s*,\s*\d{2,3}\.\s*[^\.\n]{0,60}\.'
)
# Page reference: "ν. NNN." or "v. NNN."
PAGE_REFERENCE = re.compile(r'[νv]\.\s*\d{2,4}\.\s*')
# Bibliographic abbreviation: "ΒΙ." or "Bl."
BIBLIO_ABBREV = re.compile(r'[ΒB][ΙIl]\.?\s+')
# Double-asterisk apparatus notes: "** text"
DOUBLE_ASTERISK = re.compile(r'\*\*\s+[^\n]{0,80}')

# --- V2: Number-in-word contamination ---
# Pattern: word- Nword (footnote number merged into broken word)
NUMBER_IN_WORD = re.compile(r'([\u0370-\u03FF\u1F00-\u1FFF]+[\-\u2010\u2011\u2012\u2013])\s*(\d+)([\u0370-\u03FF\u1F00-\u1FFF]+)')

# --- V2: Editorial brackets ---
EDITORIAL_BRACKETS = re.compile(r'\[[\u0370-\u03FF\u1F00-\u1FFF\s]+\]')

# --- V2: OCR noise in assembled text ---
# Latin/numeric artifacts embedded in Greek (like "waragte13")
LATIN_ARTIFACT_IN_GREEK = re.compile(r'(?<=[\u0370-\u03FF\u1F00-\u1FFF\s])[a-zA-Z]+\d+(?=[\s\u0370-\u03FF\u1F00-\u1FFF])')

# --- Non-Greek/non-Latin scripts ---
ARABIC_SCRIPT = re.compile(r'[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+')
HEBREW_SCRIPT = re.compile(r'[\u0590-\u05FF]+')
DEVANAGARI_SCRIPT = re.compile(r'[\u0900-\u097F]+')
GUJARATI_SCRIPT = re.compile(r'[\u0A80-\u0AFF]+')
CJK_SCRIPT = re.compile(r'[\u3000-\u9FFF\uF900-\uFAFF]+')
CYRILLIC_SCRIPT = re.compile(r'[\u0400-\u04FF]+')
MISC_NON_GREEK = re.compile(r'[にこ]')

# --- Page numbers ---
STANDALONE_PAGE_NUM = re.compile(r'^\s*\d{2,4}\s*$')

# --- Chapter marker ---
CHAPTER_MARKER = re.compile(r'^\s*[\?\)\•\-]*\s*\d*\s*ΚΕΦ\s*\.?\s*')

# --- OCR noise lines ---
OCR_NOISE_LINE = re.compile(
    r'^\s*[A-Za-z\d\:\;\.\,\!\?\-\*\)\(\[\]]{0,4}\s*$'
)
PURE_NOISE = re.compile(
    r'^[\s\d\.\,\;\:\!\?\-\*\)\(\[\]ABCDEFGHIJKLMNOPQRSTUVWXYZ\/\\]+$'
)

# --- V2: Broken word rejoining (the critical fix) ---
# In assembled text: Greek chars + hyphen + space(s) + optional number + Greek chars
BROKEN_WORD_IN_TEXT = re.compile(
    r'([\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F\u1DC0-\u1DFF]+)'  # Greek word-end
    r'[\-\u2010\u2011\u2012\u2013\u2014]'  # Any hyphen/dash
    r'\s+'  # One or more spaces
    r'(\d*)'  # Optional stray footnote number
    r'([\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F\u1DC0-\u1DFF]+)'  # Greek word-start
)

# --- Line-break hyphenation (for line-level processing) ---
LINE_BREAK_HYPHEN = re.compile(r'([\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F\S]+)[\-\u2010\u2011\u2012\u2013]\s*$')

# --- Greek text detection ---
GREEK_CHARS = re.compile(r'[\u0370-\u03FF\u1F00-\u1FFF]')

def has_greek(text: str) -> bool:
    return bool(GREEK_CHARS.search(text))

def greek_ratio(text: str) -> float:
    if not text.strip():
        return 0.0
    greek = len(GREEK_CHARS.findall(text))
    alpha = len(re.findall(r'[a-zA-Z\u0370-\u03FF\u1F00-\u1FFF]', text))
    if alpha == 0:
        return 0.0
    return greek / alpha
