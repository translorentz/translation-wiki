"""Dictionary-based corrections for systematic OCR errors.

Primary issue: l/t confusion (OCR reads 't' as 'l' systematically).
Secondary: clic -> che substitution.
"""
import re

# clic -> che: only standalone word
def fix_clic(text: str) -> str:
    """Replace standalone 'clic' with 'che'. Case-sensitive."""
    # Match 'clic' as standalone word (not part of cliché, click, etc.)
    # Also handle Clic at start of sentence
    text = re.sub(r'\bClic\b', 'Che', text)
    text = re.sub(r'\bclic\b', 'che', text)
    return text

# l/t confusion dictionary: OCR form -> correct form
# Built by scanning the actual text for Italian words where 'l' replaces 't'
# Pattern: past participles (-ato/-ata/-ati/-ate -> -alo/-ala/-ali/-ale)
#          words with 'tt' -> 'll', 'rt' -> 'rl', etc.
LT_CORRECTIONS = {
    # Past participles (-ato -> -alo)
    'stala': 'stata',
    'stalo': 'stato',
    'stali': 'stati',
    'stale': 'state',
    'passalo': 'passato',
    'passala': 'passata',
    'chiamala': 'chiamata',
    'chiamalo': 'chiamato',
    'continualo': 'continuato',
    'continuala': 'continuata',
    'svoglialo': 'svogliato',
    'classificali': 'classificati',
    'trovalo': 'trovato',
    'trovala': 'trovata',
    'tentalo': 'tentato',
    'tentala': 'tentata',
    'ammiralo': 'ammirato',
    'sbircialo': 'sbirciato',
    'cercalo': 'cercato',
    'cercala': 'cercata',
    'arrestalo': 'arrestato',
    'riportalo': 'riportato',
    'sposalo': 'sposato',
    'doralo': 'dorato',
    'portalo': 'portato',
    'portala': 'portata',
    'educalo': 'educato',
    'intronalo': 'intronato',
    'posalo': 'posato',
    'illuminala': 'illuminata',
    'abitala': 'abitata',
    'sdraiala': 'sdraiata',
    'adagiala': 'adagiata',
    'annuvolala': 'annuvolata',
    'preparala': 'preparata',
    'osservala': 'osservata',
    'desolala': 'desolata',
    'vedalo': 'vedato',
    'vedala': 'vedata',
    'alzalo': 'alzato',
    'ripiglialo': 'ripigliato',
    'attardala': 'attardata',
    'nala': 'nata',  # careful - only in context
    'rassegnala': 'rassegnata',
    'destinali': 'destinati',
    'gettali': 'gettati',
    'trapelale': 'trapelate',
    'ondali': 'ondati',
    'versali': 'versati',
    'convitali': 'convitati',
    'sentimentali': 'sentimentali',  # this is CORRECT as-is (skip)
    'nali': 'nati',
    'glaciali': 'glaciali',  # CORRECT
    'ribelli': 'ribelli',  # CORRECT
    'ecclissala': 'ecclissata',
    'racciala': 'racciata',
    'cangiala': 'cangiata',
    'trucidata': 'trucidata',  # correct
    'appassionala': 'appassionata',
    'colpila': 'colpita',
    'scapiglialo': 'scapigliato',
    'scapigliala': 'scapigliata',

    # -uto/-ula
    'vedulo': 'veduto',
    'vedula': 'veduta',
    'avulo': 'avuto',
    'potulo': 'potuto',
    'tenulo': 'tenuto',
    'venulo': 'venuto',

    # -tt- -> -ll- confusion
    'lulli': 'tutti',
    'lullo': 'tutto',
    'lulla': 'tutta',
    'lulle': 'tutte',
    'tutl': 'tutt',  # handle tutl' -> tutt'
    'dillo': 'ditto',
    'fallo': 'fatto',  # careful - fallo is a real word too
    'nello': 'netto',  # careful
    'lello': 'tetto',
    'scrillo': 'scritto',
    'delto': 'detto',
    'effello': 'effetto',
    'aspello': 'aspetto',
    'riscontro': 'riscontro',  # correct

    # -rt- -> -rl-
    'porlate': 'portate',
    'porlato': 'portato',
    'porlata': 'portata',
    'porlare': 'portare',
    'morle': 'morte',
    'forle': 'forte',
    'sorle': 'sorte',
    'parle': 'parte',
    'corle': 'corte',

    # Specific words from text scan
    'Mefìslofele': 'Mefistofele',
    'scrii': 'serii',
    'cruna': "d'una",  # ligature misread - only in specific context

    # -ata/-ato endings where l appeared
    'Lodalo': 'Lodato',
    'stravolto': 'stravolto',  # correct
}

