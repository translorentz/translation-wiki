"""
Regex patterns for cleaning Semeioseis Gnomikai OCR text.
Contamination types:
  1. Critical apparatus footnotes (variant readings with manuscript sigla)
  2. Latin commentary
  3. Page headers ("THEODORUS METOCHITA. NNN")
  4. Footnote markers in body text (superscript numbers like 1), 2), *))
  5. Arabic/Hebrew/other script fragments (OCR artifacts)
  6. INDEX section at end of file
  7. Line-break word splits
  8. Stray punctuation/OCR noise
"""

import re

# --- Page headers ---
PAGE_HEADER = re.compile(
    r'^\s*\d*\s*THEODORUS\s+METOCHITA\.?\s*\d*\s*$',
    re.IGNORECASE
)

# --- Footnote blocks (multi-line apparatus at bottom of pages) ---
# These start with a number or *) and contain manuscript sigla
FOOTNOTE_START = re.compile(
    r'^\s*[\*\-]?\s*\d{1,2}\s*\)\s+\S',  # e.g., "1) περὶ τὸ, sic Cdd."
)
FOOTNOTE_START_STAR = re.compile(
    r'^\s*\*\s*\d{1,2}\s*\)\s+',  # e.g., "* 26) Φλαμίνιος"
)
FOOTNOTE_CONTINUATION = re.compile(
    r'^\s*(?:sed|quod|nec|Lege|Infra|In\s+Indice|Erasm|praeeunte|addit|addunt|Livius|Plut|Vol|cf\.|ed\.|p\.\s*\d)',
    re.IGNORECASE
)

# Manuscript sigla that appear in apparatus
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

# --- Footnote markers in body text ---
# Numbers like 1), 2), *) embedded in Greek text
INLINE_FOOTNOTE_MARKER = re.compile(
    r'\s*[\*]?\s*\d{1,2}\s*\)\s*'
)
# Standalone *) marker
STAR_MARKER = re.compile(r'\s*\*\s*\)\s*')

# --- Arabic/non-Greek script artifacts ---
ARABIC_SCRIPT = re.compile(r'[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+')
HEBREW_SCRIPT = re.compile(r'[\u0590-\u05FF]+')
DEVANAGARI_SCRIPT = re.compile(r'[\u0900-\u097F]+')
GUJARATI_SCRIPT = re.compile(r'[\u0A80-\u0AFF]+')
CJK_SCRIPT = re.compile(r'[\u3000-\u9FFF\uF900-\uFAFF]+')
MISC_NON_GREEK = re.compile(r'[にこ]')  # Specific Japanese chars seen in OCR

# --- Page numbers (standalone lines) ---
STANDALONE_PAGE_NUM = re.compile(r'^\s*\d{2,4}\s*$')

# --- Chapter marker ---
CHAPTER_MARKER = re.compile(r'^\s*[\?\)\•\-]*\s*\d*\s*ΚΕΦ\s*\.?\s*')

# --- OCR noise: isolated single characters or short garbage ---
OCR_NOISE_LINE = re.compile(
    r'^\s*[A-Za-z\d\:\;\.\,\!\?\-\*\)\(\[\]]{0,4}\s*$'
)

# Lines that are purely non-Greek punctuation/symbols (OCR artifacts)
PURE_NOISE = re.compile(
    r'^[\s\d\.\,\;\:\!\?\-\*\)\(\[\]ABCDEFGHIJKLMNOPQRSTUVWXYZ\/\\]+$'
)

# --- Line-break hyphenation ---
# Word broken across lines: Greek word ending with hyphen
LINE_BREAK_HYPHEN = re.compile(r'(\S+)[‐\-]\s*$')

# --- Greek text detection ---
GREEK_CHARS = re.compile(r'[\u0370-\u03FF\u1F00-\u1FFF]')

def has_greek(text: str) -> bool:
    """Check if text contains Greek characters."""
    return bool(GREEK_CHARS.search(text))

def greek_ratio(text: str) -> float:
    """Calculate ratio of Greek characters to all alphabetic characters."""
    if not text.strip():
        return 0.0
    greek = len(GREEK_CHARS.findall(text))
    alpha = len(re.findall(r'[a-zA-Z\u0370-\u03FF\u1F00-\u1FFF]', text))
    if alpha == 0:
        return 0.0
    return greek / alpha
