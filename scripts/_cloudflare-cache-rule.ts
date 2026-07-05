/**
 * Cloudflare Cache Rule — make HTML responses eligible for edge caching.
 *
 * Free tier does NOT cache HTML by default (only a fixed list of static
 * extensions). The "Cache Level: aggressive" setting from
 * _cloudflare-setup.ts means "respect every cacheable signal," not "cache
 * everything." Without an explicit Cache Rule, the middleware's Cache-
 * Control headers (s-maxage=300, stale-while-revalidate=86400) are ignored
 * for HTML by Cloudflare and every chapter/text/browse page hits Vercel.
 *
 * This rule tells CF: for our two hostnames, with auth/api paths excluded,
 * cache and respect origin Cache-Control headers. Combined with the
 * middleware's path-based Cache-Control gating, the effect is:
 *   - cacheable paths (/, /texts, /[lang]/[author]/[text]/*, etc.):
 *       middleware sets s-maxage=300 → CF caches 5 min, serves stale 24h
 *   - non-cacheable paths (no header from middleware, or no-store stamped
 *     by NextAuth): CF respects, skips caching
 *
 * Token permission required: Zone | Cache Rules | Edit (already granted).
 *
 * Usage:
 *   pnpm tsx scripts/_cloudflare-cache-rule.ts    # install / verify
 *
 * Idempotent: re-running re-asserts the rule in the entrypoint ruleset.
 *
 * Halts (no destructive action) when:
 *   - Token lacks Cache Rules: Edit                  → exit 2
 *   - Ruleset contains unrelated rules                → exit 3
 *   - Any API call fails                              → exit 1
 */

import * as fs from "fs";

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const content = fs.readFileSync(".env.local", "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch {
    /* .env.local missing — fall back to process.env */
  }
  return out;
}

const env = loadEnv();
const TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? env.CLOUDFLARE_API_TOKEN;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID ?? env.CLOUDFLARE_ZONE_ID;

if (!TOKEN || !ZONE_ID) {
  console.error("ERROR: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID must be in .env.local");
  process.exit(1);
}

const API = "https://api.cloudflare.com/client/v4";
const HEADERS: Record<string, string> = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

interface CfResp<T = unknown> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
}

async function cf<T = unknown>(method: string, urlPath: string, body?: object): Promise<CfResp<T>> {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as CfResp<T>;
  if (!data.success) {
    throw new Error(`${method} ${urlPath} → ${JSON.stringify(data.errors)}`);
  }
  return data;
}

async function step2VerifyTokenScope(): Promise<void> {
  console.log("\n=== Step 2: Verify token scope (Cache Rules) ===");
  const probeRes = await fetch(
    `${API}/zones/${ZONE_ID}/rulesets/phases/http_request_cache_settings/entrypoint`,
    { headers: HEADERS },
  );
  if (probeRes.status === 401 || probeRes.status === 403) {
    const d = await probeRes.json().catch(() => ({}));
    console.error("\n  TOKEN LACKS CACHE RULES PERMISSION.");
    console.error("  Cloudflare error:", JSON.stringify(d));
    console.error("  Add `Zone | Cache Rules | Edit` to the API token, then re-run.");
    process.exit(2);
  }
  if (probeRes.status === 200) {
    console.log("  Cache Rules permission OK (existing entrypoint readable)");
  } else if (probeRes.status === 404) {
    console.log("  Cache Rules permission OK (no entrypoint yet — will POST)");
  } else {
    throw new Error(`Unexpected probe status: ${probeRes.status}`);
  }
}

interface RulesetRule {
  id?: string;
  description: string;
  expression: string;
  action: string;
  enabled?: boolean;
  action_parameters?: Record<string, unknown>;
}

interface RulesetResp {
  id: string;
  rules?: RulesetRule[];
}

interface InspectResult {
  id: string | null;
  rules: RulesetRule[];
}

async function step3InspectRuleset(): Promise<InspectResult> {
  console.log("\n=== Step 3: Inspect existing Cache Rules ruleset ===");
  const probeRes = await fetch(
    `${API}/zones/${ZONE_ID}/rulesets/phases/http_request_cache_settings/entrypoint`,
    { headers: HEADERS },
  );
  if (probeRes.status === 404) {
    console.log("  No entrypoint ruleset → will POST a new one");
    return { id: null, rules: [] };
  }
  const data = (await probeRes.json()) as { success: boolean; result?: RulesetResp; errors?: unknown };
  if (!data.success || !data.result) {
    throw new Error(`Inspect failed: ${JSON.stringify(data.errors)}`);
  }
  const rs = data.result;
  const rules = rs.rules ?? [];
  console.log(`  Ruleset ID: ${rs.id}`);
  console.log(`  Existing rules: ${rules.length}`);
  for (const r of rules) {
    console.log(`    - ${r.description} [action=${r.action}]`);
  }
  return { id: rs.id, rules };
}

const OUR_RULE_DESCRIPTION = "Cache HTML pages on edge (respect origin TTL)";

