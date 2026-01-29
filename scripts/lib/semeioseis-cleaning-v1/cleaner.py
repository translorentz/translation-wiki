#!/usr/bin/env python3
"""
Main cleaning pipeline for Semeioseis Gnomikai (chapters 82-120).
Reads raw OCR text, strips contamination, splits into chapters and paragraphs,
outputs clean JSON files.
"""

import json
import re
import sys
from pathlib import Path
from collections import Counter

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from scripts.lib import __init__  # noqa - just ensure package
# Direct imports
sys.path.insert(0, str(Path(__file__).resolve().parent))
from patterns import (
    PAGE_HEADER, INLINE_FOOTNOTE_MARKER, STAR_MARKER,
    ARABIC_SCRIPT, HEBREW_SCRIPT, DEVANAGARI_SCRIPT, GUJARATI_SCRIPT,
    CJK_SCRIPT, MISC_NON_GREEK, CHAPTER_MARKER, LINE_BREAK_HYPHEN,
    GREEK_CHARS, has_greek, greek_ratio, MANUSCRIPT_SIGLA, LATIN_APPARATUS
)
from filters import should_remove_line, is_footnote_line, is_page_header

BASE_DIR = Path("/Users/bryancheong/claude_projects/translation-wiki")
RAW_FILE = BASE_DIR / "data/raw/semeioseis_gnomikai/semeioseis_gnomikai_82_120.txt"
OUTPUT_DIR = BASE_DIR / "data/processed/semeioseis-gnomikai"

# Map of line numbers to chapter numbers (82-120), determined from grep of ΚΕΦ markers
# The OCR has corrupted Greek numerals, so we map by order of appearance
CHAPTER_LINE_MAP = [
    (1, 82),       # ΚΕΦ. πβ΄
    (220, 83),     # ΚΕΦ. ταγ (corrupted πγ΄)
    (392, 84),     # ΚΕΦ. πδ΄
    (594, 85),     # ΚΕΦ. πέ
    (736, 86),     # ΚΕΦ. πς΄
    (1040, 87),    # ΚΕΦ. πζ΄
    (1159, 88),    # ΚΕΦ. πή
    (1250, 89),    # ΚΕΦ. πθ΄
    (1348, 90),    # ΚΕΦ. νί (corrupted ϟ΄)
    (1454, 91),    # ΚΕΦ. υιά (corrupted ϟα΄)
    (1563, 92),    # ΚΕΦ. υιβ (corrupted ϟβ΄)
    (1703, 93),    # ΚΕΦ. υιγ΄
    (1859, 94),    # ΚΕΦ. υιδ
    (1955, 95),    # ΚΕΦ. υιέ
    (2108, 96),    # ΚΕΦ. υις
    (2563, 97),    # ΚΕΦ. ιζ΄ (corrupted ϟζ΄)
    (2796, 98),    # ΚΕΦ. υιή
    (3328, 99),    # ΚΕΦ. νιθ΄
    (3660, 100),   # ΚΕΦ. φ (corrupted ρ΄)
    (4138, 101),   # ΚΕΦ. ρά
    (4253, 102),   # ΚΕΦ. ρβ΄
    (4414, 103),   # ΚΕΦ. ργ
    (4596, 104),   # ΚΕΦ. ρδ
    (4794, 105),   # ΚΕΦ. ρέ
    (5189, 106),   # ΚΕΦ. ρς
    (5313, 107),   # ΚΕΦ. ρζ
    (5533, 108),   # ΚΕΦ. ρή
    (5759, 109),   # ΚΕΦ. ρθ΄
    (5947, 110),   # ΚΕΦ. ρές (corrupted ρι΄)
    (6340, 111),   # ΚΕΦ. ριά
    (6862, 112),   # ΚΕΦ. ριβ
    (7073, 113),   # ΚΕΦ. ρεγ΄ (corrupted ριγ΄)
    (7431, 114),   # ΚΕΦ. ριδ΄
    (7641, 115),   # ΚΕΦ. ριέ
    (8185, 116),   # ΚΕΦ. ρις
    (8306, 117),   # ΚΕΦ. ριζ΄
    # Note: 118 (ριη΄) is missing from markers - may be merged with 117 or absent
    (8779, 119),   # ΚΕΦ. ριθ΄
    (9003, 120),   # ΚΕΦ. ρκ
]

