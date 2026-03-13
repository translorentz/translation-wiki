#!/usr/bin/env python3
"""
Reprocess Psaltirea în versuri from Wikisource.
All psalms are on one page: https://ro.wikisource.org/wiki/Psaltirea_%C3%AEn_versuri

The page has MULTIPLE types of psalm separators:
1. <h2> headings: Psalms 1-5, 46-47, 94, 96, 101, 103, 132, 136
2. ==PSALMUL N== wikitext (literal in HTML): Psalms 6-11
3. Plain text "PSALMUL N" at start of paragraph: Psalms 12-45, 48+

Each psalm section can have:
- Content as one long string (no internal <br>): Psalms 6-11
- Content split across multiple <p> blocks by <ul><li> meter annotations
- Individual verse lines separated by <br>

This script:
1. Fetches the full page (or uses cached /tmp/psaltirea_page.html)
2. Normalizes ALL separator types into ###PSALM_N### markers
3. Removes <ul> annotation blocks
4. Extracts the FULL content of each psalm between markers
5. Splits into verse lines using <br> separators (or keeps as strophes)
6. Cleans footnotes, meter annotations, navigation text
7. Outputs one chapter-NNN.json per psalm with {index, text} paragraph format
"""

import json
import os
import re
import urllib.request

OUTPUT_DIR = "data/processed/psaltirea-in-versuri"
URL = "https://ro.wikisource.org/wiki/Psaltirea_%C3%AEn_versuri"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
CACHE_FILE = "/tmp/psaltirea_page.html"

# Footnote/pronunciation note patterns
FOOTNOTE_LINE_PATTERNS = [
    r'^\d+\s+Pronunțat\s+',
    r'^\d+\s+Pronun[tț]at',
    r'^\d+\s+perechi',
    r'^\d+\s+[Șș]i îi vei',
    r'^\d+\s+[A-ZȘȚĂÎÂ][a-z]',  # footnote: "1 SomeText"
]