function ourRuleBody(): RulesetRule {
  return {
    description: OUR_RULE_DESCRIPTION,
    // /api/* is excluded EXCEPT /api/trpc/ — the tRPC route handler
    // (src/app/api/trpc/[trpc]/route.ts) sets an explicit cache-control on
    // every response: public+s-maxage for a whitelist of user-independent
    // read queries, no-store for everything else. respect_origin mode means
    // only the whitelisted responses are ever cached at the edge.
    expression:
      '(http.host eq "deltoi.com" or http.host eq "www.deltoi.com") and ' +
      '(not starts_with(http.request.uri.path, "/api/") or starts_with(http.request.uri.path, "/api/trpc/")) and ' +
      'not starts_with(http.request.uri.path, "/admin") and ' +
      'not starts_with(http.request.uri.path, "/profile") and ' +
      'not starts_with(http.request.uri.path, "/login") and ' +
      'not starts_with(http.request.uri.path, "/register")',
    action: "set_cache_settings",
    enabled: true,
    action_parameters: {
      cache: true,
      edge_ttl: { mode: "respect_origin" },
      browser_ttl: { mode: "respect_origin" },
    },
  };
}

async function step4Deploy(
  rulesetId: string | null,
  existingRules: RulesetRule[],
): Promise<string> {
  console.log("\n=== Step 4: Deploy Cache Rule ===");
  const otherRules = existingRules.filter((r) => r.description !== OUR_RULE_DESCRIPTION);
  if (otherRules.length > 0) {
    console.error(`  HALTING: ${otherRules.length} unrelated rule(s) in this ruleset.`);
    for (const r of otherRules) {
      console.error(`    - ${JSON.stringify(r).slice(0, 200)}`);
    }
    console.error("  Refusing to overwrite. Resolve manually, then re-run.");
    process.exit(3);
  }
  const newRules = [ourRuleBody()];
  if (rulesetId) {
    await cf<RulesetResp>("PUT", `/zones/${ZONE_ID}/rulesets/${rulesetId}`, { rules: newRules });
    console.log(`  ✓ PUT — replaced rules in ruleset ${rulesetId}`);
    return rulesetId;
  } else {
    const resp = await cf<RulesetResp>("POST", `/zones/${ZONE_ID}/rulesets`, {
      name: "deltoi cache settings",
      kind: "zone",
      phase: "http_request_cache_settings",
      rules: newRules,
    });
    console.log(`  ✓ POST — created ruleset ${resp.result.id}`);
    return resp.result.id;
  }
}

async function step5Verify(rulesetId: string): Promise<void> {
  console.log("\n=== Step 5: Verify deployment ===");
  const data = await cf<RulesetResp>(
    "GET",
    `/zones/${ZONE_ID}/rulesets/phases/http_request_cache_settings/entrypoint`,
  );
  const rs = data.result;
  const rules = rs.rules ?? [];
  console.log(`  Ruleset ID: ${rs.id}`);
  console.log(`  Rules: ${rules.length}`);
  for (const r of rules) {
    console.log(`    - ${r.description}`);
    console.log(`        action=${r.action} enabled=${r.enabled ?? "?"}`);
    console.log(`        expression: ${r.expression.slice(0, 120)}${r.expression.length > 120 ? "..." : ""}`);
    if (r.action_parameters) {
      console.log(`        params: ${JSON.stringify(r.action_parameters)}`);
    }
  }
  if (rs.id !== rulesetId) {
    console.warn(`  WARNING: read-back ruleset ID ${rs.id} differs from write-side ${rulesetId}`);
  }
  const ourRule = rules.find((r) => r.description === OUR_RULE_DESCRIPTION);
  if (!ourRule) {
    throw new Error("Verification failed: our rule not found after deploy");
  }
  if (ourRule.action !== "set_cache_settings") {
    throw new Error(`Verification failed: action is ${ourRule.action}, expected set_cache_settings`);
  }
  const params = ourRule.action_parameters as { cache?: boolean } | undefined;
  if (params?.cache !== true) {
    throw new Error("Verification failed: action_parameters.cache !== true");
  }
  console.log("  ✓ Verification passed");
}

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Cloudflare Cache Rule — HTML edge caching");
  console.log(`Zone: ${ZONE_ID}`);
  console.log("=".repeat(60));

  console.log("\n=== Step 1: (no local secrets needed for this rule) ===");
  console.log("  Skipped — this rule has no payload that needs to live in .env.local");

  await step2VerifyTokenScope();
  const inspect = await step3InspectRuleset();
  const finalId = await step4Deploy(inspect.id, inspect.rules);
  await step5Verify(finalId);

  console.log("\n=== Step 6: User-side next steps ===");
  console.log("  None for Cloudflare. The rule is live immediately on the CF edge.");
  console.log("  Observe cache hit ratio over the next few hours:");
  console.log("    Cloudflare dashboard → Analytics → Traffic → Cache Status breakdown");
  console.log("  Expected: served-by-CF share rises from ~19% toward 50-70%; origin-");
  console.log("    served share falls from ~44% commensurately.");
  console.log("  If hit ratio doesn't rise, check Cloudflare → Caching → Configuration");
  console.log("    and dashboard → Cache Rules to confirm the rule appears as expected.");
}

main().catch((e) => {
  console.error("\nFAILED:", (e as Error).message);
  process.exit(1);
});
