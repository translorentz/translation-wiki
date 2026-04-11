/**
 * Translate src/i18n/locales/en.ts → src/i18n/locales/es.ts
 *
 * Phase 0.4 of Spanish Translation Rollout.
 *
 * Strategy:
 *   1. Read en.ts as a TypeScript source blob
 *   2. Read cn.ts for cross-reference (helps disambiguation)
 *   3. Ask deepseek-chat to produce an es.ts file with:
 *      - Identical structure (keys/comments preserved)
 *      - Translated string literal values in Español Neutro (RAE software localization)
 *      - All {placeholder} tokens preserved
 *      - Curly "" for any quotations (Universal Dialogue Punctuation Rule)
 *   4. Write output to src/i18n/locales/es.ts
 *
 * Supports --patch mode: given a JSON file of { key: correctedValue }, patch those
 * specific keys in the existing es.ts (used during self-recovery).
 *
 * Usage:
 *   pnpm tsx scripts/_translate-es-dictionary.ts
 *   pnpm tsx scripts/_translate-es-dictionary.ts --patch /tmp/es-fixes.json
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";

const EN_PATH = path.join(process.cwd(), "src/i18n/locales/en.ts");
const CN_PATH = path.join(process.cwd(), "src/i18n/locales/cn.ts");
const ES_PATH = path.join(process.cwd(), "src/i18n/locales/es.ts");

const SYSTEM_PROMPT = `You are a professional software localization translator. You translate UI strings (buttons, labels, tooltips, navigation, form fields) from British English into Español Neutro — the RAE-blessed, pan-Hispanic register used by major software vendors (Microsoft, Apple, Adobe) for global Spanish localization. You will translate a TypeScript locale dictionary file.

REGISTER — ESPAÑOL NEUTRO (RAE software localization conventions):
- NO regional markers. No Mexican slang, no Peninsular quirks, no Argentine voseo.
- NEVER use "vosotros" or "vuestro". Use "ustedes" / "su" for second-person plural where needed, but for most UI strings prefer impersonal constructions ("Se eliminó", "No se encontró") or infinitives ("Eliminar", "Guardar").
- Prefer neutral software lexicon:
  * "Eliminar" (NOT "Borrar") for Delete
  * "Configuración" (NOT "Ajustes") for Settings
  * "Iniciar sesión" for Sign in; "Cerrar sesión" for Sign out
  * "Guardar" for Save; "Cancelar" for Cancel; "Editar" for Edit
  * "Buscar" for Search; "Explorar" for Browse; "Cargando..." for Loading...
  * "Acerca de" for About; "Colaborar" for Contribute
  * "Contraseña" for Password; "Correo electrónico" for Email; "Nombre de usuario" for Username
  * "Capítulo" for Chapter; "Autor" for Author; "Texto" for Text; "Traducción" for Translation
  * "Texto original" for Source (in the source/translation context); "Aprobar" for Endorse
  * "Siguiente" / "Anterior" for Next / Previous
  * "Restablecer" for Reset; "Restaurar" for Restore
- Use ¿ and ¡ inversion marks for questions and exclamations.
- Preserve Spanish accents and ñ correctly.

UNIVERSAL DIALOGUE PUNCTUATION RULE (ABSOLUTE):
- If a string contains any quotation marks, use curly double "" for primary quotation and curly single '' for nested.
- NEVER use guillemets «» (even though they are traditional in Spanish — this project forbids them).
- NEVER use em-dash — as a dialogue marker.
- NEVER use 「」 『』 Japanese brackets.
- Straight quotes " and ' are acceptable only when they are part of code examples (e.g. inside JSON placeholders like \\"en\\" or \\"zh\\") — preserve those exactly as they appear in the English source.

STRUCTURAL RULES (ABSOLUTE):
1. Output a complete TypeScript file with the EXACT same structure as the English source, including all comment lines (// Header, // Language switcher, etc.). Keep the comments in English — do not translate them.
2. Translate ONLY the string literal values (the text between the opening and closing quote of each value). NEVER translate the keys (the left side of each entry like "nav.browse").
3. Preserve every key name EXACTLY as in the English source — same spelling, same casing, same punctuation.
4. Preserve ALL placeholder tokens EXACTLY: {count}, {name}, {author}, {n}, {m}, {username}, etc. They must appear verbatim in the Spanish value, in grammatically correct position.
5. Do NOT translate: "Deltoi", "Bryan Cheong", "Google", "JSON", "PDF", "EPUB", "CC BY-NC-SA 4.0", "Creative Commons BY-NC-SA", programming language codes in examples ("en", "zh", "cicero", "de-amicitia", "Marcus Tullius Cicero", etc.), and the literal strings "English", "中文 (Chinese)", "हिंदी (Hindi)" for the lang.* keys (those are self-labels in their own language — but add a new entry would be separate; for now mirror English behaviour where lang.en etc. are language self-labels).
6. Title Case discipline: where the English source uses Title Case (e.g. "Browse Texts", "Create Account"), produce Spanish text using sentence case (standard Spanish convention: "Explorar textos", "Crear cuenta"). Capitalize only the first word and proper nouns, UNLESS the English string is a single proper noun or a single word that functions as a label, in which case capitalize normally.
7. Output MUST be a valid TypeScript file. Start with:
   import type { Translations } from "./en";

   const es: Translations = {
   ...and end with:
   };

   export default es;
8. Do not add any extra keys. Do not omit any keys. Do not reorder keys.
9. Use double-quote string literals (like the English source). Escape any internal double quotes as \\".
10. Match multi-line string formatting where the English source uses multi-line strings (key on one line, indented value on next line). Keep indentation at 2 spaces.

SPECIFIC UI TRANSLATIONS (MANDATORY — use these exact renderings):
- "Browse" → "Explorar"
- "Search" → "Buscar"
- "About" → "Acerca de"
- "Contribute" → "Colaborar"
- "Sign in" → "Iniciar sesión"
- "Sign out" → "Cerrar sesión"
- "Settings" → "Configuración"
- "Edit" → "Editar"
- "Save" → "Guardar"
- "Cancel" → "Cancelar"
- "Delete" → "Eliminar"
- "Loading..." → "Cargando..."
- "Chapter" → "Capítulo"
- "Author" → "Autor"
- "Text" → "Texto"
- "Translation" → "Traducción"
- "Source" → "Texto original" (in the source-text-vs-translation context)
- "Endorse" → "Aprobar"
- "Discussion" → "Discusión"
- "History" → "Historial"
- "Profile" → "Perfil"
- "Admin" → "Administración"
- "Register" → "Registrarse" (as action) / "Registro" (as title)
- "Email" → "Correo electrónico"
- "Password" → "Contraseña"
- "Username" → "Nombre de usuario"

OUTPUT FORMAT:
Return ONLY the complete TypeScript file content. No markdown fences, no commentary, no explanation before or after. Begin with 'import' and end with 'export default es;'.`;

interface DeepSeekResponse {
  choices: Array<{ message: { content: string } }>;
}

async function callDeepSeek(
  apiKey: string,
  systemPrompt: string,
  userContent: string
): Promise<string> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as DeepSeekResponse;
  return data.choices[0]?.message?.content ?? "";
}

function stripMarkdownFences(s: string): string {
  let out = s.trim();
  if (out.startsWith("```")) {
    // Remove opening fence (may be ```ts or ```typescript)
    out = out.replace(/^```[a-zA-Z]*\s*\n/, "");
    // Remove closing fence
    out = out.replace(/\n```\s*$/, "");
  }
  return out.trim();
}

async function fullTranslate() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY not set in .env.local");
  }

  const enSource = fs.readFileSync(EN_PATH, "utf-8");
  const cnSource = fs.readFileSync(CN_PATH, "utf-8");

  const userContent = `Here is the English source file (src/i18n/locales/en.ts). Translate every string literal value to Español Neutro following the rules in the system prompt. Preserve keys, structure, comments, and placeholders exactly.

=== ENGLISH SOURCE (en.ts) ===
${enSource}

=== CHINESE REFERENCE (cn.ts, for disambiguation of ambiguous English) ===
${cnSource}

Now return the complete TypeScript file for src/i18n/locales/es.ts. Start with 'import type { Translations } from "./en";' and end with 'export default es;'.`;

  console.log("[es-dict] Calling DeepSeek with full en.ts + cn.ts reference...");
  const raw = await callDeepSeek(apiKey, SYSTEM_PROMPT, userContent);
  const content = stripMarkdownFences(raw);

  if (!content.includes("const es: Translations")) {
    throw new Error(
      `DeepSeek output missing expected structure. First 500 chars:\n${content.slice(0, 500)}`
    );
  }

  fs.writeFileSync(ES_PATH, content, "utf-8");
  console.log(`[es-dict] Wrote ${ES_PATH} (${content.length} bytes)`);
}

async function patchKeys(patchPath: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set in .env.local");

  if (!fs.existsSync(ES_PATH)) {
    throw new Error(`Cannot patch: ${ES_PATH} does not exist. Run full translate first.`);
  }

  const patches = JSON.parse(fs.readFileSync(patchPath, "utf-8")) as Record<
    string,
    { en: string; issue: string }
  >;

  const keys = Object.keys(patches);
  if (keys.length === 0) {
    console.log("[es-dict] No patches requested; nothing to do.");
    return;
  }

  console.log(`[es-dict] Patching ${keys.length} key(s): ${keys.join(", ")}`);

  const patchSystem = `You are fixing specific keys in a Spanish UI dictionary. For each key, translate the English value to Español Neutro following these rules:
- Preserve ALL {placeholder} tokens exactly
- No «» guillemets
- No — em-dash dialogue markers
- No 「」 Japanese brackets
- Curly "" for quotations only
- RAE software localization conventions
- Title Case in English → sentence case in Spanish

Return ONLY a JSON object mapping key → corrected Spanish value. No explanation, no markdown fences. Example:
{"nav.browse": "Explorar", "common.save": "Guardar"}`;

  const userContent = `Fix these keys. For each, here is the English source and the validator issue that was flagged:

${JSON.stringify(patches, null, 2)}

Return a JSON object with the corrected Spanish values.`;

  const raw = await callDeepSeek(apiKey, patchSystem, userContent);
  const cleaned = stripMarkdownFences(raw);

  let fixes: Record<string, string>;
  try {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object in response");
    fixes = JSON.parse(match[0]) as Record<string, string>;
  } catch (e) {
    throw new Error(`Failed to parse patch response: ${(e as Error).message}\nRaw:\n${raw}`);
  }

  let esSource = fs.readFileSync(ES_PATH, "utf-8");
  let applied = 0;

  for (const [key, value] of Object.entries(fixes)) {
    // Match lines like:   "key": "value",
    // or multi-line:      "key":\n    "value",
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedValue = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    // Single-line pattern
    const singleLineRe = new RegExp(
      `("${escapedKey}":\\s*)"([^"\\\\]|\\\\.)*"`,
      "g"
    );
    // Multi-line pattern (key on one line, value indented on next)
    const multiLineRe = new RegExp(
      `("${escapedKey}":\\s*\\n\\s*)"([^"\\\\]|\\\\.)*"`,
      "g"
    );

    let replaced = false;
    const newSource = esSource.replace(singleLineRe, (_, prefix) => {
      replaced = true;
      return `${prefix}"${escapedValue}"`;
    });

    if (!replaced) {
      const newSource2 = esSource.replace(multiLineRe, (_, prefix) => {
        replaced = true;
        return `${prefix}"${escapedValue}"`;
      });
      if (replaced) {
        esSource = newSource2;
        applied++;
        console.log(`[es-dict] Patched (multi-line) ${key}`);
      } else {
        console.warn(`[es-dict] Could not find key ${key} in es.ts`);
      }
    } else {
      esSource = newSource;
      applied++;
      console.log(`[es-dict] Patched ${key}`);
    }
  }

  fs.writeFileSync(ES_PATH, esSource, "utf-8");
  console.log(`[es-dict] Applied ${applied}/${keys.length} patches`);
}

async function main() {
  const args = process.argv.slice(2);
  const patchIdx = args.indexOf("--patch");
  if (patchIdx >= 0 && args[patchIdx + 1]) {
    await patchKeys(args[patchIdx + 1]);
  } else {
    await fullTranslate();
  }
}

main().catch((err) => {
  console.error("[es-dict] FATAL:", err);
  process.exit(1);
});