def fetch_page():
    if os.path.exists(CACHE_FILE):
        print(f"Using cached file: {CACHE_FILE}")
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return f.read()
    print(f"Fetching {URL}")
    req = urllib.request.Request(URL, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read().decode("utf-8")
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        f.write(html)
    return html


def decode_html_entities(text):
    replacements = [
        ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
        ("&nbsp;", " "), ("&#160;", " "), ("&quot;", '"'),
        ("&#39;", "'"), ("&#91;", "["), ("&#93;", "]"),
    ]
    for old, new in replacements:
        text = text.replace(old, new)
    return text


def is_psalm_separator(line):
    """Check if this line is a psalm section header.
    Returns (True, psalm_number) or (False, None).
    """
    line = line.strip().strip('= ').strip()
    line = re.sub(r'<[^>]+>', '', line).strip()
    line = decode_html_entities(line)

    patterns = [
        r'^PSALMUL\s+(\d+)$',
        r'^Psalmul\s+(\d+)$',
        r'^Psalomul\s+lui\s+David,?\s+(\d+)$',
        r'^Psalmul\s+lui\s+David,?\s+(\d+)$',
        r'^Psalomul\s+lui\s+David,\s*(\d+)$',
    ]
    for pat in patterns:
        m = re.match(pat, line)
        if m:
            return True, int(m.group(1))
    return False, None


def clean_verse_line(line):
    """Clean a verse line, returning cleaned text or empty string."""
    line = decode_html_entities(line)
    # Remove remaining HTML tags
    line = re.sub(r'<[^>]+>', '', line)
    # Remove footnote markers: [1], [*]
    line = re.sub(r'\[\d+\]', '', line)
    # Remove asterisk footnote markers at end of word
    line = re.sub(r'\*(?=\s|$)', '', line)
    # Remove meter annotations like "7, 6" or "8, 7" (standalone)
    line = re.sub(r'\s*\d+,\s*\d+\.?\s*$', '', line)
    # Normalize whitespace
    line = re.sub(r'\s+', ' ', line).strip()
    return line


def is_noise(line):
    """Return True if line should be discarded."""
    if not line:
        return True
    # Footnote back-arrows (↑)
    if line.startswith('↑') or line.startswith('▲'):
        return True
    # Standalone meter annotations
    if re.match(r'^\d+,\s*\d+\.?$', line):
        return True
    # Single footnote numbers
    if re.match(r'^\d+\.?$', line):
        return True
    # Footnote/pronunciation lines
    for pat in FOOTNOTE_LINE_PATTERNS:
        if re.search(pat, line):
            return True
    # "1 mă vei." type
    if re.match(r'^\d+\s+[a-zăîâșț]', line):
        return True
    # Navigation
    noise_words = ['modifică', 'Descărcare', 'Wikisource', 'Categorie',
                   'Adus de la', '← ', '→ ']
    for n in noise_words:
        if n in line:
            return True
    # Public domain notices
    if 'domeniu public' in line.lower() or 'Domeniu public' in line:
        return True
    if 'autorul a decedat' in line:
        return True
    # Dosoftei author name standalone
    if line.strip() == 'Dosoftei':
        return True
    return False


def extract_body_content(html):
    """Extract and pre-process the body content."""
    body_start = html.find('id="bodyContent"')

    # Cut off at the "Note" or "Trimiteri" h2 section (after the last psalm)
    # These sections contain footnote references, not psalm content
    note_section = html.find('id="Note"')
    trimiteri_section = html.find('id="Trimiteri"')
    license_section = html.find('licenseContainer')
    catlinks_section = html.find('id="catlinks"')
    printfooter_section = html.find('class="printfooter"')

    # Find the earliest cutoff point after body_start
    candidates = [p for p in [note_section, trimiteri_section, license_section,
                               catlinks_section, printfooter_section]
                  if p > body_start]

    if candidates:
        # Use the position of the h2 containing "Note" or "Trimiteri"
        # Back up to find the start of that h2 tag
        earliest = min(candidates)
        # Find the <h2 or <div before this position
        h2_before = html.rfind('<h2', body_start, earliest)
        div_before = html.rfind('<div class="mw-heading', body_start, earliest)
        cutoff = min([p for p in [h2_before, div_before, earliest] if p > body_start])
        body_end = cutoff
    else:
        body_end = len(html)

    body = html[body_start:body_end]

    # Remove scripts and styles
    body = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.DOTALL)
    body = re.sub(r'<style[^>]*>.*?</style>', '', body, flags=re.DOTALL)

    # Remove <ref> content (footnotes embedded in text)
    body = re.sub(r'<ref[^>]*/>', '', body)
    body = re.sub(r'<ref[^>]*>.*?</ref>', '', body, flags=re.DOTALL)

    # Remove mw-editsection spans
    body = re.sub(r'<span[^>]+class="mw-editsection"[^>]*>.*?</span>', '', body, flags=re.DOTALL)

    # Remove <ul> annotation blocks (meter notation like "7, 6")
    # These appear between psalm content paragraphs
    body = re.sub(r'</p>\s*<ul[^>]*>.*?</ul>\s*<p[^>]*>', ' ', body, flags=re.DOTALL)

    # Remove remaining standalone <ul> blocks
    body = re.sub(r'<ul[^>]*>.*?</ul>', '', body, flags=re.DOTALL)

    return body


def normalize_psalm_separators(body):
    """Convert all psalm separator types to ###PSALM_N### markers."""

    # 1. H2 headings with psalm content
    def h2_to_marker(m):
        text = re.sub(r'<[^>]+>', '', m.group(0)).strip()
        text = decode_html_entities(text)
        if re.search(r'alm', text, re.IGNORECASE):
            is_sep, num = is_psalm_separator(text)
            if is_sep:
                return f'\n###PSALM_{num}###\n'
        return '\n'
    body = re.sub(r'<h2[^>]*>.*?</h2>', h2_to_marker, body, flags=re.DOTALL)
    body = re.sub(r'<h3[^>]*>.*?</h3>', '', body, flags=re.DOTALL)

    # 2. ==PSALMUL N== wikitext markers
    def wikitext_to_marker(m):
        text = m.group(0)
        is_sep, num = is_psalm_separator(text)
        if is_sep:
            return f'\n###PSALM_{num}###\n'
        return ''
    body = re.sub(r'==+[^=\n]+==+', wikitext_to_marker, body)

    # 3. Convert <br> to newlines, </p> to newlines
    body = re.sub(r'<br\s*/?>', '\n', body, flags=re.IGNORECASE)
    body = re.sub(r'</p>', '\n', body, flags=re.IGNORECASE)
    body = re.sub(r'<p[^>]*>', '\n', body, flags=re.IGNORECASE)

    # Remove remaining HTML tags
    body = re.sub(r'<[^>]+>', '', body)

    # Decode entities
    body = decode_html_entities(body)

    # 4. Plain text "PSALMUL N" / "Psalmul N" headers in text
    lines = body.split('\n')
    normalized = []
    for line in lines:
        stripped = line.strip()
        is_sep, num = is_psalm_separator(stripped)
        if is_sep:
            normalized.append(f'###PSALM_{num}###')
        else:
            normalized.append(line)

    return '\n'.join(normalized)


