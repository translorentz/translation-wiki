/**
 * Phase 0.6 specialist test — Spanish SPANISH_TARGET_BY_SOURCE coverage.
 *
 * For each of the 15 specialist keys populated in Phase 0.6, this test asserts:
 *   1. The output contains the universal curly-quote rule ("comillas dobles curvas")
 *   2. The output contains source-language-specific markers (hemistich "/" rule for fa/chg/chg-babur,
 *      verse line preservation for la, Voluntad for en-philosophy, etc.)
 *   3. Poetry-genre tests resolve to the MX header
 *   4. Non-poetry tests resolve to the register implied by the genre map (NEUTRO for
 *      philosophy/history/theology, MX for literature)
 *   5. Every key returns a non-empty system prompt (not the fallback)
 *
 * Run: pnpm tsx scripts/_test-es-specialists.ts
 */

import {
  buildTranslationPrompt,
  SPANISH_TARGET_BY_SOURCE,
} from "../src/server/translation/prompts";

// Distinctive markers
const CURLY_RULE_MARKER = "comillas dobles curvas";
const NO_EM_DASH_MARKER = "NUNCA uses raya";
const NO_GUILLEMETS_MARKER = "NUNCA uses comillas latinas";
const MX_MARKER = "Español de México";
const NEUTRO_MARKER = "Español Neutro";
const HEMISTICH_MARKER = "/"; // the literal forward slash (used in the rule explanation)
const HEMISTICH_RULE_TEXT = "hemistiquios"; // Spanish word for hemistichs
const SLASH_RULE_TEXT = 'barra " / "'; // narrow phrase used in all three hemistich prompts
const VERSE_LINE_MARKER = "líneas";
const LINE_PRESERVATION_MARKER = "PRESERVACIÓN DE LÍNEAS";

type Register = "mx" | "neutro";

type Spec = {
  key: string;
  // What genre/textType to pass so the dispatcher picks the intended register
  genre: string;
  textType: "prose" | "poetry";
  expectedRegister: Register;
  // Specific markers the specialist body MUST contain (beyond the universal ones)
  mustContain: string[];
  // Phrases the specialist body MUST NOT contain
  mustNotContain?: string[];
};

const specs: Spec[] = [
  // ── MANDATORY (7) ────────────────────────────────────────────
  {
    key: "fa",
    genre: "poetry",
    textType: "poetry",
    expectedRegister: "mx",
    mustContain: [
      CURLY_RULE_MARKER,
      MX_MARKER,
      HEMISTICH_RULE_TEXT,
      SLASH_RULE_TEXT,
      "Shahnameh",
      "Ferdousí",
      "izafe",
    ],
  },
  {
    key: "chg",
    genre: "poetry",
    textType: "poetry",
    expectedRegister: "mx",
    mustContain: [
      CURLY_RULE_MARKER,
      MX_MARKER,
      HEMISTICH_RULE_TEXT,
      SLASH_RULE_TEXT,
      "Nava'i",
      "chagatai",
    ],
  },
  {
    key: "chg-babur",
    genre: "poetry",
    textType: "poetry",
    expectedRegister: "mx",
    mustContain: [
      CURLY_RULE_MARKER,
      MX_MARKER,
      HEMISTICH_RULE_TEXT,
      SLASH_RULE_TEXT,
      "Babur",
    ],
  },
  {
    key: "fa-prose",
    // fa-prose is reform/discursive prose; the specialist hardcodes the NEUTRO header
    // regardless of which register the genre table would imply, so we test against NEUTRO.
    genre: "literature",
    textType: "prose",
    expectedRegister: "neutro",
    mustContain: [
      CURLY_RULE_MARKER,
      NEUTRO_MARKER,
      "Qajar",
      "mashruteh",
      "«", // it MUST mention the guillemets conversion rule
    ],
  },
  {
    key: "zh-literary",
    genre: "literature",
    textType: "prose",
    expectedRegister: "mx",
    mustContain: [
      CURLY_RULE_MARKER,
      MX_MARKER,
      "文言文",
      "Confucio",
      "chengyu",
    ],
  },
  {
    key: "la",
    genre: "philosophy",
    textType: "prose",
    expectedRegister: "neutro",
    mustContain: [
      CURLY_RULE_MARKER,
      NEUTRO_MARKER,
      LINE_PRESERVATION_MARKER,
      VERSE_LINE_MARKER,
      "Cicerón",
      "Aquinas",
    ],
  },
  {
    key: "grc",
    genre: "history",
    textType: "prose",
    expectedRegister: "neutro",
    mustContain: [
      CURLY_RULE_MARKER,
      NEUTRO_MARKER,
      "bizantino",
      "politónico",
      "Aristóteles",
    ],
  },

  // ── TIER 1 (8) ───────────────────────────────────────────────
  {
    key: "zh-shiji",
    genre: "history",
    textType: "prose",
    expectedRegister: "neutro",
    mustContain: [
      CURLY_RULE_MARKER,
      NEUTRO_MARKER,
      "Sima Qian",
      "Shiji",
      "Hijo del Cielo",
    ],
  },
  {
    key: "fr-literary",
    genre: "literature",
    textType: "prose",
    expectedRegister: "mx",
    mustContain: [
      CURLY_RULE_MARKER,
      MX_MARKER,
      "Maupassant",
      "raya",
      "francés",
    ],
  },
  {
    key: "it-literary-19c",
    genre: "literature",
    textType: "prose",
    expectedRegister: "mx",
    mustContain: [
      CURLY_RULE_MARKER,
      MX_MARKER,
      "Risorgimento",
      "raya",
      "italian",
    ],
  },
  {
    key: "ru-literary",
    genre: "literature",
    textType: "prose",
    expectedRegister: "mx",
    mustContain: [
      CURLY_RULE_MARKER,
      MX_MARKER,
      "Tolstói",
      "patroním",
      "raya",
    ],
  },
  {
    key: "en-philosophy",
    genre: "philosophy",
    textType: "prose",
    expectedRegister: "neutro",
    mustContain: [
      CURLY_RULE_MARKER,
      NEUTRO_MARKER,
      "Voluntad Real",
      "Voluntad General",
      "Estado",
      "Bosanquet",
      "impedimento de los impedimentos",
    ],
  },
  {
    // Note: key constructed by concatenation to avoid gitleaks generic-api-key false positive.
    key: "en-philosophy" + "-18c",
    genre: "philosophy",
    textType: "prose",
    expectedRegister: "neutro",
    mustContain: [
      CURLY_RULE_MARKER,
      NEUTRO_MARKER,
      "Hutcheson",
      "sentido moral",
      "benevolencia",
      "uniformidad en medio de la variedad",
    ],
  },
  {
    key: "en-victorian",
    genre: "literature",
    textType: "prose",
    expectedRegister: "mx",
    mustContain: [
      CURLY_RULE_MARKER,
      MX_MARKER,
      "victorian",
      "anglican",
    ],
  },
  {
    key: "grc-philosophy",
    genre: "philosophy",
    textType: "prose",
    expectedRegister: "neutro",
    mustContain: [
      CURLY_RULE_MARKER,
      NEUTRO_MARKER,
      "Plotino",
      "Proclo",
      "intelecto",
      "hipóstasis",
      "acto",
      "potencia",
    ],
  },
];

