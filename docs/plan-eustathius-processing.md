# Eustathius Commentary on Homer's Odyssey — Processing Plan & Results

## Source Material

### Volume 1
**File:** `data/difficult_extra_processing/commentariiadhom01eust_djvu.txt`
**Lines:** 25,880
**Origin:** Internet Archive OCR scan of Volume 1 of *Commentarii ad Homeri Odysseam* by Eustathius of Thessalonica (Leipzig: J.A.G. Weigel, 1825 edition by J.G. Stallbaum)
**Language:** Ancient Greek (polytonic) with Latin preface
**Coverage:** Odyssey Books 1-11 (Alpha through Lambda)

### Volume 2
**File:** `data/difficult_extra_processing/commentariiadhom02eust_djvu.txt`
**Lines:** 19,565
**Origin:** Same edition, Volume 2
**Language:** Ancient Greek (polytonic)
**Coverage:** Odyssey Books 12-24 (Mu through Omega)

### File Structure (discovered through analysis)

| Section | Lines | Content |
|---------|-------|---------|
| 1-102 | Internet Archive header, corrupted title page |
| 103-176 | Latin preface (edition methodology) |
| 178-283 | Greek prooemium (general introduction) |
| 284-25833 | Commentary organized by Rhapsody (Books 1-11) |
| 25834-25880 | Back matter (University of Toronto library cards, garble) |

### OCR Challenges

1. **RHAPSODIA headers heavily garbled**: "ΡΑΨΩΙΔΙΑ" appears as "ΡΑΨΙ 7141.4", "ΡΑΨΙΩΙΔ4174", "ΡῬΡΑΨΙΩ 141", etc. OCR confuses Greek letters with Arabic numerals (Δ→4, Ι→1) and introduces spaces/dots
2. **Bekker-style margin numbers**: 10, 20, 30, 40, 50, 60 appear embedded in commentary text as line references from the original edition
3. **Edition page numbers**: 3-4 digit numbers (1379-1603+) appear at line/page boundaries
4. **Mixed Latin/Greek in preface**: Chapter 0 contains both Latin (edition preface) and Greek (prooemium)
5. **Hyphenated word splits**: OCR preserves line breaks from the printed page, splitting Greek words with hyphens
6. **Garbled margin annotations**: "v>> Row.", "m P*" and similar artifacts from edition cross-references

---

## Architecture

Six-module TypeScript pipeline in `scripts/lib/eustathius/`, modeled after the Carmina Graeca pipeline:

```
process-eustathius.ts (orchestrator)
  |
  +-- book-splitter.ts      — Identifies 25 book boundaries (12 Vol.1 + 13 Vol.2)
  +-- content-classifier.ts — Classifies each line (15-rule priority, incl. interline noise)
  +-- commentary-extractor.ts — Cleans, joins, paragraphs
  +-- quality-checker.ts    — Validates output quality
  +-- output-formatter.ts   — Writes JSON + TXT files
  +-- types.ts              — Shared type definitions
```

**CLI usage:**
```bash
pnpm tsx scripts/process-eustathius.ts              # Volume 1 only (default)
pnpm tsx scripts/process-eustathius.ts --volume 2   # Volume 2 only
pnpm tsx scripts/process-eustathius.ts --all        # Both volumes
pnpm tsx scripts/process-eustathius.ts --chapter 12 --volume 2  # Single chapter
```

### Key Differences from Carmina Graeca Pipeline

| Aspect | Carmina Graeca | Eustathius |
|--------|---------------|------------|
| Content type | Medieval Greek verse | Ancient Greek scholarly prose |
| Main content | Verse lines to extract | Commentary paragraphs to preserve |
| Structure | 21 poems by title | 12 sections by ΡΑΨΩΔΙΑ headers |
| Paragraph splitting | Fixed 15-line groups | Verse reference breaks, sentence boundaries |
| Line length | Short (verse) | Long (prose, 80-200+ chars) |
| Numeral handling | Any digit = noise | Specific patterns (page/margin numbers) |
| Unicode | NFC normalize | NFC normalize |
| Preface | None | Latin/Greek chapter 0 |

---

## Phase 1: Book Boundary Identification

### Method

Manual analysis of ΡΑΨΩΔΙΑ headers in the OCR text. Each header contains:
- The Greek letter identifying the Odyssey book (A=1, B=2, Γ=3, ... Λ=11)
- Verse range (e.g., "Vs 1-354")
- Edition page number

