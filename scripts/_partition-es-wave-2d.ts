// Partition Wave 2D into 5 roughly equal-paragraph worker batches.
// Each batch is a list of text slugs; the orchestrator runs translate-batch.ts
// per slug sequentially inside the worker.

import fs from "fs";

type WaveEntry = {
  slug: string;
  language: string;
  genre: string;
  wave: string;
  chaptersNeedingEs: number;
  paragraphsNeedingEs: number;
};

const json = JSON.parse(fs.readFileSync("/tmp/es-corpus-survey.json", "utf-8")) as {
  wave2DTexts: WaveEntry[];
};

// Sort descending by paragraph count (greedy bin-packing)
const sorted = [...json.wave2DTexts].sort((a, b) => b.paragraphsNeedingEs - a.paragraphsNeedingEs);

const NUM_BATCHES = 5;
const batches: WaveEntry[][] = Array.from({ length: NUM_BATCHES }, () => []);
const batchTotals = new Array(NUM_BATCHES).fill(0);

// Longest Processing Time (LPT) greedy: assign each item to the currently smallest bin
for (const t of sorted) {
  let minIdx = 0;
  for (let i = 1; i < NUM_BATCHES; i++) {
    if (batchTotals[i] < batchTotals[minIdx]) minIdx = i;
  }
  batches[minIdx]!.push(t);
  batchTotals[minIdx] += t.paragraphsNeedingEs;
}

const result = batches.map((b, i) => ({
  workerId: `W${i + 1}`,
  textCount: b.length,
  chapterTotal: b.reduce((s, t) => s + t.chaptersNeedingEs, 0),
  paragraphTotal: b.reduce((s, t) => s + t.paragraphsNeedingEs, 0),
  slugs: b.map((t) => t.slug),
}));

fs.writeFileSync("/tmp/es-wave-2d-partition.json", JSON.stringify(result, null, 2));

console.log("Wave 2D partition (5 workers, LPT-balanced by paragraph count):");
for (const r of result) {
  console.log(
    `  ${r.workerId}: ${r.textCount.toString().padStart(3)} texts, ${r.chapterTotal.toString().padStart(5)} ch, ${r.paragraphTotal.toString().padStart(7)} paras`
  );
}

let totalCh = 0;
let totalPara = 0;
for (const r of result) {
  totalCh += r.chapterTotal;
  totalPara += r.paragraphTotal;
}
console.log(`  TOTAL: ${totalCh} chapters, ${totalPara} paragraphs`);
console.log("\nWrote /tmp/es-wave-2d-partition.json");