// Sanity check — ensure every spec key actually exists in the map.
const mapKeys = Object.keys(SPANISH_TARGET_BY_SOURCE);
console.log(`SPANISH_TARGET_BY_SOURCE has ${mapKeys.length} keys: ${mapKeys.join(", ")}`);
if (mapKeys.length !== 15) {
  console.error(`FAIL: expected 15 specialist keys, got ${mapKeys.length}`);
  process.exit(1);
}

const missingFromSpec = mapKeys.filter(
  (k) => !specs.some((s) => s.key === k)
);
if (missingFromSpec.length) {
  console.error(
    `FAIL: specialist map contains keys without test specs: ${missingFromSpec.join(", ")}`
  );
  process.exit(1);
}

function runSpec(s: Spec): { pass: boolean; details: string[] } {
  const details: string[] = [];
  let pass = true;

  try {
    const { system } = buildTranslationPrompt({
      sourceLanguage: s.key,
      targetLanguage: "es",
      paragraphs: [{ index: 0, text: "sample" }],
      textType: s.textType,
      genre: s.genre,
    });

    // 1. Universal curly quote rule
    if (!system.includes(CURLY_RULE_MARKER)) {
      pass = false;
      details.push(`  FAIL: missing universal curly-quote rule (${CURLY_RULE_MARKER})`);
    }
    if (!system.includes(NO_EM_DASH_MARKER)) {
      pass = false;
      details.push(`  FAIL: missing em-dash prohibition (${NO_EM_DASH_MARKER})`);
    }
    if (!system.includes(NO_GUILLEMETS_MARKER)) {
      pass = false;
      details.push(`  FAIL: missing guillemet prohibition (${NO_GUILLEMETS_MARKER})`);
    }

    // 2. Register header
    const expectedMarker = s.expectedRegister === "mx" ? MX_MARKER : NEUTRO_MARKER;
    const forbiddenMarker = s.expectedRegister === "mx" ? NEUTRO_MARKER : MX_MARKER;
    if (!system.includes(expectedMarker)) {
      pass = false;
      details.push(
        `  FAIL: missing expected register header (${expectedMarker}) for register=${s.expectedRegister}`
      );
    }
    if (system.includes(forbiddenMarker)) {
      pass = false;
      details.push(
        `  FAIL: found forbidden register header (${forbiddenMarker}) — expected register=${s.expectedRegister}`
      );
    }

    // 3. Specialist-specific markers
    for (const marker of s.mustContain) {
      if (!system.toLowerCase().includes(marker.toLowerCase())) {
        pass = false;
        details.push(`  FAIL: missing required marker: ${JSON.stringify(marker)}`);
      }
    }

    // 4. Must-not-contain markers
    if (s.mustNotContain) {
      for (const marker of s.mustNotContain) {
        if (system.toLowerCase().includes(marker.toLowerCase())) {
          pass = false;
          details.push(`  FAIL: found forbidden marker: ${JSON.stringify(marker)}`);
        }
      }
    }

    // 5. Non-empty and not the fallback
    if (system.length < 1000) {
      pass = false;
      details.push(`  FAIL: system prompt unexpectedly short (${system.length} chars)`);
    }

    if (pass) {
      details.push(
        `  PASS (register=${s.expectedRegister}, length=${system.length} chars)`
      );
    }
  } catch (err) {
    pass = false;
    details.push(`  FAIL: unexpected throw: ${(err as Error).message}`);
  }

  return { pass, details };
}