# Remove entries where key == value (no change needed)
LT_CORRECTIONS = {k: v for k, v in LT_CORRECTIONS.items() if k != v}

# Also remove dangerous corrections that are real Italian words
# 'fallo' = foul/error (real word), 'nello' = in the (real word)
DANGEROUS_WORDS = {'fallo', 'nello', 'parle', 'nala', 'nali', 'morle', 'forle', 'sorle', 'corle', 'cruna'}
for w in DANGEROUS_WORDS:
    LT_CORRECTIONS.pop(w, None)


def fix_lt_confusion(text: str) -> str:
    """Apply l/t correction dictionary to text."""
    for wrong, correct in LT_CORRECTIONS.items():
        # Word boundary match, case-sensitive
        text = re.sub(r'\b' + re.escape(wrong) + r'\b', correct, text)
        # Also try capitalized version
        if wrong[0].islower():
            cap_wrong = wrong[0].upper() + wrong[1:]
            cap_correct = correct[0].upper() + correct[1:]
            text = re.sub(r'\b' + re.escape(cap_wrong) + r'\b', cap_correct, text)
    return text


# Words ending in -ala/-alo/-ali/-ale that are REAL Italian words (not l/t errors)
REAL_ALA_WORDS = {
    'sala', 'scala', 'cala', 'mala', 'gala', 'tala', 'pala', 'ala',
    'regalo', 'scandalo', 'animalo', 'segnalo', 'regalo', 'cavalo',
    'morale', 'finale', 'tale', 'quale', 'male', 'sale', 'vale',
    'normale', 'reale', 'ideale', 'uale', 'speciale', 'sociale',
    'generale', 'naturale', 'materiale', 'musicale', 'geniale',
    'originale', 'meridionale', 'orientale', 'occidentale', 'feudale',
    'liberale', 'maritale', 'fatale', 'animale', 'brutale', 'illegale',
    'uguale', 'rivale', 'canale', 'ovale', 'pedalo',
    'morali', 'tali', 'quali', 'mali', 'sali', 'vali',
    'generali', 'naturali', 'materiali', 'musicali', 'geniali',
    'normali', 'reali', 'ideali', 'speciali', 'sociali',
    'veniali', 'sentimentali', 'glaciali', 'ribelli',
    'originali', 'orientali', 'feudali', 'liberali',
    'maritali', 'fatali', 'animali', 'brutali', 'illegali',
    'uguali', 'rivali', 'canali', 'ovali',
    'mandala',  # keep as-is since it's ambiguous
}


def fix_lt_pattern(text: str) -> str:
    """Fix l/t confusion using pattern-based rules for past participles.

    Italian past participles end in -ato/-ata/-ati/-ate.
    OCR systematically reads 't' as 'l', producing -alo/-ala/-ali/-ale.
    We fix these unless the word is a known real Italian word.
    """
    def replace_ala(m):
        word = m.group(0)
        if word.lower() in REAL_ALA_WORDS:
            return word
        # Replace the 'l' with 't' in the ending
        # -ala -> -ata, -alo -> -ato, -ali -> -ati, -ale -> -ate
        if word.endswith('ala'):
            return word[:-3] + 'ata'
        elif word.endswith('alo'):
            return word[:-3] + 'ato'
        elif word.endswith('ali'):
            # Be careful: many -ali words are real (plurals of -ale)
            return word  # Skip -ali, too many false positives
        elif word.endswith('ale'):
            return word  # Skip -ale, too many real words
        return word

    # Match words ending in -ala or -alo (but not the whole-word exceptions)
    text = re.sub(r'\b[A-Za-zÀ-ÿ]+ala\b', replace_ala, text)
    text = re.sub(r'\b[A-Za-zÀ-ÿ]+alo\b', replace_ala, text)
    return text


def apply_corrections(text: str) -> str:
    """Apply all corrections to text."""
    text = fix_clic(text)
    text = fix_lt_confusion(text)
    text = fix_lt_pattern(text)
    return text
