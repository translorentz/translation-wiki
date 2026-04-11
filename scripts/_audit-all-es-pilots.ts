import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const selection = JSON.parse(fs.readFileSync("/tmp/es-pilot-selection.json", "utf-8")) as Array<{
  slug: string;
  chapterNumber: number;
  key: string;
}>;

const results: Array<{
  key: string;
  slug: string;
  chapter: number;
  passed: boolean;
  failures: string;
}> = [];

for (const p of selection) {
  const r = spawnSync(
    "pnpm",
    ["tsx", "scripts/_audit-spanish-pilot.ts", p.slug, String(p.chapterNumber)],
    { encoding: "utf-8" }
  );
  const out = r.stdout ?? "";
  let parsed: any = null;
  try {
    const match = out.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch {}
  const passed = parsed?.passed ?? false;
  const failures = parsed?.failures?.map((f: any) => `${f.check}=${f.got}`).join("; ") ?? "parse error";
  results.push({ key: p.key, slug: p.slug, chapter: p.chapterNumber, passed, failures });
  console.log(
    `${passed ? "PASS" : "FAIL"}  ${p.key.padEnd(22)} ${p.slug.padEnd(40)} ch${p.chapterNumber}  ${failures}`
  );
}

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
console.log("");
console.log(`Summary: ${passed}/${results.length} passed, ${failed} failed`);
fs.writeFileSync("/tmp/es-pilot-final-audit.json", JSON.stringify(results, null, 2));
process.exit(failed === 0 ? 0 : 1);