def split_into_psalms(normalized_body):
    """Split the normalized body into psalm content sections.

    Returns dict: {psalm_number: raw_content_string}
    """
    parts = re.split(r'###PSALM_(\d+)###', normalized_body)

    psalms_raw = {}
    i = 1
    while i < len(parts) - 1:
        try:
            psalm_num = int(parts[i])
        except ValueError:
            i += 2
            continue

        content = parts[i + 1] if i + 1 < len(parts) else ''
        psalms_raw[psalm_num] = content
        i += 2

    return psalms_raw


def split_long_verse_line(long_line):
    """Split a long line containing multiple verse couplets into individual lines.

    Romanian verse couplets typically:
    - Are ~30-70 characters each
    - End with a period, comma, or question mark
    - The next couplet starts with a capital letter

    Strategy: Split at ". " or "? " or "! " followed by a capital letter.
    Also split on " ," where the next word starts with capital (some couplets
    end with comma before continuing).

    If a segment is still > 80 chars, try to split further.
    """
    if len(long_line) < 80:
        return [long_line]

    # Split on sentence-ending punctuation followed by space + capital
    # This covers: "... mântuiește, Că scăzură ..." -> split after comma+capital
    # Pattern: punctuation (. , ? !) followed by space followed by capital
    # But we need to be careful not to split on "Doamne," or "Că,"

    # First try: split on [.?!] + space + Capital
    segments = re.split(r'(?<=[.?!])\s+(?=[A-ZĂÎÂȘȚ])', long_line)

    if len(segments) > 1:
        # Good split found
        result = []
        for seg in segments:
            seg = seg.strip()
            if seg:
                # Recursively split if still too long
                if len(seg) > 150:
                    result.extend(split_long_verse_line(seg))
                else:
                    result.append(seg)
        return result

    # Second try: split on comma + space + Capital (verse couplets joined mid-strophe)
    # But only if the preceding context looks like end of a verse (preceded by lowercase)
    segments = re.split(r'(?<=[a-zăîâșț,])\s+(?=[A-ZĂÎÂȘȚ](?:[a-z]|\s))', long_line)

    if len(segments) > 2:
        result = []
        for seg in segments:
            seg = seg.strip()
            if seg and not is_noise(seg):
                result.append(seg)
        return result

    # Fallback: keep as single line
    return [long_line]