### RHAPSODIA Pattern

Required 3 iterations to match all OCR variants:

```typescript
// Final pattern: matches garbled ΡΑΨΩΔΙΑ in all encountered forms
const RHAPSODIA_PATTERN = /[>>Ῥ]*Ρ{0,2}ΑΨ[ΙΩΏΣΨ1-9\s.,]*[ΩΏΙΊ1ΣΤ][ΔΙ41][ΑΙ4.,\s\d]*/;
```

Key variants encountered:
- `ΡΑΨΩΙΔ4Ι. A40` (Book 1, line 284)
- `ΡΑΨΙ 7141.4 B.` (Book 2, line 5024)
- `ΡΑΨΩΙ ΔΙΑ I|` (Book 3, line 8120)
- `ΡΑΨΙΩΙΔ4174 4.` (Book 4, line 8901)
- `ΡΑΨΙΩΙΔ417.4 E` (Book 5, line 11932)
- `ΡῬΡΑΨΙΩ 141... Z` (Book 6, line 14524)
- `ΡΑΨΙΩΙΔΙΑ H` (Book 7, line 16132)
- `ΡΑΨΩΙΔΙ14Α 6` (Book 8, line 16982)
- `ΡΑΨΙ1417..4. 1.` (Book 9, line 18944)
- `ΡΑΨΩΏΙΔΙ.Α K` (Book 10, line 22578)
- `ΡΑΨΩΙΔ4Ι.Α 4.` (Book 11, line 24457)

### Hardcoded Boundaries (Round 2 — corrected)

| Chapter | Book Letter | Start Line | End Line | Lines |
|---------|------------|------------|----------|-------|
| 0 | Prooemium | 102 | 283 | 181 |
| 1 | Α (Alpha) | 283 | 5029 | 4,746 |
| 2 | Β (Beta) | 5029 | 6973 | 1,944 |
| 3 | Γ (Gamma) | 6973 | 8900 | 1,927 |
| 4 | Δ (Delta) | 8900 | 11931 | 3,031 |
| 5 | Ε (Epsilon) | 11931 | 14523 | 2,592 |
| 6 | Ζ (Zeta) | 14523 | 16131 | 1,608 |
| 7 | Η (Eta) | 16131 | 16981 | 850 |
| 8 | Θ (Theta) | 16981 | 18943 | 1,962 |
| 9 | Ι (Iota) | 18943 | 22577 | 3,634 |
| 10 | Κ (Kappa) | 22577 | 24456 | 1,879 |
| 11 | Λ (Lambda) | 24456 | 25833 | 1,377 |

**Round 2 boundary corrections:**
- Book 1/2: Moved from 5023 to 5029. The ΡΑΨΩΔΙΑ B header at line 5024 is a page marker, but lines 5027-5029 contain the continuation of Book 1's Kybebe discussion (split word "κατεχό-μενος"). Actual Book 2 content starts at line 5030 with "(Vers, 19.)" discussing Od. 2.19.
- Book 2/3: Moved from 8119 to 6973. The header at line 6974 `ΡΑΨ.141].4 D 9. 2} --- 57. 111` has "D" which is OCR for Γ (Gamma). Confirmed by verse refs from line 6978 onward discussing Od. 3.22+. The header at line 8120 is a continuation header within Book 3.
- Book 3/4: Unchanged at 8900 (confirmed correct).

---

## Phase 2: Content Classification

### Categories

| Category | Description | Examples |
|----------|-------------|---------|
| `commentary` | Greek scholarly prose (main content) | Dense Greek text, 80-200+ chars |
| `page_header` | ΡΑΨΩΔΙΑ markers, edition running headers | "ΡΑΨΩΙ ΔΙΑ...", "CoMMEN..." |
| `margin_number` | Bekker-style line numbers | "10", "20", "30", "40", "50", "60" |
| `page_number` | Edition page numbers | "1379", "1466", standalone 3-4 digits |
| `empty` | Blank/whitespace lines | |
| `noise` | Short garbage, OCR artifacts | "<3 char", mixed symbols, low Greek% |

### Classification Rules (priority order)

