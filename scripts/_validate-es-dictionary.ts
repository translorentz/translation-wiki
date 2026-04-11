/**
 * Validate src/i18n/locales/es.ts against src/i18n/locales/en.ts.
 *
 * Checks:
 *   1. Key count matches exactly (288)
 *   2. Every key in en.ts exists in es.ts (and vice versa)
 *   3. Every {placeholder} in en.ts value is preserved in es.ts value
 *   4. No « or » characters (guillemets banned)
 *   5. No paragraph-leading em-dash — (em-dash dialogue banned)
 *   6. No 「 」 『 』 Japanese brackets
 *   7. File compiles: pnpm tsc --noEmit
 *
 * Exit code:
 *   0 if all pass
 *   1 if any fail (prints failures + writes /tmp/es-dict-failures.json)
 *
 * Usage:
 *   pnpm tsx scripts/_validate-es-dictionary.ts
 */

import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";

const EN_PATH = path.join(process.cwd(), "src/i18n/locales/en.ts");
const ES_PATH = path.join(process.cwd(), "src/i18n/locales/es.ts");
const FAILURES_PATH = "/tmp/es-dict-failures.json";

interface Failure {
  key: string;
  en: string;
  es: string;
  issue: string;
}

/**
 * Extract key→value map from a locale .ts file.
 * The locale files use TypeScript object literal syntax; we evaluate a JS
 * subset by stripping imports/exports and using `new Function`.
 */
async function loadLocale(filePath: string): Promise<Record<string, string>> {
  const source = fs.readFileSync(filePath, "utf-8");

  // Strip TypeScript-specific bits: import lines, type annotations, `as const`, `export default`
  let js = source
    .replace(/^import[^\n]*\n/gm, "")
    .replace(/^export\s+type\s+[^\n]*\n/gm, "")
    .replace(/^export\s+default\s+\w+\s*;?\s*$/gm, "")
    .replace(/:\s*Translations\b/g, "") // strip type annotation
    .replace(/\}\s*as\s+const\s*;/g, "};"); // strip `as const`

  // Grab the object literal between `= {` and the final `};`
  const match = js.match(/=\s*(\{[\s\S]*?\});?\s*$/);
  if (!match) {
    // Fallback: find the outermost braces
    const firstBrace = js.indexOf("{");
    const lastBrace = js.lastIndexOf("}");
    if (firstBrace < 0 || lastBrace < 0) {
      throw new Error(`Cannot find object literal in ${filePath}`);
    }
    js = js.slice(firstBrace, lastBrace + 1);
  } else {
    js = match[1];
  }

  // Use new Function to evaluate the object literal
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function(`return (${js});`);
    const obj = fn() as Record<string, string>;
    return obj;
  } catch (e) {
    throw new Error(`Failed to parse ${filePath}: ${(e as Error).message}`);
  }
}

function extractPlaceholders(s: string): string[] {
  const matches = s.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g);
  return matches ? [...new Set(matches)] : [];
}