# Stats tracking
stats = Counter()


def read_raw_file():
    """Read the raw file and return lines."""
    with open(RAW_FILE, 'r', encoding='utf-8') as f:
        return f.readlines()


def clean_inline_markers(text: str) -> str:
    """Remove inline footnote markers from body text."""
    # Remove *) markers
    text = STAR_MARKER.sub('', text)
    # Remove numbered markers like "1)", "2)", "3)" etc.
    # But preserve things like "(13)" which are legitimate parenthetical refs
    text = re.sub(r'(?<!\()\s*\d{1,2}\s*\)\s*', ' ', text)
    # Remove omicron-style footnote markers: "1ο)", "2ο)", "1ο )"
    text = re.sub(r'\d[οo]\s*\)', '', text)
    # Remove standalone *
    text = re.sub(r'\s+\*\s+', ' ', text)
    # Remove leading · or - (OCR artifacts from margins)
    text = re.sub(r'^[\·\-\•]\s*', '', text)
    # Remove inline apparatus fragments: "Greek_word C. Mon. variant" patterns
    text = re.sub(
        r'[\u0370-\u03FF\u1F00-\u1FFF]+\s+C\.\s*(?:Mon|Aug|Ciz)\.?\s+[^\.\n]{0,60}(?:\.|$)',
        '', text
    )
    # Remove standalone sigla references: "C. Mon. ..." or "Cdd. ..."
    text = re.sub(r'\bC\.\s*(?:Mon|Aug|Ciz)\.?\s+\S+(?:\s+\S+){0,5}\.', '', text)
    text = re.sub(r'\bCdd\s*\.?\s*(?:Mon|Aug|nostri)\S*(?:\s+\S+){0,8}[\.\:\;]', '', text)
    text = re.sub(r'\bCdd\s*\.?\s+(?:Aug|Mon)\.?\s+et\s+(?:Mon|Aug)\.?\s*[^\.\n]{0,40}[\.\:\;]', '', text)
    text = re.sub(r'\bFabric\.?\s+\S+(?:\s+\S+){0,3}\.?', '', text)
    text = re.sub(r'\bBloch\.?\s+\S+(?:\s+\S+){0,3}\.?', '', text)
    text = re.sub(r'\bOrell\.?\s+\S+(?:\s+\S+){0,5}[\.\:]?', '', text)
    text = re.sub(r'\bBl\.?\s+\S+(?:\s+\S+){0,3}[\.\)]?', '', text)
    # Remove Latin phrases: "non habent", "sed ...", "vitiose"
    text = re.sub(r'\bnon\s+habent\b', '', text)
    text = re.sub(r'\bsed\s+[a-zA-Z\s\.\,]{3,30}', '', text)
    text = re.sub(r'\(\s*vitiose\s*\)', '', text)
    # Remove ") patterns (stray closing markers)
    text = re.sub(r'\s*"\s*\)', ' ', text)
    # Remove "Legendum videtur" and "fortasse legendum" phrases
    text = re.sub(r'\.?\s*[Ll]egendum\s+[a-zA-Z\s\.\,]{3,40}', '', text)
    text = re.sub(r'\.?\s*fortasse\s+\S+(?:\s+\S+){0,3}[\.\:\;]?', '', text)
    # Remove "Theodorus noster..." Latin editorial
    text = re.sub(r'\.?\s*Theodorus\s+[a-zA-Z\s\.\,]{3,60}', '', text)
    # Remove "ΒΙ." or "Bl." sigla references with following text
    text = re.sub(r'\s*[ΒB][Ιl]\.?\s+[^\.\n]{2,30}\.', '', text)
    # Remove stray "cum Strab." and similar references
    text = re.sub(r'\s*cum\s+[A-Z][a-z]+\.\s*[IVXLCDM]*\.?\s*', '', text)
    # Remove "Reg." siglum
    text = re.sub(r'\s*Reg\.\s+\S+\.?', '', text)
    # Remove "ΚΕΦ." from start if it leaked in (like "ΚΕΦ. ρές")
    text = re.sub(r'^ΚΕΦ\.\s*\S+\s*', '', text)
    # Broad apparatus pattern: "C. Mon." or "C. Aug." or "C. Paris." + up to 60 chars until period
    text = re.sub(r'\bC\.\s*(?:Mon|Aug|Ciz|Paris)\.?\s*[^\.]{0,60}\.', ' ', text)
    # "Cod. Aug." patterns
    text = re.sub(r'\bCod\s*\.?\s*(?:Aug|Mon|Paris)\.?\s*[^\.]{0,40}[\.\:]', ' ', text)
    # "Mon. et Aug." patterns
    text = re.sub(r'\bMon\.?\s+et\s+Aug\.?\s*[^\.]{0,40}[\.\:]', ' ', text)
    # "Pariss." or "Paris." + context
    text = re.sub(r'\bPariss?\.?\s+(?:Reg\.?\s+)?[^\.]{0,40}[\.\:]', ' ', text)
    # "Germ." siglum
    text = re.sub(r'\bGerm\.?\s*[^\.]{0,30}[\.\:]', ' ', text)
    # "Sic etiam" + context
    text = re.sub(r'\bSic\s+(?:etiam|dic)\S*\.?\s*[^\.]{0,40}[\.\:]', ' ', text)
    # "et Mon." patterns
    text = re.sub(r'\bet\s+(?:Mon|Aug|Paris)\.?\s*[^\.]{0,30}[\.\:]', ' ', text)
    # "nonne" + word + "?"
    text = re.sub(r'\bnonne\s+\S+\s*\?', '', text)
    # "cf." references
    text = re.sub(r'\bcf\.?\s+\S+\.?\s*[^\.]{0,30}[\.\:]', ' ', text)
    # "Plut." references
    text = re.sub(r'\bPlut\.?\s*[^\.]{0,40}[\.\:]', ' ', text)
    # "Corn. Nep." references
    text = re.sub(r'\bCorn\.?\s+Nep\.?\s*[^\.]{0,20}[\.\:]', ' ', text)
    # "Herod." references
    text = re.sub(r'\bHerod\.?\s*\d[\d\s\,\.]*\)', ' ', text)
    # "legerim" / "leguntur" / "legit" phrases
    text = re.sub(r'\b(?:legerim|leguntur|legit|lect)\S*\.?\s*[^\.]{0,30}[\.\:]', ' ', text)
    # Latin editorial: "vt opinor", "dicuntur", "inscripsit", "inserunt", etc.
    text = re.sub(r'\b(?:vt\s+opinor|dicuntur|inscripsit|inserunt|omisit|Omisit|praemittunt|supplet|absunt|commemorautur|repugnat|confunduntur|venire|postea)\s*[\:\.]?\s*', ' ', text)
    # "Item:" references
    text = re.sub(r'\bItem\s*:', ' ', text)
    # Short Latin phrases: "post iterum", "sunt inserenda", etc.
    text = re.sub(r'\b(?:post\s+iterum|sunt\s+inserenda|ab\s+una\s+eademq\S*|hoc\s+supplet|nec\s+refert\s+ad|dat\s+\S+)', ' ', text)
    # "Verba" + Greek
    text = re.sub(r'\bVerba\b', '', text)
    # Clean up multiple spaces
    text = re.sub(r'\s{2,}', ' ', text)
    return text


