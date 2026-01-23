# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Working Files

**Always read these files at the start of a session:**

| File | Purpose |
|------|---------|
| `reference-guide.txt` | Structured quick reference: current state, deployment, file locations, conventions, remaining work |
| `scratch-notes.txt` | Session-by-session working notes with technical decisions and progress |
| `communications-to-the-User.txt` | Implementation plan and step-by-step deployment guide |

**Rules for maintaining these files:**
- Update `scratch-notes.txt` as you work — track decisions, issues found, and progress
- Update `reference-guide.txt` when project state changes (new features, deployments, schema changes)
- Never keep large translation content in context — write directly to the database
- Keep `CLAUDE.md` itself updated when architecture or conventions change

## Project Overview

A public wiki hosting open-source translations of classical and medieval texts. Users register accounts to edit or endorse AI-generated translations. All edits are publicly tracked with full history. Translations are displayed in a side-by-side columnar format inspired by the [Columbia Digital Dante](https://digitaldante.columbia.edu/) project: original source text on the left, translation on the right, aligned paragraph-by-paragraph or section-by-section.

**Initial languages:** Koine Greek, Latin, Classical Chinese
**Initial texts:**
- **Zhu Zi Yu Lei** (朱子語類) — 140 chapters of recorded conversations between neo-Confucian philosopher Zhu Xi and his disciples, compiled by Li Jingde (c. 1270). Source: [ctext.org/zhuzi-yulei](https://ctext.org/zhuzi-yulei)
- **De Ceremoniis** (De cerimoniis aulae Byzantinae) — Byzantine court protocol written/commissioned by Emperor Constantine VII Porphyrogennetos (c. 956–959). Source: [Internet Archive](https://archive.org/details/bub_gb_OFpFAAAAYAAJ) (Reiske/Leich edition)
- **Chuanxi Lu** (傳習錄) — Record of transmitted instructions by Wang Yangming (王陽明), neo-Confucian philosopher (1472–1529). 3 chapters processed, not yet seeded to database.

**Content organisation:**
- Each chapter of a longer text is its own page with two columns (source + translation)
- Multi-chapter texts have an index/table of contents page
- Texts are browsable by: language → alphabetical list of authors → alphabetical list of titles
- Translations can cover books, plays, essays, and other genres

---

## Existing Open-Source Wiki Platforms Evaluated

No existing wiki platform provides the full combination of interlinear parallel text display, wiki-style versioned editing, and endorsement voting. A custom build is necessary, but several platforms offer useful features or starting points.

### Wiki Platforms

| Platform | Stack | Versioning | Parallel Text | Endorsements | Verdict |
|----------|-------|------------|---------------|--------------|---------|
| **MediaWiki** | PHP, MySQL | Full history | Via templates (table hacks) | No | Too heavy, wrong language |
| **Wiki.js** | Node.js, PostgreSQL | Full history | No | No | v3 stalled since 2021 |
| **NextWiki** | Next.js, tRPC, Drizzle | Full history | No | No | Best starting point |
| **BookStack** | PHP, Laravel | Page revisions | No | No | Good hierarchy model |
| **DokuWiki** | PHP, flat-file | Full history | No | Publish plugin (approval) | Too limited |

### MediaWiki + Wikisource Approach

Wikisource hosts parallel translations using [`{{Translation table}}`](https://en.wikisource.org/wiki/Template:Translation_table/3) templates that place source and translated text in adjacent HTML table cells. The [Translate extension](https://www.mediawiki.org/wiki/Extension:Translate) provides a side-by-side editor view for translators. The [`{{Bilingual}}`](https://en.wikisource.org/wiki/Wikisource:Multilingual_texts) template handles facing-page style parallel texts. These work but are primitive — wikitext table macros rather than a proper aligned component. MediaWiki is PHP-based and heavily opinionated; fighting its architecture for custom rendering is not recommended.

### NextWiki (Recommended Fork Candidate)

[NextWiki](https://github.com/barisgit/nextwiki) is an open-source wiki built on the exact T3 stack recommended for this project: Next.js 15, TypeScript, tRPC, Drizzle ORM, NextAuth.js, React 19, Tailwind CSS, Shadcn UI. It uses a monorepo structure (`apps/` + `packages/`).

**Already provides:** page versioning with diff comparison, markdown editing with syntax highlighting, full-text search (PostgreSQL tsvector/tsquery with fuzzy matching), auth (credentials + OAuth), image upload, page/folder hierarchy, highlighted search results.

**Would need to be added:** interlinear two-column viewer, Text/Chapter/Translation data model (replacing flat pages), endorsement system, category browser (language → author → title), structured paragraph-aligned content storage.

Forking NextWiki saves significant scaffolding work on auth, versioning, search, and the general wiki editing experience.

### Open-Source Parallel Text Display Projects

These are not wikis but provide reference implementations for the interlinear display:

**[TextBrowser](https://github.com/bahaidev/textbrowser)** — client-side JavaScript multilinear text browser. Supports parallel columns and interlinear stacking modes. Uses JSON data format with configurable columns, column reordering, and per-column styling. Fully offline-capable via IndexedDB/service workers. Read-only (no editing), vanilla JS (not React), early-stage (6 stars, 1 fork). The display logic and JSON data format are the most relevant reference for building the InterlinearViewer component.

**[Aglona Reader](https://sites.google.com/site/aglonareader/home/lang-en)** — desktop parallel text reader using a "ParallelBook" XML format (PBO extension). Content is structured as "fragment pairs" of source + target text. This fragment-pair data model maps directly to the paragraph-aligned content storage needed for this project.

**Wikisource `{{Translation table/N}}`** — the simplest reference: each table row = one paragraph pair (source cell + translation cell). The concept is sound even though the wikitext template implementation isn't reusable in React.

### GitHub Topics for Further Reference

- [github.com/topics/interlinear](https://github.com/topics/interlinear) — repositories tagged "interlinear" (includes biblical Greek/Hebrew readers, linguistic annotators)
- [github.com/topics/interlinear-text](https://github.com/topics/interlinear-text) — additional interlinear text tools

---

## Architecture Decision

### Recommended Approach: Fork NextWiki or Custom T3 Build

Both paths use the same stack. Forking NextWiki gives you auth, versioning, search, and markdown editing out of the box. Building from scratch gives you a cleaner data model without legacy page-based assumptions.

**Stack (same for both paths):**
- **Framework:** Next.js 15+ (App Router) with TypeScript
- **UI:** React 19, Tailwind CSS, Shadcn UI components
- **Database:** PostgreSQL (via Neon or Supabase for managed hosting)
- **ORM:** Drizzle ORM (lightweight, type-safe, good migration support)
- **API layer:** tRPC (end-to-end type safety between client and server)
- **Auth:** NextAuth.js v5 (supports OAuth providers + email/password credentials)
- **Search:** PostgreSQL full-text search (tsvector/tsquery) — sufficient for initial scale
- **Deployment:** Vercel (frontend + serverless functions) or self-hosted with Docker

**The unique components that must be built custom regardless of starting point:**
1. InterlinearViewer — paragraph-aligned two-column display (reference: TextBrowser's column logic)
2. Text/Chapter/TranslationVersion data model — structured hierarchy replacing flat wiki pages
3. Endorsement system — version-specific user endorsements with counts
4. Category browser — language → author → title hierarchy with alphabetical ordering
5. Paragraph-aligned editor — editing interface that preserves paragraph structure alignment with source text

---

## Data Model

### Core Entities

```
User
├── id, email, username, passwordHash, role (reader|editor|admin)
├── createdAt, lastLoginAt
└── has many: Edits, Endorsements

Language
├── id, code (grc|la|zh), name, displayName
└── has many: Texts

Author
├── id, name, nameOriginalScript, era, description
└── has many: Texts

Text
├── id, title, titleOriginalScript, languageId, authorId
├── description, sourceUrl, totalChapters
└── has many: Chapters

Chapter
├── id, textId, chapterNumber, title
├── sourceContent (original text, stored as structured paragraphs/lines)
├── ordering
└── has many: Translations

Translation
├── id, chapterId, currentVersionId
├── createdAt, lastEditedAt
└── has many: TranslationVersions, Endorsements

TranslationVersion
├── id, translationId, versionNumber
├── content (translated text, paragraph-aligned with source)
├── authorId (user who made this edit), editSummary
├── createdAt
├── previousVersionId (for diff chain)
└── has many: Endorsements

Endorsement
├── id, userId, translationVersionId
├── createdAt
└── (unique constraint: one endorsement per user per version)
```

### Key Relationships
- A Text belongs to one Language and one Author
- A Chapter belongs to one Text and contains the immutable source content
- A Translation belongs to one Chapter; there is typically one Translation per Chapter but the schema allows multiple (e.g., competing translations)
- TranslationVersions form an append-only chain; edits create new versions, never modify old ones
- Endorsements point to a specific TranslationVersion, not to the Translation head

### Content Storage Format

Source content and translation content should be stored as JSON arrays of paragraphs/lines to enable paragraph-level alignment in the interlinear viewer:

```json
{
  "paragraphs": [
    { "index": 0, "text": "子曰：「學而時習之，不亦說乎？」" },
    { "index": 1, "text": "有朋自遠方來，不亦樂乎？" }
  ]
}
```

The translation mirrors this structure with matching indices so the UI can render them side-by-side.

---

## Interlinear Display Format

The core UI feature is a two-column, paragraph-aligned viewer. Each row contains one paragraph/section from the source (left) and the corresponding translation (right). The columns scroll together. For Classical Chinese, where text is dense, the source column may be narrower. For Greek/Latin verse, line-by-line alignment may be preferred over paragraph-by-paragraph.

```
┌─────────────────────────────────┬─────────────────────────────────┐
│ Source Text (Original)          │ Translation (English)           │
├─────────────────────────────────┼─────────────────────────────────┤
│ 子曰：「學而時習之，不亦說乎？」│ The Master said: "To learn and  │
│                                 │ then practice it regularly, is  │
│                                 │ that not a pleasure?"           │
├─────────────────────────────────┼─────────────────────────────────┤
│ 有朋自遠方來，不亦樂乎？        │ "To have friends come from afar,│
│                                 │ is that not a delight?"         │
└─────────────────────────────────┴─────────────────────────────────┘
```

On mobile, the columns should stack vertically (source above, translation below) for each paragraph unit.

---

## Source Text Acquisition

### Chinese Classics via ctext.org API

**API documentation:** https://ctext.org/tools/api

**Key endpoints:**
- `gettext` — retrieves text content given a CTP URN
- `readlink` — converts a ctext.org URL to a CTP URN
- `getstatus` — checks authentication status
- `getlink` — converts URN to URL

**URN for Zhu Zi Yu Lei:** `ctp:zhuzi-yulei`
**Chapter URNs:** `ctp:zhuzi-yulei/1` through `ctp:zhuzi-yulei/140`

**Authentication tiers:**
- Unauthenticated: limited data access
- Logged-in CTP account: larger data quotas
- Institutional subscriber: full access via IP registration

**Important:** The `subsections` element (needed to enumerate chapters) requires authentication. The `fulltext` element (chapter content) is available for individual chapter URNs. Rate limits apply — cache all responses locally.

**Error codes:** `ERR_REQUIRES_AUTHENTICATION`, `ERR_REQUEST_LIMIT`

**Python library:** `pip install ctext` — provides a wrapper around the JSON API.

**Acquisition script strategy:**
1. Authenticate with a CTP account
2. Iterate over chapters 1–140 of `ctp:zhuzi-yulei`
3. Call `gettext` for each chapter URN
4. Parse the `fulltext` response (ordered paragraph list)
5. Store raw JSON in `data/raw/zhuzi-yulei/` (gitignored)
6. Process into the structured paragraph format for database seeding

### Greek/Latin via Internet Archive

**De Ceremoniis source:** https://archive.org/details/bub_gb_OFpFAAAAYAAJ

This is a scan of the Reiske/Leich Greek-Latin edition (1751/1829). The text is available as OCR output but will require significant cleanup:

**Acquisition strategy:**
1. Download the OCR text or use Internet Archive's API (`/download/` endpoint for full text, or page-by-page via the IA Read API)
2. The Reiske edition already contains a Latin translation alongside the Greek — both can be extracted
3. Clean up OCR artifacts (common issues: polytonic Greek diacritics misread, ligatures, page headers mixed into text)
4. Segment into chapters/sections following the book's own divisions (Book I and Book II, with numbered chapters within each)
5. Store cleaned text in structured paragraph format

**Alternative source:** The [Princeton Byzantine Translations](https://byzantine.lib.princeton.edu/byzantine/translation/16010) project may have cleaner digital text of portions of De Ceremoniis.

**Note:** The modern English translation by Moffatt and Tall (2012, Byzantina Australiensia 18) is under copyright and cannot be used. AI-generated translations from the Greek are the intended approach.

---

## Hosting & Cost Estimates

### Vercel + Neon (Recommended for MVP)

| Component | Plan | Cost |
|-----------|------|------|
| Vercel (frontend + API) | Hobby (free) or Pro ($20/mo) | $0–$20/mo |
| Neon PostgreSQL | Free tier (0.5 GB storage, 190 compute hours) | $0/mo |
| Domain name | .org or .com | ~$10–15/year |
| **Total (MVP)** | | **$0–$22/mo** |

The free tier is sufficient for initial development and low traffic. The Pro plan ($20/mo) adds team collaboration, more bandwidth (1 TB included), and higher serverless function limits. Additional bandwidth on Pro costs $0.15/GB.

### Self-Hosted Alternative (Higher Traffic)

For more control or higher traffic, deploy with Docker on a VPS:

| Component | Provider | Cost |
|-----------|----------|------|
| VPS (2 GB RAM) | DigitalOcean, Hetzner, or Linode | $5–12/mo |
| Managed PostgreSQL | Supabase free tier, or self-hosted on same VPS | $0–15/mo |
| Domain + SSL | Let's Encrypt (free SSL) | ~$10–15/year |
| **Total** | | **$5–27/mo** |

---

## Current Deployment

- **Live site:** https://deltoi.com
- **Hosting:** Vercel (auto-deploys from `main` branch on push)
- **Database:** Neon PostgreSQL (free tier, schema synced via `pnpm db:push`)
- **GitHub:** https://github.com/translorentz/translation-wiki.git
- **Translation API:** DeepSeek V3.2 (deepseek-chat, OpenAI-compatible SDK)

---

## Build & Development Commands

### Initial project setup (run once):

```bash
pnpm create next-app@latest translation-wiki --typescript --tailwind --eslint --app --src-dir
cd translation-wiki

# Core dependencies
pnpm add @trpc/server @trpc/client @trpc/tanstack-react-query @tanstack/react-query \
  zod superjson drizzle-orm postgres next-auth@beta bcryptjs slugify openai diff

# Dev dependencies
pnpm add -D drizzle-kit @types/node @types/bcryptjs @types/diff \
  vitest @vitejs/plugin-react jsdom @testing-library/react \
  @testing-library/dom @testing-library/jest-dom vite-tsconfig-paths \
  prettier prettier-plugin-tailwindcss tsx

# Shadcn UI
npx shadcn@latest init
npx shadcn@latest add button card input label textarea table tabs \
  dialog dropdown-menu avatar badge separator scroll-area tooltip

# Start local PostgreSQL
docker compose up -d
```

### Daily development:

```bash
# Start development server (Turbopack)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint and format
pnpm lint
pnpm format

# Run all tests (watch mode)
pnpm test

# Run a single test file
pnpm test -- path/to/test.spec.ts

# Run tests once (CI mode)
pnpm test:run

# Type checking
pnpm typecheck

# Database operations (Drizzle)
pnpm db:generate    # Generate migrations from schema changes
pnpm db:migrate     # Apply pending migrations
pnpm db:push        # Push schema directly (dev only)
pnpm db:studio      # Open Drizzle Studio (database GUI at localhost:4983)
pnpm db:seed        # Seed database with source texts

# Source text acquisition scripts
pnpm acquire:ctext         # Fetch Zhu Zi Yu Lei from ctext.org
pnpm acquire:archive       # Fetch De Ceremoniis from Internet Archive
pnpm process:texts         # Clean and structure raw text files

# AI translation
pnpm translate:batch       # Generate AI translations for untranslated chapters
```

### package.json scripts to define:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx scripts/seed-db.ts",
    "acquire:ctext": "tsx scripts/acquire-ctext.ts",
    "acquire:archive": "tsx scripts/acquire-archive.ts",
    "process:texts": "tsx scripts/process-texts.ts",
    "translate:batch": "tsx scripts/translate-batch.ts"
  }
}
```

---

## Repository Structure

```
translation-wiki/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages (login, register)
│   │   ├── (wiki)/             # Main wiki pages
│   │   │   ├── texts/          # Text listing and category browser
│   │   │   ├── [lang]/[author]/[text]/          # Text index page
│   │   │   └── [lang]/[author]/[text]/[chapter] # Chapter view (interlinear)
│   │   ├── api/                # API route handlers (or tRPC router)
│   │   └── layout.tsx          # Root layout
│   ├── components/
│   │   ├── interlinear/        # InterlinearViewer, ParagraphPair, ColumnLayout
│   │   ├── editor/             # TextEditor, DiffViewer, EditHistory
│   │   ├── navigation/         # TableOfContents, CategoryBrowser, Breadcrumbs
│   │   ├── auth/               # LoginForm, RegisterForm, UserMenu
│   │   └── ui/                 # Shadcn UI primitives
│   ├── server/
│   │   ├── db/                 # Drizzle schema, connection, queries
│   │   ├── trpc/               # tRPC routers and procedures
│   │   └── auth/               # NextAuth config, providers
│   ├── lib/                    # Shared utilities, constants, types
│   └── styles/                 # Global CSS, Tailwind config
├── scripts/
│   ├── acquire-ctext.ts        # Fetch from ctext.org API
│   ├── acquire-archive.ts      # Fetch from Internet Archive
│   ├── process-texts.ts        # Clean and structure raw texts
│   └── seed-db.ts              # Load processed texts into database
├── data/
│   ├── raw/                    # Downloaded raw files (gitignored)
│   └── processed/              # Cleaned, structured text files (committed)
├── drizzle/
│   ├── schema.ts               # Database schema definition
│   └── migrations/             # Generated migration files
├── tests/
│   ├── unit/                   # Unit tests
│   ├── integration/            # API/database integration tests
│   └── e2e/                    # End-to-end browser tests
├── public/                     # Static assets
├── docker-compose.yml          # Local PostgreSQL for development
├── .env.example                # Environment variable template
├── drizzle.config.ts           # Drizzle ORM configuration
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── package.json
├── CLAUDE.md
└── initial-seed-request.txt    # Original project requirements
```

---

## Implementation Phases

### Phase 1: Project Scaffolding & Database

1. Initialise Next.js 15 project with TypeScript, Tailwind, ESLint
2. Set up Drizzle ORM with PostgreSQL schema (all entities above)
3. Configure NextAuth.js with email/password credentials
4. Create `docker-compose.yml` for local PostgreSQL
5. Write and run initial migrations
6. Verify auth flow (register, login, session)

### Phase 2: Source Text Acquisition

1. Write `scripts/acquire-ctext.ts` — authenticate and fetch all 140 chapters of Zhu Zi Yu Lei
2. Write `scripts/acquire-archive.ts` — download De Ceremoniis text from Internet Archive
3. Write `scripts/process-texts.ts` — clean OCR artifacts, segment into paragraphs, output structured JSON
4. Write `scripts/seed-db.ts` — load processed texts into Chapter records
5. Test that all chapters load correctly

### Phase 3: Core Reading Experience

1. Build the InterlinearViewer component (two-column, paragraph-aligned, responsive)
2. Build the TableOfContents component for multi-chapter navigation
3. Build the CategoryBrowser (language → author → title hierarchy)
4. Create the chapter view page `[lang]/[author]/[text]/[chapter]`
5. Create the text index page with chapter listing
6. Create the main browse page with language/author/title filters

### Phase 4: Editing & Versioning

1. Build the TextEditor component (markdown or plain text, with paragraph structure preserved)
2. Implement the TranslationVersion creation flow (edit → save → new version)
3. Build the EditHistory component (list of versions with timestamps and authors)
4. Build the DiffViewer component (side-by-side or inline diff between versions)
5. Add edit permissions (only logged-in users can edit)

### Phase 5: Endorsement System

1. Implement endorsement API (add/remove endorsement for a specific version)
2. Display endorsement count on each translation version
3. Show which version has the most endorsements (highlight as "community preferred")
4. User profile page showing their endorsement history

### Phase 6: AI Translation Generation

1. Integrate DeepSeek V3.2 API (OpenAI-compatible) to generate initial translations
2. Feed source text in language-aware batches (zh=1500 chars, grc/la=6000 chars per batch)
3. Store AI-generated translations as the initial TranslationVersion (author = system/AI)
4. Mark AI translations distinctly in the UI so users know they can be improved

### Phase 7: Search & Polish

1. Implement full-text search across titles, authors, and translation content
2. Add responsive design polish for mobile
3. Add loading states, error boundaries, and edge case handling
4. SEO: meta tags, Open Graph, structured data for scholarly content

### Phase 8: Deployment

1. Configure Vercel project (or Docker deployment)
2. Set up production PostgreSQL (Neon, Supabase, or self-hosted)
3. Configure environment variables for production
4. Set up domain and SSL
5. Deploy and verify

---

## Subagent Coordination Strategy

For parallel development with multiple Claude Code instances:

| Agent | Responsibility | Key Files |
|-------|---------------|-----------|
| **Infrastructure** | DB schema, migrations, auth, Docker, deployment | `drizzle/`, `src/server/`, `docker-compose.yml` |
| **Frontend** | Interlinear viewer, editor, navigation, responsive layout | `src/components/`, `src/app/(wiki)/` |
| **Backend** | tRPC routers, versioning logic, endorsement API, search | `src/server/trpc/`, `src/app/api/` |
| **Text Acquisition** | ctext.org fetcher, IA fetcher, text processing, seeding | `scripts/`, `data/` |
| **AI Translation** | DeepSeek API integration, batch translation, quality checks | `src/server/translation/`, `scripts/translate-batch.ts` |

**Coordination rules:**
- Each agent works on a feature branch and submits PRs
- The Infrastructure agent establishes the schema first; other agents depend on it
- Frontend and Backend agents coordinate on tRPC router interfaces (define types first)
- Text Acquisition runs independently once the schema is ready
- AI Translation depends on both the schema and acquired source texts

---

## Technical Conventions

- **Paragraph alignment is the fundamental unit** — source and translation content must maintain matching paragraph indices. The interlinear viewer renders by iterating over paragraph pairs.
- **Versioning is append-only** — never mutate or delete a TranslationVersion. Edits always create new versions.
- **Endorsements are version-specific** — they point to a TranslationVersion ID, not to the Translation head. If a new version is created, previous endorsements remain on the old version.
- **Unicode correctness is critical** — Classical Chinese (CJK Unified Ideographs), Koine Greek (polytonic with diacritics: ά, ὁ, ῆ, etc.), and Latin all require proper UTF-8 handling. Database collation, search indexing, and font rendering must all account for this.
- **Source texts are immutable after import** — the Chapter.sourceContent field is set during seeding and never modified by users. Only translations are editable.
- **URLs are human-readable** — use slugified paths like `/grc/constantine-vii/de-ceremoniis/chapter-1` rather than numeric IDs in URLs.

---

## External Resources

- **ctext.org API:** https://ctext.org/tools/api — JSON API for Chinese classical texts
- **ctext.org Python library:** `pip install ctext` (PyPI wrapper for the API)
- **Zhu Zi Yu Lei on ctext.org:** https://ctext.org/zhuzi-yulei (URN: `ctp:zhuzi-yulei`, 140 chapters)
- **De Ceremoniis on Internet Archive:** https://archive.org/details/bub_gb_OFpFAAAAYAAJ (Reiske edition, Greek + Latin)
- **Princeton Byzantine Translations:** https://byzantine.lib.princeton.edu/byzantine/translation/16010 (partial De Ceremoniis)
- **Digital Dante (layout reference):** https://digitaldante.columbia.edu/ — side-by-side Italian/English display
- **NextWiki (potential base):** https://github.com/barisgit/nextwiki — T3 stack wiki with versioning
- **Wiki.js:** https://js.wiki/ — established Node.js wiki (reference for features, not recommended as base)
- **Drizzle ORM docs:** https://orm.drizzle.team/
- **NextAuth.js docs:** https://next-auth.js.org/
- **tRPC docs:** https://trpc.io/