async function validate(): Promise<{ ok: boolean; failures: Failure[]; summary: string }> {
  const failures: Failure[] = [];

  if (!fs.existsSync(ES_PATH)) {
    return {
      ok: false,
      failures: [
        {
          key: "(file)",
          en: "",
          es: "",
          issue: `es.ts does not exist at ${ES_PATH}`,
        },
      ],
      summary: "es.ts missing",
    };
  }

  const en = await loadLocale(EN_PATH);
  const es = await loadLocale(ES_PATH);

  const enKeys = Object.keys(en);
  const esKeys = Object.keys(es);

  console.log(`[validate] en.ts keys: ${enKeys.length}`);
  console.log(`[validate] es.ts keys: ${esKeys.length}`);

  // CHECK 1 & 2: key count and key parity
  if (enKeys.length !== esKeys.length) {
    failures.push({
      key: "(count)",
      en: `${enKeys.length} keys`,
      es: `${esKeys.length} keys`,
      issue: `Key count mismatch: expected ${enKeys.length}, got ${esKeys.length}`,
    });
  }

  const enSet = new Set(enKeys);
  const esSet = new Set(esKeys);

  for (const k of enKeys) {
    if (!esSet.has(k)) {
      failures.push({
        key: k,
        en: en[k],
        es: "(missing)",
        issue: "Key present in en.ts but missing in es.ts",
      });
    }
  }
  for (const k of esKeys) {
    if (!enSet.has(k)) {
      failures.push({
        key: k,
        en: "(missing)",
        es: es[k],
        issue: "Extra key in es.ts not present in en.ts",
      });
    }
  }

  // CHECK 3: placeholders preserved
  for (const k of enKeys) {
    if (!esSet.has(k)) continue;
    const enPlaceholders = extractPlaceholders(en[k]);
    const esPlaceholders = extractPlaceholders(es[k]);
    for (const p of enPlaceholders) {
      if (!es[k].includes(p)) {
        failures.push({
          key: k,
          en: en[k],
          es: es[k],
          issue: `Missing placeholder ${p}`,
        });
      }
    }
    // Extra placeholders in es not in en
    for (const p of esPlaceholders) {
      if (!enPlaceholders.includes(p)) {
        failures.push({
          key: k,
          en: en[k],
          es: es[k],
          issue: `Extra placeholder ${p} not in en.ts`,
        });
      }
    }
  }

  // CHECK 4: no guillemets
  for (const k of esKeys) {
    if (es[k].includes("«") || es[k].includes("»")) {
      failures.push({
        key: k,
        en: en[k] ?? "",
        es: es[k],
        issue: "Contains « or » (guillemets banned by Universal Dialogue Punctuation Rule)",
      });
    }
  }

  // CHECK 5: no paragraph-leading em-dash
  for (const k of esKeys) {
    const v = es[k];
    // Match a leading —, or a — immediately after a newline (paragraph start)
    if (/^\s*—/.test(v) || /\n\s*—/.test(v)) {
      failures.push({
        key: k,
        en: en[k] ?? "",
        es: v,
        issue: "Starts with em-dash (— dialogue marker banned)",
      });
    }
  }

  // CHECK 6: no Japanese brackets
  for (const k of esKeys) {
    if (/[「」『』]/.test(es[k])) {
      failures.push({
        key: k,
        en: en[k] ?? "",
        es: es[k],
        issue: "Contains Japanese brackets 「」『』 (banned)",
      });
    }
  }

  // CHECK 7: TypeScript compilation
  console.log("[validate] Running pnpm tsc --noEmit...");
  const tsc = spawnSync("pnpm", ["tsc", "--noEmit"], {
    cwd: process.cwd(),
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (tsc.status !== 0) {
    const tscOutput = (tsc.stdout ?? "") + (tsc.stderr ?? "");
    // Filter to errors relevant to es.ts or the i18n folder
    const relevantLines = tscOutput
      .split("\n")
      .filter((l) => /i18n|locales|es\.ts|en\.ts/.test(l))
      .join("\n");
    failures.push({
      key: "(tsc)",
      en: "",
      es: "",
      issue: `TypeScript compilation failed:\n${relevantLines || tscOutput.slice(0, 2000)}`,
    });
  } else {
    console.log("[validate] tsc --noEmit passed");
  }

  const ok = failures.length === 0;
  const summary = ok
    ? `All checks passed: ${enKeys.length} keys, placeholders preserved, no banned chars, tsc clean`
    : `${failures.length} failure(s)`;

  return { ok, failures, summary };
}

async function main() {
  const result = await validate();

  console.log("\n=== VALIDATION SUMMARY ===");
  console.log(result.summary);

  if (!result.ok) {
    console.log("\n=== FAILURES ===");
    for (const f of result.failures.slice(0, 20)) {
      console.log(`\n[${f.key}] ${f.issue}`);
      if (f.en) console.log(`  EN: ${f.en.slice(0, 200)}`);
      if (f.es) console.log(`  ES: ${f.es.slice(0, 200)}`);
    }
    if (result.failures.length > 20) {
      console.log(`\n... and ${result.failures.length - 20} more failures`);
    }

    // Write fix payload for patch mode
    const fixPayload: Record<string, { en: string; issue: string }> = {};
    for (const f of result.failures) {
      if (f.key === "(count)" || f.key === "(file)" || f.key === "(tsc)") continue;
      if (!fixPayload[f.key]) {
        fixPayload[f.key] = { en: f.en, issue: f.issue };
      }
    }
    fs.writeFileSync(FAILURES_PATH, JSON.stringify(fixPayload, null, 2));
    console.log(`\n[validate] Failure payload written to ${FAILURES_PATH}`);

    process.exit(1);
  }

  console.log("\n[validate] ALL CHECKS PASSED");
  process.exit(0);
}

main().catch((err) => {
  console.error("[validate] FATAL:", err);
  process.exit(2);
});