1. Empty: no content after trim
2. Very short (<=3 chars): digits = margin_number, else = noise
3. Standalone Bekker multiples of 10
4. Standalone 3-4 digit page numbers
5. Bare numbers on a line
6. ΡΑΨΩΔΙΑ headers (regex match)
7. Edition running headers ("CoMMEN...", "Opvss...")
8. Short lines (<10 chars) with low Greek content
9. Medium lines (5-30 chars) with <20% Greek
10. Long lines (>=30 chars) with >50% Greek → commentary
11. Medium lines with >60% Greek → commentary
12. Lines with <30% Greek AND <30% Latin → noise
13. Default: >40% Greek → commentary
14. Otherwise → noise

### Helper Functions

- `greekCharPercent(text)`: Counts Unicode Greek characters (0x0370-0x03FF, 0x1F00-0x1FFF) / total alpha
- `latinCharPercent(text)`: Counts ASCII letters / total alpha
- `isGreekChar(char)`: Checks if codepoint is in Greek ranges

---

## Phase 3: Commentary Extraction

### Line Cleaning (`stripMarginAnnotations`)

Applied to each commentary-classified line:
1. Strip trailing Bekker numbers at end of line
2. Strip trailing page numbers (3-4 digits at end)
3. Strip leading page numbers (handles both `1466 text` and `1466(Vers...` patterns)
4. Strip standalone Bekker numbers at line start
5. Strip embedded Bekker numbers mid-line
6. Strip trailing multi-digit garble sequences
7. Strip edition cross-references ("v>> Row.", "v>> Rom.")
8. Strip garbled margin annotations ("m P*")

### Line Joining

- Lines are joined with spaces
- Hyphenated words (`word-\n continuation`) are merged by removing the hyphen and joining directly
- Pattern: `/[alpha]-\s*$/` at end of previous line

### Paragraph Splitting

Natural blocks detected first (gap of 3+ non-commentary lines indicates a section break), then within blocks:

1. **Primary**: Split at verse references `(Vers. N.)` — these mark commentary transitions between Homeric verses
2. **Secondary**: Split at sentence boundaries (period + space) when approaching MAX_PARAGRAPH_CHARS (800)
3. **Fallback**: Hard split at 800 chars if no natural break point found

### Post-Processing

- Paragraphs <20 chars are filtered as noise leakage
- Unicode NFC normalization applied
- Multiple spaces collapsed to single

---

## Phase 4: Quality Checking

### Thresholds

| Check | FAIL | WARN |
|-------|------|------|
| Paragraphs | 0 paragraphs | <3 paragraphs (non-preface) |
| Total chars | — | <1000 chars (non-preface) |
| Greek % | — | <60% (non-preface) |
| Short paras | — | Any <20 chars |
| Page numbers | — | 3-4 digit numbers at paragraph start/end |
| Commentary % | — | <50% of non-empty lines |
| Noise % | — | >30% of non-empty lines |

---

## Phase 5: Output

### JSON Format (`data/processed/eustathius-odyssey/chapter-NNN.json`)

```json
{
  "chapterNumber": 1,
  "title": "Commentary on Odyssey Book 1",
  "sourceContent": {
    "paragraphs": [
      { "index": 1, "text": "Θεῶν ἀγορὰ γίνεται..." },
      { "index": 2, "text": "..." }
    ]
  }
}
```

### TXT Format (`data/raw/eustathius-odyssey/chapter-NN-slug.txt`)

```
Commentary on Odyssey Book 1
Eustathius of Thessalonica

Θεῶν ἀγορὰ γίνεται...

(paragraph per block, separated by blank lines)
```

---

## Implementation Results

### Round 2 Pipeline Run (with all fixes)

```
PASS: 1  WARN: 11  FAIL: 0
Total commentary lines: 20,583
Total paragraphs: 3,555
Total characters: 1,894,705
```

Note: All WARNs are due to remaining Arabic digit characters (OCR corruption, not apparatus) and a handful of extremely garbled verse refs. No FAILs.

### Per-Chapter Results (Round 2)

| Ch | Book | Paragraphs | Characters | Greek% | Digits | Verse Refs |
|----|------|-----------|------------|--------|--------|------------|
| 0 | Preface | 23 | 12,663 | 59.6% | 8 | 0 |
| 1 | Alpha | 627 | 330,734 | 96.6% | 218 | 1 |
| 2 | Beta | 257 | 136,231 | 97.3% | 81 | 1 |
| 3 | Gamma | 270 | 144,356 | 96.8% | 108 | 2 |
| 4 | Delta | 415 | 218,453 | 96.6% | 134 | 1 |
| 5 | Epsilon | 368 | 192,880 | 96.7% | 128 | 0 |
| 6 | Zeta | 233 | 124,108 | 97.1% | 90 | 1 |
| 7 | Eta | 111 | 58,556 | 95.3% | 42 | 0 |
| 8 | Theta | 277 | 147,234 | 97.4% | 74 | 0 |
| 9 | Iota | 520 | 276,968 | 97.1% | 155 | 0 |
| 10 | Kappa | 262 | 144,298 | 97.0% | 90 | 0 |
| 11 | Lambda | 192 | 108,224 | 97.5% | 69 | 0 |