def clean_foreign_scripts(text: str) -> str:
    """Remove Arabic, Hebrew, CJK, and other non-Greek/Latin script artifacts."""
    text = ARABIC_SCRIPT.sub('', text)
    text = HEBREW_SCRIPT.sub('', text)
    text = DEVANAGARI_SCRIPT.sub('', text)
    text = GUJARATI_SCRIPT.sub('', text)
    text = CJK_SCRIPT.sub('', text)
    text = MISC_NON_GREEK.sub('', text)
    return text


def clean_page_number_prefix(text: str) -> str:
    """Remove page numbers at the start of lines (e.g., '540 Ὅτι...')."""
    # Page number followed by Greek text
    text = re.sub(r'^\d{2,4}\s+(?=[\u0370-\u03FF\u1F00-\u1FFF])', '', text)
    return text


def rejoin_broken_words(lines: list) -> list:
    """Rejoin words broken across lines with hyphens."""
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Check if line ends with a hyphen indicating word break
        match = LINE_BREAK_HYPHEN.search(line)
        if match and i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            if next_line and has_greek(next_line):
                # Get the word fragment before hyphen
                prefix = line[:match.start()] + match.group(1)
                # Get the continuation from next line
                # Find where the word continues (up to first space)
                word_match = re.match(r'(\S+)(.*)', next_line)
                if word_match:
                    joined = prefix + word_match.group(1)
                    remainder = word_match.group(2).strip()
                    result.append(joined + (' ' + remainder if remainder else ''))
                    stats['words_rejoined'] += 1
                    i += 2
                    continue
        result.append(line)
        i += 1
    return result


