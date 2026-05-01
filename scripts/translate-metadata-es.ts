/**
 * Translates text titles, descriptions, author names, and chapter titles
 * to Spanish using DeepSeek. Populates *_es columns.
 *
 * Spanish register: Español Neutro (pan-Hispanic).
 * Quote convention: «» for embedded quotations, "" only for nested.
 *
 * Resumable — queries IS NULL rows before each phase.
 *
 * Usage:
 *   pnpm tsx scripts/translate-metadata-es.ts                       # all phases
 *   pnpm tsx scripts/translate-metadata-es.ts --phase titles
 *   pnpm tsx scripts/translate-metadata-es.ts --phase descriptions
 *   pnpm tsx scripts/translate-metadata-es.ts --phase authors
 *   pnpm tsx scripts/translate-metadata-es.ts --phase chapters
 *   pnpm tsx scripts/translate-metadata-es.ts --api-key-env DEEPSEEK_EXTRA_API_6
 *
 * Defaults to --api-key-env DEEPSEEK_EXTRA_API_6 to avoid contending with
 * active chapter-translation streams on the main pool.
 */

import fs from "fs";
import path from "path";
import postgres from "postgres";

const args = process.argv.slice(2);
const phaseArg = (() => {
  const i = args.indexOf("--phase");
  return i >= 0 ? args[i + 1] : null;
})();
const keyEnvArg = (() => {
  const i = args.indexOf("--api-key-env");
  return i >= 0 ? args[i + 1] : "DEEPSEEK_EXTRA_API_6";
})();
const limitArg = (() => {
  const i = args.indexOf("--limit");
  return i >= 0 ? parseInt(args[i + 1], 10) : null;
})();
const shardMod = (() => {
  const i = args.indexOf("--id-mod");
  return i >= 0 ? parseInt(args[i + 1], 10) : null;
})();
const shardRem = (() => {
  const i = args.indexOf("--id-rem");
  return i >= 0 ? parseInt(args[i + 1], 10) : null;
})();

const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envMap = new Map<string, string>();
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
  if (m) envMap.set(m[1], m[2].replace(/^['"]|['"]$/g, ""));
}

const dbUrl = envMap.get("DATABASE_URL") || "";
const deepseekKey = envMap.get(keyEnvArg) || envMap.get("DEEPSEEK_API_KEY") || "";

if (!dbUrl) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}
if (!deepseekKey) {
  console.error(`API key env var ${keyEnvArg} not found`);
  process.exit(1);
}

console.log(`[config] Using API key from env: ${keyEnvArg}`);
console.log(`[config] Phase: ${phaseArg ?? "all"}`);

const sql = postgres(dbUrl);
const DELAY_MS = 1000;

interface DeepSeekResponse {
  choices: { message: { content: string } }[];
}

async function callDeepSeek(systemPrompt: string, userContent: string, maxTokens = 2000): Promise<string> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepseekKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} — ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as DeepSeekResponse;
  return data.choices[0].message.content.trim();
}

async function callDeepSeekJson<T>(systemPrompt: string, userContent: string, maxTokens = 4000): Promise<T> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepseekKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} — ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as DeepSeekResponse;
  const content = data.choices[0].message.content.trim();
  return JSON.parse(content) as T;
}

