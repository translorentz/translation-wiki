#!/usr/bin/env python3
"""V2 post-processing for La Scapigliatura e il 6 Febbraio.

Reads V1 output JSON files and applies fixes identified by the evaluator:
  P0: Remove garbage paragraphs, merge cross-paragraph soft hyphens
  P1: Additional l/t corrections, Cristina name fix
  P2: Strip trailing garbage, join regular-hyphen breaks
"""
import json
import os
import re
import glob

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'data', 'processed', 'scapigliatura-e-il-6-febbraio')

# --- P0: Garbage paragraph detection (tightened) ---

# Italian vowels
VOWELS = set('aeiouàèéìòùAEIOUÀÈÉÌÒÙ')

def is_garbage_paragraph(text: str) -> bool:
    """More aggressive garbage detection than V1."""
    stripped = text.strip()
    if not stripped:
        return True

    # Very short fragments (< 8 chars) that aren't plausible Italian
    if len(stripped) < 8:
        clean = re.sub(r'[^A-Za-zÀ-ÿ]', '', stripped)
        # Must have vowels and consonants
        if len(clean) < 2:
            return True
        has_vowel = any(c in VOWELS for c in clean)
        if not has_vowel:
            return True
        # Check if it's a known short word/phrase
        lower = stripped.lower().strip('.,;:!?\'"()[]{}')
        short_ok = {
            'il', 'la', 'le', 'lo', 'un', 'in', 'di', 'da', 'si', 'no',
            'ma', 'se', 'ha', 'ho', 'fa', 'io', 'al', 'ai', 'ad', 'oh',
            'ah', 'su', 'me', 'te', 'ci', 'vi', 'che', 'chi', 'non', 'per',
            'con', 'lui', 'lei', 'noi', 'voi', 'due', 'tre', 'era', 'gli',
            'una', 'uno', 'col', 'del', 'nel', 'sul', 'fra', 'e', 'o',
        }
        if lower not in short_ok:
            return True

    # Alpha ratio check
    alpha = sum(1 for c in stripped if c.isalpha())
    total = len(stripped.replace(' ', ''))
    if total == 0:
        return True
    ratio = alpha / total

    # Tightened: < 60% alpha for paragraphs under 50 chars
    if len(stripped) < 50 and ratio < 0.60:
        return True
    # Standard: < 50% alpha
    if ratio < 0.50:
        return True

    # Short paragraphs starting with punctuation/symbols are suspicious
    if len(stripped) < 30 and stripped[0] in '.;:,/!?^*<>([{':
        return True

    # Word plausibility for short paragraphs (< 100 chars)
    if len(stripped) < 100:
        words = stripped.split()
        def is_plausible(w):
            clean = re.sub(r'[^A-Za-zÀ-ÿ]', '', w)
            if len(clean) < 2:
                return len(clean) == 1 and clean.lower() in 'aeiou'
            has_v = any(c in VOWELS for c in clean)
            if len(clean) >= 3 and not has_v:
                return False
            # Mixed case mid-word
            if len(clean) >= 3 and re.search(r'[a-z][A-Z]', clean):
                return False
            # 4+ consecutive consonants (very rare in Italian)
            consonant_pat = re.sub(r'[aeiouàèéìòùAEIOUÀÈÉÌÒÙ]', ' ', clean.lower())
            if any(len(run) >= 4 for run in consonant_pat.split()):
                return False
            return True

        plausible_count = sum(1 for w in words if is_plausible(w))
        if len(words) >= 2 and plausible_count / len(words) < 0.65:
            return True
        if len(words) == 1 and not is_plausible(words[0]):
            return True

    # Additional heuristic: multiple mid-word uppercase ASCII letters (garbled OCR)
    # Only check ASCII uppercase to avoid false positives with accented chars
    mid_upper_count = len(re.findall(r'[a-z][A-Z]', stripped))
    if mid_upper_count >= 3 and len(stripped) < 80:
        return True
    # For longer paragraphs, high density of mid-word uppercase = garbage
    if mid_upper_count >= 4:
        return True

    # Extended word plausibility for paragraphs 100-500 chars
    if 100 <= len(stripped) <= 500:
        words = stripped.split()
        def is_plausible_ext(w):
            clean = re.sub(r'[^A-Za-zÀ-ÿ]', '', w)
            if len(clean) < 2:
                return False
            has_v = any(c in VOWELS for c in clean)
            if len(clean) >= 3 and not has_v:
                return False
            if len(clean) >= 3 and re.search(r'[a-z][A-Z]', clean):
                return False
            consonant_pat = re.sub(r'[aeiouàèéìòùAEIOUÀÈÉÌÒÙ]', ' ', clean)
            if any(len(run) >= 4 for run in consonant_pat.split()):
                return False
            return True
        plausible = sum(1 for w in words if is_plausible_ext(w))
        if len(words) >= 3 and plausible / len(words) < 0.5:
            return True

    return False