def extract_chapter_title(lines: list, start_idx: int) -> str:
    """Extract chapter title from lines following ΚΕΦ marker."""
    # Title is typically on the line(s) immediately after the ΚΕΦ line
    title_lines = []
    idx = start_idx + 1  # Skip the ΚΕΦ line itself

    while idx < len(lines) and idx < start_idx + 5:
        line = lines[idx].strip()
        # Skip removed lines, empty, noise
        if not line or not has_greek(line):
            idx += 1
            continue
        # Title lines typically start with Ὅτι, Ὅπως, Θεωρία, Περί, etc.
        # and are distinct from body text
        # Stop if we hit what looks like body text (full sentence)
        if len(line) > 20 and line[0] not in 'ΌὍὉΘΠΕΔΤΚΜΝΑΒΓΖΗΙΛΞΡΣΥΦΧΨΩἈἘἸἼ':
            break
        title_lines.append(line)
        # If the line ends with a period, title is complete
        if line.rstrip().endswith('.') or line.rstrip().endswith(':'):
            break
        idx += 1

    title = ' '.join(title_lines)
    # Clean up the title
    title = clean_inline_markers(title)
    title = clean_foreign_scripts(title)
    title = re.sub(r'\s+', ' ', title).strip()
    return title


def is_title_line(line: str, chapter_start_line: int, current_line: int) -> bool:
    """Check if a line is part of the chapter title (immediately after ΚΕΦ marker)."""
    # Title lines are within ~3 lines of the chapter marker
    if current_line - chapter_start_line > 4:
        return False
    stripped = line.strip()
    if not stripped or not has_greek(stripped):
        return False
    # Title lines often start with Ὅτι, Θεωρία, Ὅπως, Περί
    if re.match(r'^[ΌὍὉΘΠΕΔΤΚΜΝΑΒΓΖΗΙΛΞΡΣΥΦΧΨΩἈἘἸἼ\-]', stripped):
        return True
    return False