// ----------------------------------------------------------------------------
// Phase 1 — Text titles
// ----------------------------------------------------------------------------
async function translateTextTitles() {
  const texts = await sql<{
    id: number;
    title: string;
    title_original_script: string | null;
    lang_code: string;
  }[]>`
    SELECT t.id, t.title, t.title_original_script, l.code as lang_code
    FROM texts t
    JOIN languages l ON t.language_id = l.id
    WHERE t.title_es IS NULL OR t.title_es = ''
    ORDER BY t.id
    ${limitArg ? sql`LIMIT ${limitArg}` : sql``}
  `;

  console.log(`\n=== Phase 1 — translating ${texts.length} text titles to Spanish ===\n`);

  const titlePrompt = `You translate book titles into Spanish (Español Neutro — pan-Hispanic, no Mexican or Peninsular markers).

Rules:
- For Chinese-language source texts, the input English title typically has the form "English Equivalent (Pinyin)" — e.g., "Records of the Grand Historian (Shiji)". Translate the English part to Spanish, KEEP the parenthetical romanization unchanged. Output: "Registros del Gran Historiador (Shiji)".
- For non-Chinese source texts, translate the full English title to Spanish. Use established Spanish forms when they exist:
    "The Iliad" → "La Ilíada"
    "The Odyssey" → "La Odisea"
    "Don Quixote" → "Don Quijote"
    "The Divine Comedy" → "La Divina Comedia"
    "The Republic" → "La República"
    "Metamorphoses" → "Metamorfosis"
    "Records of Eternal Life" → "Registros de la Vida Eterna"
- For obscure or specialised titles, give a precise Spanish translation.
- For titles already in another Romance language (Italian, French, Portuguese), provide the natural Spanish equivalent.
- Spanish capitalization: title case is acceptable for the main words of book titles in Spanish editorial practice; sentence-case alternatives are also fine. Be consistent and natural.
- Return ONLY the Spanish title — no quotation marks, no explanations, no parenthetical notes (except the unchanged romanization for Chinese texts).`;

  let done = 0;
  let failed = 0;
  for (const text of texts) {
    const input = text.title_original_script
      ? `English title: "${text.title}"\nOriginal script: "${text.title_original_script}"\nSource language: ${text.lang_code}`
      : `English title: "${text.title}"\nSource language: ${text.lang_code}`;

    try {
      const raw = await callDeepSeek(titlePrompt, input);
      const cleaned = raw.replace(/^["'«»“”‘’]+|["'«»“”‘’]+$/g, "").trim();
      await sql`UPDATE texts SET title_es = ${cleaned} WHERE id = ${text.id}`;
      done++;
      if (done <= 20 || done % 50 === 0) {
        console.log(`  [${done}/${texts.length}] ${text.title.slice(0, 50)} → ${cleaned.slice(0, 60)}`);
      }
    } catch (err) {
      failed++;
      console.error(`  [ERROR ${failed}] id=${text.id} ${text.title}: ${err}`);
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n[Phase 1 done] Titles: ${done} ok, ${failed} failed`);
}

// ----------------------------------------------------------------------------
// Phase 2 — Text descriptions
// ----------------------------------------------------------------------------
async function translateTextDescriptions() {
  const texts = await sql<{
    id: number;
    title: string;
    description: string;
  }[]>`
    SELECT t.id, t.title, t.description
    FROM texts t
    WHERE t.description IS NOT NULL
      AND t.description != ''
      AND (t.description_es IS NULL OR t.description_es = '')
    ORDER BY t.id
    ${limitArg ? sql`LIMIT ${limitArg}` : sql``}
  `;

  console.log(`\n=== Phase 2 — translating ${texts.length} text descriptions to Spanish ===\n`);

  const descPrompt = `You translate scholarly/encyclopaedic descriptions of classical texts into Spanish (Español Neutro — pan-Hispanic, no Mexican or Peninsular markers).

Rules:
- Translate the description into natural, fluent Spanish.
- Maintain the informative, encyclopaedic tone.
- Preserve all factual details: dates, names, places, historical context.
- For canonical names with established Spanish forms, use those (Platón, Aristóteles, Homero, Virgilio, Cicerón, Agustín, Aquino, Confucio, etc.).
- For modern proper names without established Spanish forms, keep them as-is.
- Do NOT use superlatives such as "obra maestra", "el más grande", "el más importante", "incomparable", "sin par". Use measured language.
- Do NOT add information that is not in the source.
- Do NOT omit information from the source.
- If the source description contains quotations, use «» for embedded quotations (RAE convention) and "" only for nested quotations.
- Return ONLY the Spanish translation — no preamble, no explanations.`;

  let done = 0;
  let failed = 0;
  for (const text of texts) {
    const input = `Text: "${text.title}"\nDescription to translate:\n${text.description}`;

    try {
      const esDesc = await callDeepSeek(descPrompt, input, 3000);
      await sql`UPDATE texts SET description_es = ${esDesc} WHERE id = ${text.id}`;
      done++;
      if (done <= 10 || done % 50 === 0) {
        console.log(`  [${done}/${texts.length}] ${text.title.slice(0, 40)} — ${esDesc.slice(0, 80)}...`);
      }
    } catch (err) {
      failed++;
      console.error(`  [ERROR ${failed}] id=${text.id} ${text.title}: ${err}`);
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n[Phase 2 done] Descriptions: ${done} ok, ${failed} failed`);
}

// ----------------------------------------------------------------------------
// Phase 3 — Authors (names + descriptions)
// ----------------------------------------------------------------------------
async function translateAuthorNames() {
  const authors = await sql<{
    id: number;
    name: string;
    name_original_script: string | null;
  }[]>`
    SELECT id, name, name_original_script
    FROM authors
    WHERE name_es IS NULL OR name_es = ''
    ORDER BY id
    ${limitArg ? sql`LIMIT ${limitArg}` : sql``}
  `;

  console.log(`\n=== Phase 3a — translating ${authors.length} author names to Spanish ===\n`);

  const namePrompt = `You produce the Spanish form of an author's name.

Rules:
- For ancient/canonical authors with established Spanish names, use those:
    Plato → Platón, Aristotle → Aristóteles, Homer → Homero, Hesiod → Hesíodo,
    Ovid → Ovidio, Augustine → Agustín, Aquinas → Aquino, Cicero → Cicerón,
    Virgil → Virgilio, Horace → Horacio, Seneca → Séneca, Tacitus → Tácito,
    Livy → Livio, Caesar → César, Plutarch → Plutarco, Herodotus → Heródoto,
    Thucydides → Tucídides, Xenophon → Jenofonte, Sophocles → Sófocles,
    Euripides → Eurípides, Aristophanes → Aristófanes, Aeschylus → Esquilo,
    Pindar → Píndaro, Sappho → Safo, Theocritus → Teócrito, Pliny → Plinio,
    Plotinus → Plotino, Porphyry → Porfirio, Boethius → Boecio, Bede → Beda,
    Dante → Dante, Petrarch → Petrarca, Boccaccio → Boccaccio,
    Confucius → Confucio, Mencius → Mencio, Lao Tzu → Lao Tse,
    Avicenna → Avicena, Averroes → Averroes, Ibn Khaldun → Ibn Jaldún,
    Anonymous → Anónimo
- For Chinese authors: use the pinyin form (already in the input "name") — Spanish has no established convention for sinicized names.
- For modern authors and authors whose name is already a non-Spanish proper noun, KEEP the name as-is (Goethe stays Goethe, Pushkin stays Pushkin, Ferdowsi stays Ferdowsi, Zhu Xi stays Zhu Xi).
- For "Anonymous (X)" forms, translate to "Anónimo (X)" — e.g., "Anonymous (Chinese)" → "Anónimo (chino)".
- Return ONLY the Spanish form of the name. No quotes, no explanations, no parenthetical Spanish glosses.`;

  let done = 0;
  let failed = 0;
  for (const author of authors) {
    const input = author.name_original_script
      ? `Name: "${author.name}"\nOriginal script: "${author.name_original_script}"`
      : `Name: "${author.name}"`;

    try {
      const raw = await callDeepSeek(namePrompt, input, 200);
      const cleaned = raw.replace(/^["'«»“”‘’]+|["'«»“”‘’]+$/g, "").trim();
      await sql`UPDATE authors SET name_es = ${cleaned} WHERE id = ${author.id}`;
      done++;
      if (done <= 20 || done % 50 === 0) {
        console.log(`  [${done}/${authors.length}] ${author.name} → ${cleaned}`);
      }
    } catch (err) {
      failed++;
      console.error(`  [ERROR ${failed}] id=${author.id} ${author.name}: ${err}`);
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n[Phase 3a done] Author names: ${done} ok, ${failed} failed`);
}

async function translateAuthorDescriptions() {
  const authors = await sql<{
    id: number;
    name: string;
    name_original_script: string | null;
    description: string;
  }[]>`
    SELECT id, name, name_original_script, description
    FROM authors
    WHERE description IS NOT NULL
      AND description != ''
      AND (description_es IS NULL OR description_es = '')
    ORDER BY id
    ${limitArg ? sql`LIMIT ${limitArg}` : sql``}
  `;

  console.log(`\n=== Phase 3b — translating ${authors.length} author descriptions to Spanish ===\n`);

  const descPrompt = `You translate biographical descriptions of historical authors into Spanish (Español Neutro — pan-Hispanic).

Rules:
- Translate into natural, fluent Spanish.
- For canonical names use established Spanish forms (Platón, Cicerón, Agustín, etc.); for modern/proper names without an established form, keep as-is.
- Preserve all factual details: dates, accomplishments, places, historical context.
- Do NOT use superlatives ("el más grande", "incomparable", "sin par", "obra maestra"). Use measured language.
- Do NOT add information not present in the source.
- Do NOT omit information present in the source.
- Use «» for embedded quotations (RAE), "" only for nested.
- Return ONLY the Spanish translation.`;

  let done = 0;
  let failed = 0;
  for (const author of authors) {
    const input = `Author: "${author.name}"${author.name_original_script ? ` (${author.name_original_script})` : ""}\nDescription to translate:\n${author.description}`;

    try {
      const esDesc = await callDeepSeek(descPrompt, input, 2500);
      await sql`UPDATE authors SET description_es = ${esDesc} WHERE id = ${author.id}`;
      done++;
      if (done <= 10 || done % 50 === 0) {
        console.log(`  [${done}/${authors.length}] ${author.name} — ${esDesc.slice(0, 80)}...`);
      }
    } catch (err) {
      failed++;
      console.error(`  [ERROR ${failed}] id=${author.id} ${author.name}: ${err}`);
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n[Phase 3b done] Author descriptions: ${done} ok, ${failed} failed`);
}

// ----------------------------------------------------------------------------
// Phase 4 — Chapter titles (batched)
// ----------------------------------------------------------------------------
const CHAPTER_BATCH_SIZE = 50;

async function translateChapterTitles() {
  // Pull all unfinished chapter titles in id order; we'll batch-translate.
  const all = await sql<{
    id: number;
    title: string;
    lang_code: string;
  }[]>`
    SELECT c.id, c.title, l.code AS lang_code
    FROM chapters c
    JOIN texts t ON c.text_id = t.id
    JOIN languages l ON t.language_id = l.id
    WHERE (c.title_es IS NULL OR c.title_es = '')
      ${shardMod !== null && shardRem !== null ? sql`AND (c.id % ${shardMod}) = ${shardRem}` : sql``}
    ORDER BY c.id
    ${limitArg ? sql`LIMIT ${limitArg}` : sql``}
  `;

  console.log(`\n=== Phase 4 — translating ${all.length} chapter titles to Spanish (batches of ${CHAPTER_BATCH_SIZE}) ===\n`);

  const systemPrompt = `You translate a batch of chapter titles for the Spanish edition of a multilingual classical text wiki. The input is a JSON object {"items": [{"index": int, "title": "...", "lang_code": "..."}]}. For EACH item, produce the Spanish form of the title.

Rules:
- If the title contains a parenthetical English part like "原文標題 (English Title)": output "原文標題 (Título Español)" — keep the original-script portion VERBATIM, translate ONLY the parenthetical English to Spanish.
- If the title has em-dash format like "Գլուխ 1 — Chapter 1": output "Գլուխ 1 — Capítulo 1" — keep original verbatim, translate only the English part.
- If the title is purely Latin-script (Italian, Latin, French, Polish, Spanish, etc.): keep as-is unless it is plain English. Plain English like "Chapter 1" becomes "Capítulo 1".
- Spanish chapter-numbering vocabulary:
    Chapter → Capítulo
    Volume → Volumen
    Book → Libro
    Part → Parte
    Section → Sección
    Canto → Canto (already Spanish)
    Letter → Carta
    Discourse → Discurso
    Sermon → Sermón
    Question → Cuestión
    Article → Artículo
    Treatise → Tratado
    Preface → Prefacio
    Introduction → Introducción
    Prologue → Prólogo
    Epilogue → Epílogo
    Appendix → Apéndice
- Use sentence case for the Spanish part.
- Do NOT remove or alter the original-script (CJK, Greek, Cyrillic, Armenian, Devanagari, etc.) portion of the title.
- Return ONLY a JSON object of the form {"items": [{"index": int, "title_es": "..."}]} — same length, same indices as the input.`;

  let totalDone = 0;
  let totalFailed = 0;

  for (let i = 0; i < all.length; i += CHAPTER_BATCH_SIZE) {
    const batch = all.slice(i, i + CHAPTER_BATCH_SIZE);
    const items = batch.map((row, idx) => ({ index: idx, title: row.title, lang_code: row.lang_code }));

    const userContent = JSON.stringify({ items });
    let parsed: { items: { index: number; title_es: string }[] } | null = null;
    let attempt = 0;
    while (attempt < 3 && !parsed) {
      attempt++;
      try {
        parsed = await callDeepSeekJson<{ items: { index: number; title_es: string }[] }>(
          systemPrompt,
          userContent,
          6000
        );
        if (!parsed.items || parsed.items.length !== batch.length) {
          console.warn(`  [batch ${i}-${i + batch.length}] length mismatch: got ${parsed.items?.length}, expected ${batch.length} (attempt ${attempt})`);
          parsed = null;
        }
      } catch (err) {
        console.warn(`  [batch ${i}-${i + batch.length}] attempt ${attempt} error: ${err}`);
        if (attempt >= 3) break;
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }

    if (!parsed) {
      console.error(`  [batch ${i}-${i + batch.length}] FAILED after 3 attempts — skipping`);
      totalFailed += batch.length;
      continue;
    }

    // Apply updates. Use a mapping from index → title_es.
    const map = new Map<number, string>();
    for (const item of parsed.items) {
      map.set(item.index, item.title_es);
    }

    let batchDone = 0;
    for (let j = 0; j < batch.length; j++) {
      const row = batch[j];
      const titleEs = map.get(j);
      if (!titleEs || typeof titleEs !== "string" || !titleEs.trim()) {
        totalFailed++;
        continue;
      }
      try {
        await sql`UPDATE chapters SET title_es = ${titleEs.trim()} WHERE id = ${row.id}`;
        batchDone++;
        totalDone++;
      } catch (err) {
        totalFailed++;
        console.error(`  [chapter id=${row.id}] update failed: ${err}`);
      }
    }

    if (i % (CHAPTER_BATCH_SIZE * 10) === 0 || i + CHAPTER_BATCH_SIZE >= all.length) {
      console.log(`  [progress] ${totalDone}/${all.length} done (${totalFailed} failed) — last batch ${batchDone}/${batch.length}`);
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n[Phase 4 done] Chapter titles: ${totalDone} ok, ${totalFailed} failed`);
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
async function main() {
  const phases = phaseArg
    ? [phaseArg]
    : ["titles", "descriptions", "authors", "chapters"];

  for (const phase of phases) {
    if (phase === "titles") {
      await translateTextTitles();
    } else if (phase === "descriptions") {
      await translateTextDescriptions();
    } else if (phase === "authors") {
      await translateAuthorNames();
      await translateAuthorDescriptions();
    } else if (phase === "chapters") {
      await translateChapterTitles();
    } else {
      console.error(`Unknown phase: ${phase}`);
      process.exit(1);
    }
  }

  await sql.end();
  console.log("\nAll phases complete.");
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
