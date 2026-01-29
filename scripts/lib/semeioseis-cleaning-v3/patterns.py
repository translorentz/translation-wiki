"""
Regex patterns for cleaning Semeioseis Gnomikai OCR text - V3.

V3 FIXES:
1. CRITICAL: Unhyphenated broken words (line breaks without hyphens splitting Greek words)
2. Latin apparatus notes embedded in body text (aggressive stripping)
3. Asterisk markers in chapter titles
4. Empty chapter 118 removal
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
DEGREE_MARKER = re.compile(r'\s*\d*\s*\*?\s*°\s*\)\s*')
INLINE_FOOTNOTE_MARKER = re.compile(r'(?<!\()\s*\d{1,2}\s*\)\s*')
STAR_MARKER = re.compile(r'\s*\*\s*\)\s*')
OMICRON_MARKER = re.compile(r'\d[οo]\s*\)')

# --- V2: Apparatus variant notes in body text ---
APPARATUS_VARIANT = re.compile(
    r'\d+\s*:\s*[\u0370-\u03FF\u1F00-\u1FFF\s]+;\s*[ΕE]\.\s*[ΜM][οo]n\s*\.?\s*[^\.\n]{0,60}\.'
)
APPARATUS_FOOTNOTE_REF = re.compile(
    r'\d+\s*[a-z]\)\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s*,\s*\d{2,3}\.\s*[^\.\n]{0,60}\.'
)
PAGE_REFERENCE = re.compile(r'[νv]\.\s*\d{2,4}\.\s*')
BIBLIO_ABBREV = re.compile(r'[ΒB][ΙIl]\.?\s+')
DOUBLE_ASTERISK = re.compile(r'\*\*\s+[^\n]{0,80}')

# --- V2: Number-in-word contamination ---
NUMBER_IN_WORD = re.compile(r'([\u0370-\u03FF\u1F00-\u1FFF]+[\-\u2010\u2011\u2012\u2013])\s*(\d+)([\u0370-\u03FF\u1F00-\u1FFF]+)')

# --- V2: Editorial brackets ---
EDITORIAL_BRACKETS = re.compile(r'\[[\u0370-\u03FF\u1F00-\u1FFF\s]+\]')

# --- V2: OCR noise in assembled text ---
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

# --- V2: Broken word rejoining (hyphenated) ---
BROKEN_WORD_IN_TEXT = re.compile(
    r'([\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F\u1DC0-\u1DFF]+)'
    r'[\-\u2010\u2011\u2012\u2013\u2014]'
    r'\s+'
    r'(\d*)'
    r'([\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F\u1DC0-\u1DFF]+)'
)

# --- Line-break hyphenation (for line-level processing) ---
LINE_BREAK_HYPHEN = re.compile(r'([\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F\S]+)[\-\u2010\u2011\u2012\u2013]\s*$')

# --- V3: Unhyphenated line-break detection ---
# Greek character class including combining diacriticals and breathing marks
GRK = r'[\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F\u1DC0-\u1DFF]'
# A line ending with a short Greek fragment (1-5 chars) that is likely a word prefix
LINE_END_FRAGMENT = re.compile(
    r'(' + GRK + r'{1,5})\s*$'
)
# A line starting with Greek chars that would be a word continuation
LINE_START_CONTINUATION = re.compile(
    r'^(' + GRK + r'+)'
)

# --- V3: Latin editorial vocabulary (aggressive detection) ---
# Single Latin words commonly found in apparatus
LATIN_EDITORIAL_WORDS = re.compile(
    r'\b(?:Verba|inscripsit|Omisit|dicuntur|Item|postea|pro|dat|iterum|venire|vrbs|saepe|'
    r'confunduntur|leguntur|haec|vt|rum|Deinde|legendum|fortasse|vitiose|nonne|'
    r'Sic|cum|etiam|quid|esse|verum|quod|nec|sed|ita|hoc|vel|per|mentum|manu|'
    r'addunt|addit|exhibent|habent|non|abest|deest|desunt|omittit|'
    r'fors|male|rectius|punctis|absunt|vsque|aberrans|praeeunte|consentiunt|'
    r'notatum|est|scriptum|delendum|videatur)\b',
    re.IGNORECASE
)

# Sigla patterns
SIGLA_PATTERN = re.compile(
    r'\b(?:C\.|Mon\.|Aug\.|Ciz\.|Reg\.|Paris\.|Cod\.|Cdd\.?|Μon\.|Μου[,.]?)\s*'
)

# --- V3: Valid short Greek words (not broken-word fragments) ---
VALID_SHORT_GREEK = {
    # Articles (all cases, both acute and grave)
    'ἡ', 'ὁ', 'τὸ', 'τὰ', 'τῆς', 'τοῦ', 'τῶν', 'τῷ', 'τῇ',
    'τήν', 'τόν', 'τὴν', 'τὸν',
    'τοῖς', 'ταῖς', 'τοὺς', 'τάς', 'τὰς',
    # Relative pronouns (all accents)
    'ὅ', 'ἅ', 'ἃ', 'ᾧ', 'ᾗ', 'ὅς', 'ἥ', 'οὗ', 'ἧς', 'ὧν', 'οἷς', 'αἷς',
    'ὅν', 'ἥν', 'ὃν', 'ἣν', 'οἵ', 'αἵ', 'οὓς', 'ἅς', 'ἃς',
    'Οἱ', 'Αἱ',
    # Demonstratives
    'ὅδε', 'ἥδε', 'τόδε',
    # Conjunctions, particles, adverbs
    'ὡς', 'εἰ', 'δὲ', 'δὴ', 'δέ', 'δή', 'γε', 'τε', 'μέ', 'σέ',
    'γὰρ', 'μὲν', 'μὴ', 'μέν', 'μήν', 'ἂν', 'ἄν', 'οὐ', 'οὐκ', 'αὖ',
    'καὶ', 'Καὶ', 'ἤ', 'ἢ', 'ὅτι', 'ἐάν', 'ἵνα',
    'ἤδη', 'ἔτι', 'ὅτε', 'νῦν', 'ἔνι', 'ἄρα', 'ἆρα', 'ἅμα',
    'πρίν', 'ποτε', 'ὅλως', 'ἴσως', 'ὅπως', 'μόνον',
    'πάνυ', 'πάντ', 'πάντα',
    'πᾶσα', 'πᾶσαν', 'πάσης', 'πάσας', 'πάσῃ', 'πᾶσι',
    'ὅσα', 'ὅσοι', 'οὐδ', 'οὔτ',
    'οὐδέ', 'οὔτε', 'μήτε', 'μηδέ', 'μηδὲ',
    'ἀεί', 'ἀεὶ', 'αὖθις',
    'ἠδέ', 'ἠδὲ', 'μήν', 'μὴν',
    # Prepositions (acute and grave)
    'ἐν', 'ἐκ', 'ἐξ', 'ἐπ', 'ἐπὶ', 'ἐπί', 'εἰς',
    'πρό', 'πρὸ', 'πρὸς', 'πρός',
    'ἀπό', 'ἀπὸ', 'ὑπό', 'ὑπὸ', 'κατά', 'κατὰ',
    'μετά', 'μετὰ', 'παρά', 'παρὰ', 'περί', 'περὶ',
    'σύν', 'ξύν', 'ξὺν', 'σὺν', 'ἀνά', 'ἀνὰ',
    'ὑπέρ', 'ὑπὲρ', 'ἀντί', 'ἀντὶ', 'διά', 'διὰ',
    # Elided forms
    'γ᾽', 'δ᾽', 'τ᾽', 'μ᾽', 'θ᾽', 'ξ᾽',
    'ἀλλ', 'ἀλλ᾽', 'ἀλλὰ', 'οὔτ', 'οὔτ᾽', 'ἐφ', 'ἐφ᾽',
    'μετ', 'μετ᾽', 'κατ', 'κατ᾽', 'παρ', 'παρ᾽',
    'ὑπ', 'ὑπ᾽', 'ἀπ', 'ἀπ᾽', 'ἐπ᾽', 'δι', 'δι᾽',
    'περ', 'ἄρ᾽', 'ποτ᾽', 'ἀφ᾽',
    'ταῦθ᾽', 'τοῦθ᾽', 'ἔσθ᾽', 'ὥστ᾽', 'οὐδ᾽', 'μηδ᾽',
    'ἔτ᾽', 'ἤδ᾽', 'ἔθ᾽', 'οὐχ', 'ὅθ᾽',
    # Pronouns
    'ἐγώ', 'σύ', 'μοι', 'σοι', 'οἱ', 'αἱ', 'οἵ',
    'αὐτ', 'αὐτό', 'αὐτὸ', 'τοῦτ',
    # Short forms
    'ἕν', 'πᾶν', 'πᾶς', 'τις', 'τι', 'τίς', 'τί',
    'ἦν', 'ἔστ', 'εἶχ', 'ὤν', 'ὄν',
    'τοῖ', 'ἐστ', 'ἔστ', 'ποῦ', 'Ποῦ',
    'πολύ', 'πολὺ', 'ἄλλα', 'ἄλλο', 'ὅλα',
    'Τὸν', 'Τὴν', 'Τὸ', 'Τοῦ', 'Τῶν',
    'Καὶ', 'Οὐ', 'Οὐκ', 'Ἐν',
    # Dative/accusative misc forms
    'τῇ', 'Τῇ',
    # Crasis and contracted forms
    'κἂν', 'κἀν', 'ἢν', 'εἴη',
    # Relative/demonstrative misc
    'ὅτῳ', 'ἠδ', 'ἠδ᾽', 'ᾧτε', 'Ὃν', 'Ὃ',
    # Additional short valid words
    'Ον', 'ὃς', 'ᾗπερ', 'ὅπερ', 'ὥσπερ',
    'τὲ', 'τε',  # te enclitic
    # Short adverbs/particles/enclitics
    'ὅτῳ', 'ἕως', 'πρόσ', 'τοί',
    'που', 'πως', 'ποι', 'πού', 'πώς',
    'Που', 'Πως', 'Ποῦ', 'Πῶς',
}

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

def is_greek_char(c: str) -> bool:
    """Check if a single character is Greek (including combining marks)."""
    cp = ord(c)
    return (0x0370 <= cp <= 0x03FF or
            0x1F00 <= cp <= 0x1FFF or
            0x0300 <= cp <= 0x036F or
            0x1DC0 <= cp <= 0x1DFF)

def greek_char_count(text: str) -> int:
    return sum(1 for c in text if is_greek_char(c))