def process_chapter(lines: list, chapter_num: int, start_line: int, end_line: int) -> dict:
    """Process a single chapter's lines into clean paragraphs."""
    # First pass: filter out contamination lines
    clean_lines = []
    in_footnote_block = False
    title_extracted = False
    title = ""

    for i in range(start_line, min(end_line, len(lines))):
        line = lines[i]
        raw_line = line.rstrip('\n')

        # Skip the ΚΕΦ marker line itself
        if i == start_line - 1:  # 0-indexed
            continue
        if 'ΚΕΦ' in raw_line and i <= start_line + 1:
            continue

        # Check if we're in the INDEX section
        if 'INDEX' in raw_line and 'VOCABULORUM' in lines[min(i+1, len(lines)-1)] if i+1 < len(lines) else False:
            break

        # Check if line should be removed
        should_remove, reason = should_remove_line(raw_line)
        if should_remove:
            stats[f'removed_{reason}'] += 1
            # If we hit a footnote, mark that we might be in a footnote block
            if reason in ('FOOTNOTE', 'APPARATUS', 'LATIN_EDITORIAL'):
                in_footnote_block = True
            continue

        # Reset footnote block tracking if we see substantial Greek text
        if has_greek(raw_line) and greek_ratio(raw_line) > 0.7 and len(raw_line.strip()) > 30:
            in_footnote_block = False

        # Skip lines that are continuation of footnote blocks
        if in_footnote_block and not has_greek(raw_line):
            stats['removed_FOOTNOTE_CONTINUATION'] += 1
            continue
        if in_footnote_block and has_greek(raw_line) and greek_ratio(raw_line) < 0.4:
            stats['removed_FOOTNOTE_CONTINUATION'] += 1
            continue

        # This is a content line - clean it
        cleaned = raw_line.strip()
        cleaned = clean_inline_markers(cleaned)
        cleaned = clean_foreign_scripts(cleaned)
        cleaned = clean_page_number_prefix(cleaned)
        # Remove any remaining THEODORUS METOCHITA fragments
        cleaned = re.sub(r'THEODORUS\s+METOCHITA\.?\s*\d*', '', cleaned, flags=re.IGNORECASE)
        # Remove stray page numbers at end of lines
        cleaned = re.sub(r'\s+\d{3}\s*$', '', cleaned)
        # Clean up whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()

        if cleaned and (has_greek(cleaned) or len(cleaned) > 5):
            clean_lines.append(cleaned)

    # Extract title from first few clean lines
    title_lines = []
    body_start = 0
    for j, line in enumerate(clean_lines):
        # Title lines typically contain the chapter description
        if j < 3 and (
            re.match(r'^Ὅτι\b', line) or
            re.match(r'^Ὅπως\b', line) or
            re.match(r'^Θεωρία\b', line) or
            re.match(r'^Περὶ\b', line) or
            re.match(r'^Ἐξέτασις\b', line) or
            (j == 0 and len(line) < 200)  # First line is often the title
        ):
            title_lines.append(line)
            body_start = j + 1
            # If the line ends with a period, title is complete
            if line.rstrip().endswith('.') or line.rstrip().endswith(':'):
                break
        elif j == 0:
            # First line might be title even without special start
            title_lines.append(line)
            body_start = 1
            if line.rstrip().endswith('.'):
                break
        else:
            break

    title = ' '.join(title_lines).strip()
    # Remove trailing periods/colons from title
    title = title.rstrip('.').rstrip(':').strip()

    # Rejoin broken words in body
    body_lines = clean_lines[body_start:]
    body_lines = rejoin_broken_words(body_lines)

    # Build paragraphs: join consecutive lines, split on sentence boundaries
    paragraphs = build_paragraphs(body_lines)

    # Final post-processing pass on assembled paragraphs
    paragraphs = [post_clean_paragraph(p) for p in paragraphs]
    paragraphs = [p for p in paragraphs if p.strip()]

    stats['chapters_processed'] += 1
    stats['total_paragraphs'] += len(paragraphs)

    return {
        'chapterNumber': chapter_num,
        'title': title,
        'sourceContent': {
            'paragraphs': paragraphs
        }
    }


