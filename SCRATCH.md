# SCRATCH — Working Notes for Claude Code Sessions

Last updated: 2026-01-23

---

## Translation Status

### In Progress (as of this session)
- **ZZYL (zhuziyulei)**: Chapters 1-57 done. 4 parallel workers running ch 58-78, 79-99, 100-120, 121-140
- **Tongjian (tongjian)**: ~ch 11+ of 45, 1 worker (be044fa). Even chapters already done from earlier task.
- **Huang Di Nei Jing (huangdineijing)**: 3 parallel workers running ch 1-18, 19-37, 38-55
- **Ptochoprodromos**: Fully translated (2 chapters)
- **Ceremonialis**: Chapters 1-7 translated
- **Chuanxilu**: Chapters 1-3 translated
- **Deanima, Lombards, Regno, Elegia**: All chapters translated

### Translation Failures to Retry
- Tongjian chapters 17, 18: JSON parse errors (malformed DeepSeek output). Need manual retry.
- One Tongjian task (b422579) was OOM-killed (exit 137). Replaced by be044fa which skips already-done chapters.

---

## Known Issues

- **Elegia poetry**: Stored as whole-book paragraphs (not line-by-line). Should be reprocessed for proper poetry display.
- **Chinese translation prompt**: Tuned for Neo-Confucian texts. HDNJ (medical text) gets translated with ZZYL-specific hints about 理/氣 terminology which is irrelevant. Consider text-specific prompts.
- **ZZYL chapter 57**: Might be incomplete (old task was killed mid-chapter). Check if translation exists.

---

## Recently Completed Work

### This Session (2026-01-23)
1. Poetry display mode: `textType` field, line numbers every 5th line in gutter, compact spacing
2. Ptochoprodromos: processed, seeded, translated (2 poems, 39+10 lines)
3. Huang Di Nei Jing: processed (55 Su Wen chapters), seeded, translation in progress
4. Parallelized ZZYL translation: killed sequential worker, launched 4 parallel workers
5. Updated CLAUDE.md with current implementation status

### Previous Sessions
- Discussion system (threaded per-chapter)
- English titles for all texts
- Site description updated
- DeepSeek V3 integration (replaced Anthropic SDK)
- Endorsement UI
- Search page
- Auth pages (login, register)
- Admin user management
- SEO metadata

---

## Text Processing Patterns

All processing scripts follow the same pattern:
1. Read files from `data/raw/<dirname>/`
2. Parse format-specific structure (line numbers, headers, separators)
3. Output `{ chapterNumber, title, sourceContent: { paragraphs: [{index, text}] } }`
4. Write to `data/processed/<slug>/chapter-NNN.json`

### Format-specific notes:
- **ZZYL (ctext.org)**: Already structured as paragraph arrays from API
- **Ceremonialis**: OCR cleanup needed, Greek + some Latin
- **Ptochoprodromos**: Strip every-5th-line numbers, split poems on 2+ blank lines
- **Huang Di Nei Jing**: Strip `===` and section headers (title repeated as "上古天真... :")
- **Tongjian**: Complex structure with sub-narratives
- **Chuanxilu**: Dialogue format with speaker markers
- **Latin texts**: Various chronicle/poetry formats

---

## Database Access

- Production DB: Neon (connection string in `.env.local` as `DATABASE_URL`)
- Schema changes: `pnpm db:push` (direct push, no migrations for dev)
- Studio: `pnpm db:studio` (port 4983)
- Seed: `pnpm tsx scripts/seed-db.ts` (idempotent, skips existing)

---

## Deployment

- GitHub: `https://github.com/translorentz/translation-wiki.git`
- Vercel: auto-deploys on push to main
- No custom domain configured yet
