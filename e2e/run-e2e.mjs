#!/usr/bin/env node
/**
 * The one entry point for E2E. Runs suites, repeats them, and gives a verdict
 * on whether they are stable enough to be trusted.
 *
 *   node e2e/run-e2e.mjs                 # all suites, 1 run
 *   node e2e/run-e2e.mjs --repeat 3      # stability gate
 *   node e2e/run-e2e.mjs craft --repeat 3
 *
 * Why a gate: Shopify's mobile suite degraded until it blocked more good PRs
 * than bad ones and had to be pulled from CI. A single intermittent check is
 * the disease, not an acceptable rate of it — it is what teaches a reader to
 * re-run instead of read. So `--repeat` is how a suite earns the right to be
 * believed, and the verdict is deliberately unforgiving.
 */
import { execFileSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { parseRunArgs, summarizeRuns, verdict } from './lib/harness-lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SUITES = {
  dashboard: 'suites/dashboard.mjs',
  craft: 'suites/craft.mjs',
  features: 'suites/dashboard-features.mjs',
  'sign-in': 'suites/sign-in.mjs',
  'sign-up': 'suites/sign-up.mjs',
  'form-create': 'suites/form-create.mjs',
  'data-export': 'suites/data-export.mjs',
  'form-edit': 'suites/form-edit.mjs',
};

const { suites: wanted, repeat } = parseRunArgs(process.argv.slice(2));
const names = wanted.length ? wanted : Object.keys(SUITES);

const unknown = names.filter((n) => !SUITES[n]);
if (unknown.length) {
  console.error(`Unknown suite(s): ${unknown.join(', ')}. Available: ${Object.keys(SUITES).join(', ')}`);
  process.exit(2);
}

// A dev server that is not up produces a wall of connection errors that look
// like product bugs. Fail fast with the actual instruction instead.
try {
  execFileSync('node', ['-e', `fetch('${process.env.E2E_BASE ?? 'http://localhost:3000'}').then(()=>process.exit(0),()=>process.exit(1))`], { stdio: 'ignore' });
} catch {
  console.error('Dev server is not responding. Start it first (preview_start / yarn dev).');
  console.error('Note: `yarn build` wipes .next under a running dev server — build last, or restart after.');
  process.exit(2);
}

const tmp = mkdtempSync(join(tmpdir(), 'puente-e2e-'));
const bySuite = {};
let anyFailed = false;

for (const name of names) {
  bySuite[name] = [];
  for (let i = 1; i <= repeat; i += 1) {
    const jsonPath = join(tmp, `${name}-${i}.json`);
    console.log(`\n${'#'.repeat(64)}\n# ${name}  (run ${i}/${repeat})\n${'#'.repeat(64)}`);
    try {
      execFileSync('node', [join(HERE, SUITES[name])], {
        stdio: 'inherit',
        env: { ...process.env, E2E_JSON: jsonPath },
      });
    } catch {
      anyFailed = true;
    }
    if (existsSync(jsonPath)) bySuite[name].push(JSON.parse(readFileSync(jsonPath, 'utf8')));
    else bySuite[name].push({ results: {} }); // a crashed run is not a passing run
  }
}

console.log(`\n${'='.repeat(64)}\nSTABILITY\n${'='.repeat(64)}`);
let allPromotable = true;
for (const name of names) {
  const summary = summarizeRuns(bySuite[name]);
  const v = verdict(summary);
  allPromotable = allPromotable && v.promotable;
  console.log(`\n${name}: ${summary.stable.length}/${summary.names.length} checks stable over ${summary.runs} run(s)`);
  if (summary.failed.length) console.log(`  FAILING : ${summary.failed.join(', ')}`);
  if (summary.flaky.length) {
    summary.flaky.forEach((n) => console.log(`  FLAKY   : ${n} (${Math.round(summary.rates[n] * 100)}%)`));
  }
  console.log(`  verdict : ${v.promotable ? 'PROMOTABLE' : 'NOT promotable'} — ${v.reason}`);
}

rmSync(tmp, { recursive: true, force: true });

if (repeat < 2) {
  console.log('\nRun with --repeat 3 before trusting a suite, or before putting it in a blocking path.');
}
process.exit(anyFailed || !allPromotable ? 1 : 0);