def post_clean_paragraph(text: str) -> str:
    """Final cleaning pass on assembled paragraphs to catch remaining apparatus."""
    # Remove any remaining Latin apparatus fragments
    # Pattern: Latin word(s) followed by Greek or ending with period
    # "Philopoemeni dixisse tradit :"
    text = re.sub(r'\b[A-Z][a-z]{3,}\s+[a-z]{3,}(?:\s+[a-z]{3,})*\s*[\:\.]', ' ', text)
    # "manu" standalone
    text = re.sub(r'\bmanu\b', '', text)
    # "mentum" standalone (Latin, not Greek)
    text = re.sub(r'\bmentum\b', '', text)
    # "Theod." reference
    text = re.sub(r'\bTheod\.?\s+[^\.\n]{0,30}[\.\,]', ' ', text)
    # "Sic etiam" or "Sic dic."
    text = re.sub(r'\bSic\s+\S+\s*', ' ', text)
    # "Deinde Mon." and similar
    text = re.sub(r'\bDeinde\s+(?:Mon|Aug)\.?\s*[^\.]{0,30}[\.\:]', ' ', text)
    # "C.107. dic." type reference
    text = re.sub(r'C\.\s*\d+\.?\s*dic\.?\s*[^\.]{0,20}[\.\:]?', ' ', text)
    # "Paris. verum"
    text = re.sub(r'Paris\.?\s+verum\b', ' ', text)
    # Latin words surrounded by Greek context: "dria sita erat"
    text = re.sub(r'\b[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}\b[\s\,\.]*', ' ', text)
    # "iterum :"
    text = re.sub(r'\biterum\s*[\:\.]', ' ', text)
    # "rum in Cod. suo vel legille"
    text = re.sub(r'\brum\s+in\s+Cod\.\s+[^\.]{0,40}[\.\,]', ' ', text)
    # "quid," standalone
    text = re.sub(r'\bquid\s*[\,\.]', ' ', text)
    # "esse" at start of fragment
    text = re.sub(r'\besse\b', ' ', text)
    # "tueded док моми" - Cyrillic OCR noise
    text = re.sub(r'[\u0400-\u04FF]+', '', text)
    text = re.sub(r'\btueded\b', '', text)
    # "exh..." truncated Latin
    text = re.sub(r'\bexh\S*\b', '', text)
    # "manis."
    text = re.sub(r'\bmanis\.', '', text)
    # "aq asad ...dans" OCR garbage
    text = re.sub(r'\baq\s+asad\b', '', text)
    text = re.sub(r'\.\.\.dans\b', '', text)
    # "verum" standalone between Greek
    text = re.sub(r'\bverum\b', '', text)
    # "litteris supra positis :"
    text = re.sub(r'\blitteris\s+supra\s+positis\s*[\:\.]?', '', text)
    # "positis :" standalone remnant
    text = re.sub(r'\bpositis\s*[\:\.]', '', text)
    # "sed ad" apparatus remnant
    text = re.sub(r'\bsed\s+ad\b', '', text)
    # "vt Ciz," or "vt Cap."
    text = re.sub(r'\bvt\s+\S+[\,\.]', '', text)
    # "pro word et word" patterns (apparatus comparisons)
    text = re.sub(r'\bpro\s+\S+\s+et\s+\S+\s*', ' ', text)
    # "et c. NNN." cross-references
    text = re.sub(r'\bet\s+c\.\s*\d+\.', ' ', text)
    # "et 1" stray
    text = re.sub(r'\bet\s+\d+\b', ' ', text)
    # "et in NN."
    text = re.sub(r'\bet\s+in\s+\d+\.', ' ', text)
    # ", Αυξ," (Greek-fied siglum for Aug)
    text = re.sub(r',?\s*Αυξ\s*,', ',', text)
    # Stray "pro" before Greek
    text = re.sub(r'\bpro\s+(?=[\u0370-\u03FF\u1F00-\u1FFF])', '', text)
    # "(Mon. word non dat)" parenthetical apparatus
    text = re.sub(r'\(\s*(?:Mon|Aug|Ciz)\.?\s+[^\)]{0,30}\)', '', text)
    # "aC. Aug." or "a C. Aug."
    text = re.sub(r'\baC\.?\s*Aug\.?', '', text)
    # Standalone "Aug." "Mon." "Cd." sigla
    text = re.sub(r'\b(?:Aug|Mon|Ciz|Cd)\.', '', text)
    # "ita" "que" "hoc" "vel" "per" "se" "gb" - short Latin words between Greek
    text = re.sub(r'(?<=[\u0370-\u03FF\u1F00-\u1FFF\s\,\.])\b(?:ita|que|hoc|vel|per|se|gb|leg|yt|dic|of|vlt)\b(?=[\s\,\.;\u0370-\u03FF\u1F00-\u1FFF])', '', text)
    # "Hom. II. IX." references
    text = re.sub(r'\bHom\.?\s*[IVXLCDM\.\s]+', '', text)
    # Standalone Roman numerals not in Greek context
    text = re.sub(r'\b[IVXLCDM]{2,4}\.?\s*(?=[\s\,\.\;\u0370-\u03FF\u1F00-\u1FFF])', '', text)
    # Parenthetical apparatus: (Aug, word) or (Aug, sed Mon. word)
    text = re.sub(r'\(\s*(?:Aug|Mon|Ciz)[\,\s][^\)]{0,40}\)', '', text)
    # "σαφ. , €. Mon," type remnants
    text = re.sub(r'σαφ\.\s*,\s*€\.\s*Mon\s*,\s*\S+', '', text)
    # Stray "€." OCR artifact
    text = re.sub(r'€\.', '', text)
    # General: remove any sequence of 3+ Latin words
    text = re.sub(r'(?:\b[a-zA-Z]{3,}\b[\s\,]*){3,}[\.\:\;]?', ' ', text)
    # Clean stray "ap." references
    text = re.sub(r'\bap\.\s*\S+\.?\s*', ' ', text)
    # Clean up
    text = re.sub(r'\s*\.\s*\.', '.', text)
    text = re.sub(r'\s{2,}', ' ', text)
    text = text.strip()
    return text


