# Plan: Carmina Graeca Dual-Agent Quality Pipeline

## Goal

Produce high-quality clean Greek text files from the OCR source, similar to `data/raw/ptochoprodromos/Ptochoprodromos.txt` — one verse per line, line numbers every 5 lines optional, no apparatus, no noise, no OCR garbage.

## Architecture: Two Collaborating Agents

### Agent 1: Processor
**Role**: Run the processing pipeline, debug issues, adjust parameters, produce clean output.

**Responsibilities**:
- Run `scripts/process-carmina-graeca.ts` and examine per-chapter output
- Extract verse text from the JSON output into clean `.txt` files
- Debug any remaining apparatus contamination or verse truncation
- Adjust classifier thresholds or extractor logic if needed
- Write clean text files to `data/raw/carmina-graeca/chapter-NN-title.txt`
- Log all decisions and findings to the shared scratchpad

**Output**: Clean `.txt` files in `data/raw/carmina-graeca/`, one per poem

### Agent 2: Critic
**Role**: Examine output quality, critique Greek text, identify problems.

**Responsibilities**:
- Read each output `.txt` file produced by Agent 1
- Evaluate: Is the Greek coherent? Are there OCR artifacts? Garbled passages?
- Check for: fragmentary lines, broken words, apparatus leaking through, Latin contamination
- Check verse structure: Are lines of consistent length? Do they scan as 15-syllable political verse?
- Write detailed critiques to `docs/carmina-graeca-critiques.md`
- Flag specific lines/passages that need attention
- Communicate with Agent 1 via the shared scratchpad

**Output**: Formal critiques in `docs/carmina-graeca-critiques.md`

## Shared Files

| File | Purpose |
|------|---------|
| `docs/carmina-graeca-scratchpad.md` | Shared working notes between both agents |
| `docs/carmina-graeca-critiques.md` | Agent 2's formal quality critiques |
| `data/raw/carmina-graeca/` | Output folder for clean .txt files |
| `data/processed/carmina-graeca/` | Intermediate JSON output from pipeline |
| `data/difficult_extra_processing/carmina_graeca_medii_aevi_multiple_titles.txt` | THE SOURCE FILE (23,770 lines of OCR) |

## Important Paths

- **Source OCR file**: `data/difficult_extra_processing/carmina_graeca_medii_aevi_multiple_titles.txt`
- **Processing scripts**: `scripts/lib/carmina/` (6 modules) + `scripts/process-carmina-graeca.ts`
- **Intermediate output**: `data/processed/carmina-graeca/chapter-NNN.json`
- **Final clean output**: `data/raw/carmina-graeca/` (target)
- **Reference format**: `data/raw/ptochoprodromos/Ptochoprodromos.txt`

## Quality Standards

A "good" output file should look like `data/raw/ptochoprodromos/Ptochoprodromos.txt`:
- One verse line per line
- Clean polytonic Greek text
- No Arabic numerals embedded in verse
- No editorial brackets [ ] { }
- No manuscript sigla (isolated Α, Β, Μ, Ρ, Δ)
- No Latin-in-Greek-script garble
- Consistent line lengths (40-60 chars typical for 15-syllable verse)
- Proper Unicode NFC normalization
- Optional: line numbers every 5th line (matching editorial numbering)

## Workflow

1. Agent 1 runs the pipeline, produces initial .txt files
2. Agent 2 reads the files, writes critiques
3. Agent 1 reads critiques from scratchpad, adjusts processing
4. Agent 2 re-evaluates improved output
5. Iterate until quality is acceptable

## Expected Issues to Watch For

1. **OCR artifacts**: Garbled characters that look like Greek but aren't real words
2. **Apparatus leakage**: Lines with sigla or numbers that slipped through
3. **Fragmentary lines**: Lines that are clearly truncated or merged
4. **Wrong text boundaries**: Verses from adjacent poems mixed in
5. **Verse 18 short lines**: Text #18 has genuinely shorter verse (~24 chars vs ~45)
6. **Missing verses**: Lines that the classifier incorrectly rejected as apparatus