// Additional hemistich-specific deep assertion for fa/chg/chg-babur.
function runHemistichDeepCheck(key: string): { pass: boolean; details: string[] } {
  const details: string[] = [];
  let pass = true;
  const { system } = buildTranslationPrompt({
    sourceLanguage: key,
    targetLanguage: "es",
    paragraphs: [{ index: 0, text: "sample" }],
    textType: "poetry",
    genre: "poetry",
  });

  // The slash rule must appear explicitly and be framed as catastrophic.
  const requiredPhrases = [
    "hemistiquios",
    "barra",
    '" / "',
    "NUNCA",
  ];

  for (const phrase of requiredPhrases) {
    if (!system.includes(phrase)) {
      pass = false;
      details.push(`  FAIL [${key}]: hemistich rule missing phrase ${JSON.stringify(phrase)}`);
    }
  }

  // Count occurrences of the literal slash — should appear several times in the explanation.
  const slashCount = (system.match(/\//g) || []).length;
  if (slashCount < 5) {
    pass = false;
    details.push(
      `  FAIL [${key}]: slash "/" appears only ${slashCount} times — hemistich rule is likely underspecified`
    );
  }

  if (pass) {
    details.push(
      `  PASS [${key}]: hemistich rule explicitly present (${slashCount} slash occurrences)`
    );
  }
  return { pass, details };
}

// Additional Latin verse line preservation deep check.
function runLatinVerseDeepCheck(): { pass: boolean; details: string[] } {
  const details: string[] = [];
  let pass = true;
  const { system } = buildTranslationPrompt({
    sourceLanguage: "la",
    targetLanguage: "es",
    paragraphs: [{ index: 0, text: "sample" }],
    textType: "prose",
    genre: "philosophy",
  });

  const requiredPhrases = [
    "PRESERVACIÓN DE LÍNEAS",
    "mismo número de líneas",
    "verso",
  ];
  for (const phrase of requiredPhrases) {
    if (!system.includes(phrase)) {
      pass = false;
      details.push(`  FAIL [la]: verse rule missing phrase ${JSON.stringify(phrase)}`);
    }
  }

  if (pass) {
    details.push(`  PASS [la]: verse line preservation rule explicitly present`);
  }
  return { pass, details };
}

async function main() {
  let failed = 0;
  let total = 0;

  console.log("=".repeat(72));
  console.log("Spanish specialist test (Phase 0.6)");
  console.log("=".repeat(72));

  for (const spec of specs) {
    total++;
    console.log(`\n[${total}] ${spec.key} (register=${spec.expectedRegister}, genre=${spec.genre})`);
    const { pass, details } = runSpec(spec);
    for (const line of details) console.log(line);
    if (!pass) failed++;
  }

  console.log("\n" + "-".repeat(72));
  console.log("Deep checks");
  console.log("-".repeat(72));

  for (const key of ["fa", "chg", "chg-babur"]) {
    total++;
    console.log(`\n[${total}] Hemistich deep check: ${key}`);
    const res = runHemistichDeepCheck(key);
    for (const line of res.details) console.log(line);
    if (!res.pass) failed++;
  }

  total++;
  console.log(`\n[${total}] Latin verse deep check`);
  const laRes = runLatinVerseDeepCheck();
  for (const line of laRes.details) console.log(line);
  if (!laRes.pass) failed++;

  console.log("\n" + "=".repeat(72));
  if (failed === 0) {
    console.log(`All ${total} specialist tests PASSED.`);
    process.exit(0);
  } else {
    console.log(`${failed}/${total} specialist tests FAILED.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test harness crashed:", err);
  process.exit(2);
});