def build_paragraphs(lines: list) -> list:
    """
    Build paragraphs from cleaned lines.
    Strategy: accumulate lines into a paragraph until we see a clear
    paragraph break (empty line, or a sentence-ending punctuation followed
    by a line that starts with a capital Greek letter).
    """
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

        # Check if this line starts a new paragraph
        # (previous line ended with period/colon and this starts with capital)
        if current:
            prev = current[-1]
            prev_ends_sentence = prev.rstrip().endswith(('.', '·', ';'))
            starts_with_capital = bool(re.match(r'^[Α-ΩἈ-ὯὉ]', stripped))
            # New paragraph if previous ends sentence AND current is substantial
            if prev_ends_sentence and starts_with_capital and len(stripped) > 20:
                # But only split if paragraph is already somewhat long
                total_len = sum(len(s) for s in current)
                if total_len > 200:
                    paragraphs.append(' '.join(current))
                    current = [stripped]
                    continue

        current.append(stripped)

    if current:
        paragraphs.append(' '.join(current))

    # Post-process: merge very short paragraphs
    merged = []
    for para in paragraphs:
        if merged and len(para) < 50 and not para[0].isupper():
            merged[-1] = merged[-1] + ' ' + para
        else:
            merged.append(para)

    return merged


def find_chapter_118(lines: list) -> int:
    """
    Chapter 118 (ριη΄) doesn't have a clear ΚΕΦ marker.
    Search for it between chapters 117 and 119.
    Returns -1 if not found (chapter 118 may be merged into 117).
    """
    # Look between line 8306 (ch 117) and 8779 (ch 119)
    for i in range(8400, 8770):  # Stop before 8779 to avoid matching ch 119
        if i >= len(lines):
            break
        line = lines[i].strip()
        # Look for a ΚΕΦ marker with ριη
        if 'ΚΕΦ' in line and 'ριη' in line:
            return i
    return -1


def main():
    print("=" * 60)
    print("Semeioseis Gnomikai Cleaning Pipeline v1")
    print("=" * 60)

    # Read raw file
    lines = read_raw_file()
    print(f"Read {len(lines)} lines from {RAW_FILE}")

    # Check for chapter 118
    ch118_line = find_chapter_118(lines)
    chapter_map = list(CHAPTER_LINE_MAP)
    if ch118_line > 0:
        # Insert chapter 118
        for idx, (line_num, ch_num) in enumerate(chapter_map):
            if ch_num == 119:
                chapter_map.insert(idx, (ch118_line, 118))
                print(f"Found chapter 118 at line {ch118_line}")
                break
    else:
        print("WARNING: Chapter 118 not found - may be merged with 117")

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Process each chapter
    for i, (start_line_1indexed, chapter_num) in enumerate(chapter_map):
        start_line = start_line_1indexed - 1  # Convert to 0-indexed

        # Determine end line
        if i + 1 < len(chapter_map):
            end_line = chapter_map[i + 1][0] - 1  # 0-indexed
        else:
            # Last chapter - go until INDEX or end of file
            end_line = len(lines)
            for j in range(start_line, len(lines)):
                if 'INDEX' in lines[j]:
                    end_line = j
                    break

        chapter_data = process_chapter(lines, chapter_num, start_line, end_line)

        # Write output
        output_file = OUTPUT_DIR / f"chapter-{chapter_num:03d}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(chapter_data, f, ensure_ascii=False, indent=2)

        para_count = len(chapter_data['sourceContent']['paragraphs'])
        title_preview = chapter_data['title'][:60]
        print(f"  Chapter {chapter_num:3d}: {para_count:2d} paragraphs | {title_preview}")

    # Print stats
    print("\n" + "=" * 60)
    print("STATISTICS")
    print("=" * 60)
    for key, value in sorted(stats.items()):
        print(f"  {key}: {value}")
    print(f"\nOutput written to: {OUTPUT_DIR}")


if __name__ == '__main__':
    main()
