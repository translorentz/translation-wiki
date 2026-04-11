/**
 * Phase 0.5/0.7 smoke test — Spanish dispatcher scaffolding.
 *
 * Asserts:
 * 1. fa → es poetry routes to Mexican register header
 * 2. en → es philosophy routes to Neutro register header
 * 3. zh → es history routes to Neutro register header
 * 4. es → es throws (ES→ES forbidden)
 *
 * Run: pnpm tsx scripts/_test-es-dispatcher.ts
 */

import { buildTranslationPrompt } from "../src/server/translation/prompts";

type Case = {
  name: string;
  args: Parameters<typeof buildTranslationPrompt>[0];
  mustContain: string[];
  mustNotContain?: string[];
  expectedLabel: string;
};

// Distinctive markers from each register header.
// SPANISH_HEADER_MX contains "Español de México" and Mexican lexical examples.
// SPANISH_HEADER_NEUTRO contains "Español Neutro" and international-standard language.
const MX_MARKER = "Español de México";
const NEUTRO_MARKER = "Español Neutro";
const CURLY_RULE_MARKER = "comillas dobles curvas";
const NO_EM_DASH_MARKER = "NUNCA uses raya";
const NO_GUILLEMETS_MARKER = "NUNCA uses comillas latinas";
const ESPANOL_LABEL = "Español";

const cases: Case[] = [
  {
    name: "Persian poetry (fa) → es → Mexican register (poetry forces mx)",
    args: {
      sourceLanguage: "fa",
      targetLanguage: "es",
      paragraphs: [{ index: 0, text: "بسم الله" }],
      textType: "poetry",
      genre: "poetry",
    },
    mustContain: [
      ESPANOL_LABEL,
      CURLY_RULE_MARKER,
      NO_EM_DASH_MARKER,
      NO_GUILLEMETS_MARKER,
      MX_MARKER,
    ],
    mustNotContain: [NEUTRO_MARKER],
    expectedLabel: "MX",
  },
  {
    name: "English philosophy (en) → es → Neutro register",
    args: {
      sourceLanguage: "en",
      targetLanguage: "es",
      paragraphs: [{ index: 0, text: "Hello world." }],
      textType: "prose",
      genre: "philosophy",
    },
    mustContain: [
      ESPANOL_LABEL,
      CURLY_RULE_MARKER,
      NO_EM_DASH_MARKER,
      NO_GUILLEMETS_MARKER,
      NEUTRO_MARKER,
    ],
    mustNotContain: [MX_MARKER],
    expectedLabel: "NEUTRO",
  },
  {
    name: "Chinese history (zh) → es → Neutro register",
    args: {
      sourceLanguage: "zh",
      targetLanguage: "es",
      paragraphs: [{ index: 0, text: "你好世界" }],
      textType: "prose",
      genre: "history",
    },
    mustContain: [
      ESPANOL_LABEL,
      CURLY_RULE_MARKER,
      NO_EM_DASH_MARKER,
      NEUTRO_MARKER,
    ],
    mustNotContain: [MX_MARKER],
    expectedLabel: "NEUTRO",
  },
  {
    name: "Italian literature (it) → es → Mexican register (literature → mx)",
    args: {
      sourceLanguage: "it-literary-19c",
      targetLanguage: "es",
      paragraphs: [{ index: 0, text: "Ciao." }],
      textType: "prose",
      genre: "literature",
    },
    mustContain: [ESPANOL_LABEL, CURLY_RULE_MARKER, MX_MARKER],
    mustNotContain: [NEUTRO_MARKER],
    expectedLabel: "MX",
  },
];

function runCase(c: Case): { pass: boolean; details: string[] } {
  const details: string[] = [];
  let pass = true;

  try {
    const { system } = buildTranslationPrompt(c.args);

    for (const needle of c.mustContain) {
      if (!system.includes(needle)) {
        pass = false;
        details.push(`  FAIL: missing required marker: ${JSON.stringify(needle)}`);
      }
    }

    if (c.mustNotContain) {
      for (const needle of c.mustNotContain) {
        if (system.includes(needle)) {
          pass = false;
          details.push(`  FAIL: found forbidden marker: ${JSON.stringify(needle)}`);
        }
      }
    }

    if (pass) {
      details.push(
        `  PASS (label=${c.expectedLabel}, prompt length=${system.length} chars)`
      );
    }
  } catch (err) {
    pass = false;
    details.push(`  FAIL: unexpected throw: ${(err as Error).message}`);
  }

  return { pass, details };
}

function runEsEsThrowCase(): { pass: boolean; details: string[] } {
  const details: string[] = [];
  let pass = false;
  try {
    buildTranslationPrompt({
      sourceLanguage: "es",
      targetLanguage: "es",
      paragraphs: [{ index: 0, text: "hola" }],
    });
    details.push("  FAIL: ES→ES should throw but did not");
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("ES→ES") || msg.includes("Spanish source")) {
      pass = true;
      details.push(`  PASS: correctly threw: ${msg}`);
    } else {
      details.push(`  FAIL: threw wrong error: ${msg}`);
    }
  }
  return { pass, details };
}

async function main() {
  let failed = 0;
  let total = 0;

  console.log("=".repeat(70));
  console.log("Spanish dispatcher smoke test (Phase 0.5 + 0.7)");
  console.log("=".repeat(70));

  for (const c of cases) {
    total++;
    console.log(`\n[${total}] ${c.name}`);
    const { pass, details } = runCase(c);
    for (const line of details) console.log(line);
    if (!pass) failed++;
  }

  total++;
  console.log(`\n[${total}] ES→ES defensive throw`);
  const esRes = runEsEsThrowCase();
  for (const line of esRes.details) console.log(line);
  if (!esRes.pass) failed++;

  console.log("\n" + "=".repeat(70));
  if (failed === 0) {
    console.log(`All ${total} dispatcher tests PASSED.`);
    process.exit(0);
  } else {
    console.log(`${failed}/${total} dispatcher tests FAILED.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test harness crashed:", err);
  process.exit(2);
});
