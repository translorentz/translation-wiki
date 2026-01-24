# Eustathius Odyssey Commentary — Agent Instructions

## Source Files

Both volumes of the commentary are in `data/difficult_extra_processing/`:
1. `commentariiadhom01eust_djvu.txt` — Volume 1 (Odyssey books 1-12 approx.)
2. `commentariiadhom02eust_djvu.txt` — Volume 2 (Odyssey books 13-24 approx.)

## Requirements

- Process BOTH volumes as part of the same text ("Commentary on the Odyssey")
- Output chapters should be numbered continuously across both volumes
- Both volumes go into the same output folder: `data/raw/eustathius-odyssey/`
- Processed JSON goes to: `data/processed/eustathius-odyssey/chapter-NNN.json`
- The processing script and library modules should handle both volumes

## Documentation

The agent MUST write its own documentation and scratch notes:
- `docs/plan-eustathius-processing.md` — Processing plan, analysis, and results (like `docs/plan-carmina-graeca-processing.md`)
- `docs/eustathius-scratchpad.md` — Working notes, observations, decisions made during processing
- These files serve as reference for other subagents and future sessions

## Text Metadata

- Author: Eustathius of Thessalonica (Archbishop, 12th century CE, c. 1115-1195)
- Title: Commentary on the Odyssey (Commentarii ad Homeri Odysseam)
- Language: grc (Ancient/Medieval Greek)
- Text type: prose (commentary with embedded verse quotations)
- Edition: Leipzig 1825/1826, Weigel (ed. J.G. Stallbaum)
- Source: Internet Archive djvu OCR scans
