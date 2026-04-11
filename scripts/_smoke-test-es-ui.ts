/**
 * Smoke test for Spanish UI locale (Phase 0.2 + 0.3).
 *
 * Spawns `pnpm dev` on a sandbox port, polls until ready, then curls the
 * key locale routes and asserts:
 *  - /es       → 200, lang="es", Spanish dictionary string, hreflang alt
 *  - /cn       → 200, lang="zh-Hans"
 *  - /         → 200, lang="en"
 *  - /hi       → 30x (Hindi delinked, redirects to /)
 */

import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const PORT = 3000;
const BASE = `http://localhost:${PORT}`;
const READY_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 1_000;

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

async function waitForReady(proc: ChildProcess): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) {
      throw new Error(`dev server exited early with code ${proc.exitCode}`);
    }
    try {
      const res = await fetch(`${BASE}/`, { redirect: "manual" });
      if (res.status >= 200 && res.status < 500) {
        return;
      }
    } catch {
      // not yet listening
    }
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error(`dev server did not become ready within ${READY_TIMEOUT_MS}ms`);
}

async function fetchText(path: string): Promise<{ status: number; body: string; location: string | null }> {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const body = res.status >= 200 && res.status < 300 ? await res.text() : "";
  return { status: res.status, body, location: res.headers.get("location") };
}

async function main(): Promise<number> {
  console.log(`[smoke] spawning \`pnpm dev\` on port ${PORT}`);
  const proc = spawn("pnpm", ["next", "dev", "--port", String(PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  proc.stdout?.on("data", (chunk) => {
    const line = chunk.toString().trim();
    if (line) console.log(`[dev] ${line}`);
  });
  proc.stderr?.on("data", (chunk) => {
    const line = chunk.toString().trim();
    if (line) console.error(`[dev] ${line}`);
  });

  const checks: Check[] = [];
  try {
    await waitForReady(proc);
    console.log(`[smoke] dev server ready at ${BASE}`);

    // 1) /es should return 200 with <html lang="es"
    {
      const { status, body } = await fetchText("/es");
      const hasLang = body.includes('<html lang="es"');
      const hasSpanishString = body.includes("Explorar"); // from es.ts "nav.browse" / "home.browseTexts"
      const hasAltLink = body.includes('hrefLang="es"');
      checks.push({
        name: "GET /es",
        ok: status === 200 && hasLang && hasSpanishString && hasAltLink,
        detail: `status=${status} lang=${hasLang} spanish=${hasSpanishString} hreflang=${hasAltLink}`,
      });
    }

    // 2) /cn should return 200 with <html lang="zh-Hans"
    {
      const { status, body } = await fetchText("/cn");
      const hasLang = body.includes('<html lang="zh-Hans"');
      checks.push({
        name: "GET /cn",
        ok: status === 200 && hasLang,
        detail: `status=${status} lang=${hasLang}`,
      });
    }

    // 3) / should return 200 with <html lang="en"
    {
      const { status, body } = await fetchText("/");
      const hasLang = body.includes('<html lang="en"');
      checks.push({
        name: "GET /",
        ok: status === 200 && hasLang,
        detail: `status=${status} lang=${hasLang}`,
      });
    }

    // 4) /hi should return 30x (Hindi delinked)
    {
      const { status, location } = await fetchText("/hi");
      checks.push({
        name: "GET /hi",
        ok: status >= 300 && status < 400,
        detail: `status=${status} location=${location}`,
      });
    }
  } catch (err) {
    console.error("[smoke] error during checks:", err);
    checks.push({ name: "dev-ready", ok: false, detail: String(err) });
  } finally {
    console.log("[smoke] killing dev server");
    proc.kill("SIGTERM");
    // give it up to 5s to shut down
    const shutDeadline = Date.now() + 5000;
    while (proc.exitCode === null && Date.now() < shutDeadline) {
      await delay(200);
    }
    if (proc.exitCode === null) {
      proc.kill("SIGKILL");
    }
  }

  console.log("\n[smoke] results:");
  let allOk = true;
  for (const c of checks) {
    const badge = c.ok ? "PASS" : "FAIL";
    console.log(`  [${badge}] ${c.name} — ${c.detail}`);
    if (!c.ok) allOk = false;
  }

  return allOk ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("[smoke] fatal:", err);
    process.exit(1);
  });