# --- P0: Cross-paragraph soft hyphen merge ---

def merge_soft_hyphen_paragraphs(paragraphs: list[dict]) -> list[dict]:
    """Merge paragraphs where the first ends with ¬ into the next."""
    result = []
    i = 0
    while i < len(paragraphs):
        text = paragraphs[i]['text']
        if text.rstrip().endswith('¬') and i + 1 < len(paragraphs):
            # Remove ¬ and merge with next paragraph
            merged = text.rstrip().rstrip('¬') + paragraphs[i + 1]['text'].lstrip()
            result.append({'text': merged})
            i += 2
        else:
            result.append({'text': text})
            i += 1
    # Re-index
    for idx, p in enumerate(result):
        p['index'] = idx
    return result


# --- P1: Additional l/t corrections ---

ADDITIONAL_LT = {
    'mollo': 'molto',
    'Mollo': 'Molto',
    'tulli': 'tutti',
    'Tulli': 'Tutti',
    'polente': 'potente',
    'Polente': 'Potente',
    'polenti': 'potenti',
    'Polenti': 'Potenti',
    'porla': 'porta',
    'Porla': 'Porta',
    'polenle': 'potente',
    'Polenle': 'Potente',
    'parlili': 'partiti',
    'Parlili': 'Partiti',
    'polenli': 'potenti',
    'mollissimo': 'moltissimo',
    'mollissima': 'moltissima',
    'molti': 'molti',  # skip, correct
    'vollò': 'voltò',
    'Vollò': 'Voltò',
    'volle': 'volte',  # careful - volle is also real (wanted), but volte (times) is more common
    'allenlo': 'attento',
    'Allenlo': 'Attento',
    'allento': 'attento',
    'Allento': 'Attento',
    'allenli': 'attenti',
    'Allenli': 'Attenti',
    'lulto': 'tutto',
    'Lulto': 'Tutto',
    'lulla': 'tutta',
    'Lulla': 'Tutta',
    'lullo': 'tutto',
    'Lullo': 'Tutto',
    'lulli': 'tutti',
    'Lulli': 'Tutti',
    'lulle': 'tutte',
    'Lulle': 'Tutte',
    'lulte': 'tutte',
    'Lulte': 'Tutte',
    'lulti': 'tutti',
    'Lulti': 'Tutti',
}
# Remove identity mappings
ADDITIONAL_LT = {k: v for k, v in ADDITIONAL_LT.items() if k != v}
# Remove 'volle' - it's a real Italian word (he/she wanted)
ADDITIONAL_LT.pop('volle', None)

def apply_additional_lt(text: str) -> str:
    for wrong, correct in ADDITIONAL_LT.items():
        text = re.sub(r'\b' + re.escape(wrong) + r'\b', correct, text)
    return text


# --- P1: Cristina fix ---

def fix_cristina(text: str) -> str:
    text = re.sub(r'\bCrisiina\b', 'Cristina', text)
    text = re.sub(r'\bcrisiina\b', 'cristina', text)
    text = re.sub(r'\bCrisi\s+ina\b', 'Cristina', text)
    text = re.sub(r'\bcrisi\s+ina\b', 'cristina', text)
    return text


# --- P2: Strip trailing garbage ---