def process_psalm_lines(content):
    """Process raw psalm content into clean verse lines.

    Handles two cases:
    1. Lines separated by \\n with <br> (most psalms)
    2. Strophes merged into one long line (psalms 6-11 and some others)
    """
    raw_lines = content.split('\n')
    lines = []

    for raw_line in raw_lines:
        line = clean_verse_line(raw_line)

        if not line:
            continue

        # Skip noise
        if is_noise(line):
            continue

        # Skip psalm separators (shouldn't appear but be safe)
        is_sep, _ = is_psalm_separator(line)
        if is_sep:
            continue

        # Stop at "Note" / "Trimiteri" section
        if re.match(r'^(Note|Trimiteri|Bibliografie|Categorie)', line):
            break

        # For very long lines (merged verse), try to split
        if len(line) > 100:
            sub_lines = split_long_verse_line(line)
            lines.extend(sub_lines)
        else:
            lines.append(line)

    return lines


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    html = fetch_page()
    print(f"Page size: {len(html)} bytes")

    # Extract and pre-process body
    print("Extracting body content...")
    body = extract_body_content(html)
    print(f"Body size: {len(body)} chars")

    # Normalize psalm separators
    print("Normalizing psalm separators...")
    normalized = normalize_psalm_separators(body)

    # Split into psalms
    print("Splitting into psalms...")
    psalms_raw = split_into_psalms(normalized)

    sorted_nums = sorted(psalms_raw.keys())
    print(f"Found {len(psalms_raw)} psalms: {sorted_nums[:10]}...{sorted_nums[-5:]}")

    # Missing psalms
    expected = set(range(1, 151))
    found = set(sorted_nums)
    missing = expected - found
    if missing:
        print(f"Missing from Wikisource: {sorted(missing)}")

    # Remove old files
    existing = [f for f in os.listdir(OUTPUT_DIR) if f.endswith('.json')]
    for f in existing:
        os.remove(os.path.join(OUTPUT_DIR, f))
    print(f"Removed {len(existing)} old files")

    # Process and write each psalm
    written = 0
    for i, psalm_num in enumerate(sorted_nums, 1):
        lines = process_psalm_lines(psalms_raw[psalm_num])
        lines = [l for l in lines if l.strip()]

        if not lines:
            print(f"WARNING: Psalm {psalm_num} has no content after cleaning")
            continue

        # Remove HTML remnants from last line (e.g., "<div")
        while lines and lines[-1].startswith('<'):
            lines.pop()

        if not lines:
            print(f"WARNING: Psalm {psalm_num} empty after trimming HTML")
            continue

        # Build {index, text} paragraphs
        paragraphs = [{"index": idx, "text": line} for idx, line in enumerate(lines)]

        chapter = {
            "title": f"Psalmul {psalm_num} (Psalm {psalm_num})",
            "paragraphs": paragraphs
        }

        filename = os.path.join(OUTPUT_DIR, f"chapter-{i:03d}.json")
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(chapter, f, ensure_ascii=False, indent=2)

        written += 1

    print(f"\nWritten {written} chapter files")

    # === VERIFICATION ===
    print("\n" + "="*50)
    print("VERIFICATION")
    print("="*50)

    json_files = sorted([f for f in os.listdir(OUTPUT_DIR) if f.endswith('.json')])
    print(f"Total JSON files: {len(json_files)}")

    # Artifact check
    artifact_count = 0
    for fname in json_files:
        fpath = os.path.join(OUTPUT_DIR, fname)
        with open(fpath) as f:
            data = json.load(f)
        for p in data.get('paragraphs', []):
            text = p.get('text', '') if isinstance(p, dict) else str(p)
            if re.search(r'==|<poem|<ref|</', text):
                artifact_count += 1
                print(f"  ARTIFACT [{fname}]: {text[:80]}")

    if artifact_count == 0:
        print("No wikitext artifacts found")

    # Format check
    bad_format = 0
    for fname in json_files:
        fpath = os.path.join(OUTPUT_DIR, fname)
        with open(fpath) as f:
            data = json.load(f)
        for p in data.get('paragraphs', []):
            if not isinstance(p, dict) or 'index' not in p or 'text' not in p:
                bad_format += 1
    if bad_format == 0:
        print("Paragraph format: OK ({index, text} objects)")
    else:
        print(f"FORMAT ERROR: {bad_format} paragraphs not in format")

    # Size check
    print("\nPsalm line counts:")
    total_lines = 0
    problems = []
    for fname in json_files:
        fpath = os.path.join(OUTPUT_DIR, fname)
        with open(fpath) as f:
            data = json.load(f)
        n = len(data.get('paragraphs', []))
        total_lines += n
        title = data.get('title', '')

        # Last line check
        paras = data.get('paragraphs', [])
        last = paras[-1].get('text', '') if paras and isinstance(paras[-1], dict) else ''
        first = paras[0].get('text', '') if paras and isinstance(paras[0], dict) else ''

        if n < 4:
            problems.append(f"  SHORT [{fname}] {title}: {n} lines | last: {last!r}")
        elif n > 120:
            problems.append(f"  LARGE [{fname}] {title}: {n} lines - may be merged")

        # HTML remnants in last line
        if last.startswith('<') or '{{' in last:
            problems.append(f"  HTML REMNANT [{fname}]: last={last!r}")

        print(f"  {fname}: {n} lines")

    print(f"\nTotal verse lines: {total_lines}")

    if problems:
        print("\nPROBLEMS:")
        for p in problems:
            print(p)

    # Boundary check for first 20
    print("\nBoundary check (first 20):")
    for fname in json_files[:20]:
        fpath = os.path.join(OUTPUT_DIR, fname)
        with open(fpath) as f:
            data = json.load(f)
        paras = data.get('paragraphs', [])
        title = data.get('title', '')
        n = len(paras)
        first = paras[0].get('text', '') if paras and isinstance(paras[0], dict) else ''
        last = paras[-1].get('text', '') if paras and isinstance(paras[-1], dict) else ''
        print(f"  {title} ({n} lines)")
        print(f"    FIRST: {first[:70]}")
        print(f"    LAST:  {last[-60:]}")


if __name__ == "__main__":
    main()