### Round 1 Results (for comparison)

| Ch | Book | Paragraphs | Characters | Greek% |
|----|------|-----------|------------|--------|
| 0 | Preface | 23 | 12,727 | 59.6% |
| 1 | Alpha | 607 | 336,234 | 96.1% |
| 2 | Beta | 406 | 227,932 | 96.1% |
| 3 | Gamma | 106 | 61,031 | 96.0% |
| 4 | Delta | 387 | 225,847 | 95.5% |
| 5 | Epsilon | 355 | 199,161 | 95.6% |
| 6 | Zeta | 225 | 127,933 | 96.0% |
| 7 | Eta | 107 | 60,952 | 93.9% |
| 8 | Theta | 271 | 153,554 | 95.9% |
| 9 | Iota | 508 | 288,047 | 95.7% |
| 10 | Kappa | 265 | 149,742 | 95.7% |
| 11 | Lambda | 190 | 112,094 | 96.3% |

### Sample Output

**Chapter 0 (Latin Preface):**
> Quoa nunc Graecarum litterarum studiosis in manus tradimus volumen primum quin de ratione consilii, quod in eo describendo secuti sumus, quaedam praefemur...

**Chapter 1 (Odyssey Book 1, Alpha):**
> Θεῶν ἀγορὰ γίνεται, περὶ τοῦ τὸν Ὀδυσσέα εἰς Ἰϑάχην πεμφϑῆναι ἀπὸ τῆς Καλυψοῦς νήσου. μεϑ ἣν r Ἀϑηνᾶ εἰς Ἰϑάκην παραγίνεται πρὸς Τηλέμαχον, ὁμοιωϑεῖσα Μέντῃ βασιλεῖ Ταφίων...

**Chapter 9 (Odyssey Book 9, Iota):**
> δῆμον ἅπαντα δυσχέρειαν χαὶ τοῦ τοιούτου βίου δηλοῖ, ὡς μὴ δυνατὸν ὃν πάντας εὐφραίνεσϑαι. (Vers. 7 .) Τὸ δὲ ἀκουάζονται ὅμοιον τῷ μιγάζονται...

---

## Issues Encountered & Resolved

### 1. ΡΑΨΩΔΙΑ Regex Too Narrow (3 iterations)

**Problem:** Initial pattern failed to match OCR variants with accented omega (Ώ), numerals replacing Greek, and spaces within the header.

**Fix:** Broadened character classes to include Ώ, Ί, numerals 1-9, spaces, dots, and sigma/psi as OCR confusion targets.

### 2. Leading Page Numbers Without Whitespace

**Problem:** Lines like `1466( Vers. 253.)` have page number immediately followed by `(` — no whitespace separator. The original pattern `/^\d{3,4}[᾿'΄]?\s+/` required `\s+` after digits.

**Fix:** Changed to `/^\d{3,4}[᾿'΄]?\s*(?=[\s(])/` which uses a lookahead for space or parenthesis.

### 3. Trailing Multi-Digit Garble

**Problem:** Lines ending with `πατὴρ 0 ὡς 1 706 50` — multiple isolated digits from adjacent columns/margins.

**Fix:** Added pattern `/(\s+\d{1,2}){2,}\s*$/` to strip sequences of 2+ isolated short numbers at end of line.

### 4. Noise Leakage as Short Paragraphs

**Problem:** OCR fragments like "αὗται quia dn", "β (m μα}", "T ΕΣ ΠΗ δ ΜΗ ΒΟΥ" passed classification (partial Greek content) and became tiny paragraphs.

**Fix:** Added post-extraction filter: paragraphs <20 chars are discarded.

### 5. Book 3 (Gamma) Appears Short