def strip_trailing_garbage(text: str) -> str:
    """Remove trailing noise fragments from otherwise clean paragraphs."""
    # Match trailing sequences that look like OCR garbage:
    # - Starts with punctuation or space
    # - Contains lots of non-alpha chars, mixed case fragments, etc.
    # Only strip if the paragraph is otherwise long enough (>40 chars)
    if len(text) < 40:
        return text

    # Pattern: trailing segment after last sentence-ending punctuation
    # that is mostly non-alphabetic or garbled
    m = re.search(r'([.!?;:»"\')\]]+)\s+(.{3,50})$', text)
    if m:
        trailing = m.group(2)
        alpha = sum(1 for c in trailing if c.isalpha())
        total = len(trailing.replace(' ', ''))
        if total > 0 and alpha / total < 0.5:
            # Strip the trailing garbage
            return text[:m.start(2)].rstrip()

    # Also strip if paragraph ends with obvious garbage pattern
    # e.g., `.rmoixcg`, `hutjqeu`, etc.
    m2 = re.search(r'\s+([^\s]{3,})\s*$', text)
    if m2:
        last_word = m2.group(1)
        clean_word = re.sub(r'[^A-Za-zÀ-ÿ]', '', last_word)
        if len(clean_word) >= 4:
            # Check if it has vowels (Italian words always do)
            if not any(c in VOWELS for c in clean_word):
                return text[:m2.start()].rstrip()
            # Check consonant clusters
            consonants = re.sub(r'[aeiouàèéìòùAEIOUÀÈÉÌÒÙ]', '', clean_word.lower())
            if len(consonants) > len(clean_word) * 0.7 and len(clean_word) >= 5:
                return text[:m2.start()].rstrip()

    return text


# --- P2: Join regular-hyphen breaks ---

def join_hyphen_paragraphs(paragraphs: list[dict]) -> list[dict]:
    """Join paragraphs split at regular hyphens where next starts lowercase."""
    result = []
    i = 0
    while i < len(paragraphs):
        text = paragraphs[i]['text']
        # Check if paragraph ends with a hyphen-split word
        if (re.search(r'[a-zà-ÿ]{2,}-$', text.rstrip()) and
                i + 1 < len(paragraphs)):
            next_text = paragraphs[i + 1]['text']
            # Only join if next paragraph starts lowercase (continuation)
            if next_text and next_text[0].islower():
                # Remove trailing hyphen and join
                merged = text.rstrip().rstrip('-') + next_text
                result.append({'text': merged})
                i += 2
                continue
        result.append({'text': text})
        i += 1
    # Re-index
    for idx, p in enumerate(result):
        p['index'] = idx
    return result


# --- Main pipeline ---

def process_chapter(filepath: str) -> dict:
    """Apply all V2 fixes to a chapter JSON file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    paragraphs = data['sourceContent']['paragraphs']

    # P0: Merge cross-paragraph soft hyphens
    paragraphs = merge_soft_hyphen_paragraphs(paragraphs)

    # P2: Join regular-hyphen breaks (before garbage removal so merged paras get checked)
    paragraphs = join_hyphen_paragraphs(paragraphs)

    # Apply text-level fixes and filter garbage
    cleaned = []
    for p in paragraphs:
        text = p['text']

        # P1: Additional l/t corrections
        text = apply_additional_lt(text)

        # P1: Cristina fix
        text = fix_cristina(text)

        # P2: Strip trailing garbage
        text = strip_trailing_garbage(text)

        text = text.strip()

        # P0: Remove garbage paragraphs (tightened filter)
        if text and not is_garbage_paragraph(text):
            cleaned.append(text)

    # Rebuild
    data['sourceContent']['paragraphs'] = [
        {'index': i, 'text': t} for i, t in enumerate(cleaned)
    ]
    return data


def main():
    print("=== Scapigliatura V2 Post-Processing ===\n")

    files = sorted(glob.glob(os.path.join(OUTPUT_DIR, 'chapter-*.json')))
    print(f"Found {len(files)} chapter files\n")

    total_before = 0
    total_after = 0

    for filepath in files:
        filename = os.path.basename(filepath)

        # Count before
        with open(filepath, 'r', encoding='utf-8') as f:
            before_data = json.load(f)
        before_count = len(before_data['sourceContent']['paragraphs'])
        total_before += before_count

        # Process
        data = process_chapter(filepath)
        after_count = len(data['sourceContent']['paragraphs'])
        total_after += after_count

        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        diff = before_count - after_count
        diff_str = f" (-{diff})" if diff > 0 else f" (+{-diff})" if diff < 0 else ""
        print(f"  {filename}: {before_count} -> {after_count} paragraphs{diff_str}")

    print(f"\nTotal: {total_before} -> {total_after} paragraphs ({total_before - total_after} removed/merged)")
    print("Done!")


if __name__ == '__main__':
    main()