**Investigation:** Book 3 has only 781 lines vs 3000+ for other books. Confirmed this is correct — the ΡΑΨΩΔΙΑ header at line 8120 genuinely marks verses 355-534 of Book 3, and the next ΡΑΨΩΔΙΑ at line 8901 is the start of Book 4 (Delta). The commentary on Odyssey Book 3 is inherently shorter.

---

## Volume 2 Results (Books 12-24)

### Boundary Map

| Chapter | Book Letter | Start Line | End Line | Lines |
|---------|------------|------------|----------|-------|
| 12 | Μ (Mu) | 126 | 2344 | 2,218 |
| 13 | Ν (Nu) | 2344 | 3680 | 1,336 |
| 14 | Ξ (Xi) | 3680 | 5670 | 1,990 |
| 15 | Ο (Omicron) | 5670 | 6988 | 1,318 |
| 16 | Π (Pi) | 6988 | 8260 | 1,272 |
| 17 | Ρ (Rho) | 8260 | 9775 | 1,515 |
| 18 | Σ (Sigma) | 9775 | 11188 | 1,413 |
| 19 | Τ (Tau) | 11188 | 13168 | 1,980 |
| 20 | Υ (Upsilon) | 13168 | 14350 | 1,182 |
| 21 | Φ (Phi) | 14350 | 15748 | 1,398 |
| 22 | Χ (Chi) | 15748 | 17110 | 1,362 |
| 23 | Ψ (Psi) | 17110 | 18230 | 1,120 |
| 24 | Ω (Omega) | 18230 | 19518 | 1,288 |

### Per-Chapter Results

| Ch | Book | Paragraphs | Characters | Greek% | Digits | Verse Refs |
|----|------|-----------|------------|--------|--------|------------|
| 12 | Mu | 277 | 149,290 | 94.7% | 165 | 0 |
| 13 | Nu | 170 | 92,612 | 95.3% | 113 | 0 |
| 14 | Xi | 248 | 136,334 | 95.4% | 123 | 1 |
| 15 | Omicron | 173 | 94,144 | 96.6% | 53 | 0 |
| 16 | Pi | 180 | 97,971 | 97.4% | 60 | 1 |
| 17 | Rho | 222 | 119,416 | 97.4% | 61 | 0 |
| 18 | Sigma | 197 | 107,784 | 96.4% | 71 | 2 |
| 19 | Tau | 266 | 149,258 | 97.3% | 104 | 0 |
| 20 | Upsilon | 172 | 92,581 | 96.3% | 64 | 0 |
| 21 | Phi | 181 | 103,736 | 96.3% | 80 | 0 |
| 22 | Chi | 185 | 102,799 | 96.3% | 100 | 0 |
| 23 | Psi | 142 | 80,210 | 95.6% | 88 | 2 |
| 24 | Omega | 176 | 98,689 | 97.4% | 69 | 1 |

### Volume 2-Specific Pipeline Additions

1. **Interline noise detection (rule 8b):** Lines with >60% punctuation/spaces and average word length <= 2.0 chars are classified as noise. This handles scattered single-character OCR fragments from two-column page layout scanning in Volume 2.

2. **ODYSSEIA header pattern:** Volume 2 uses full-title format headers ("ODYSSEIA X. HOMEROU RHAPSOIDIA") rather than just "RHAPSOIDIA X" subsection headers. A new regex pattern detects these.

3. **Content-based boundary identification:** Book letters in Volume 2 are heavily garbled (Pi as "H", Sigma as "X", Phi as "d", Omega as "90"). Boundaries were identified using content summaries (arguments) preceding each book rather than relying solely on header parsing.

---

## Combined Totals (Both Volumes)

| Metric | Volume 1 | Volume 2 | Total |
|--------|----------|----------|-------|
| Source lines | 25,880 | 19,565 | 45,445 |
| Chapters | 12 (0-11) | 13 (12-24) | 25 |
| Commentary lines | 20,539 | 15,819 | 36,358 |
| Paragraphs | 3,557 | 2,589 | 6,146 |
| Characters | 1,893,622 | 1,424,824 | 3,318,446 |
| FAILs | 0 | 0 | 0 |
| Greek% (avg) | 96.7% | 96.3% | 96.5% |

---

## Next Steps

1. **Seed into database**: Add author entry (Eustathius of Thessalonica) and text entry to `scripts/seed-db.ts`
2. **Translate**: Run translation workers with appropriate Greek commentary prompt
3. **Quality review**: Reviewer agent to evaluate Volume 2 output and confirm B+ grade or better
