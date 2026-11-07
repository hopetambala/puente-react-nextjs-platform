/**
 * Responsive a11y sweep: every route × 320/375/768/1024/1440 × eng/spa.
 *
 * For each combination:
 *   - axe-core with WCAG 2.0/2.1/2.2 A and AA (a11y.config.cjs)
 *   - reflow: no element extends past the viewport           (1.4.10)
 *   - targets ≥ 24×24px or spaced per the exception           (2.5.8)
 *   - text spacing applied, no newly clipped text              (1.4.12)
 *   - Tab: skip link first, every stop draws an outline        (2.4.1, 2.4.7)
 *
 * The backend is the synthetic world (e2e/lib/synthetic-world.mjs): no login,
 * no staging data, nothing written, so the sweep is deterministic and can gate
 * CI without credentials.
 *
 * KNOWN FAILURES. e2e/a11y-known-failures.json lists, per "<route> @ <width>",
 * the rules that failed when the gate went in (PR 1a). A failure not listed
 * fails its check; listed failures that no longer occur are printed as fixed.
 * Each PR in docs/responsive-a11y-overhaul.md shrinks the list; PR 7 empties it.
 *
 *   node e2e/run-e2e.mjs responsive-a11y                 # the gate
 *   node e2e/suites/responsive-a11y.mjs --update         # rewrite the list after fixing things
 *   E2E_A11Y_ROUTES=/quick-start E2E_A11Y_WIDTHS=375 node e2e/suites/responsive-a11y.mjs
 *
 * `--update` refuses to add entries: a new failure is fixed, not recorded.
 * Every run writes the full findings, element by element, to
 * .e2e-artifacts/responsive-a11y-report.json.
 */
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import a11yConfig from '../../a11y.config.cjs';
import {
  focus, reflow, settle, targetSize, textSpacing,
} from '../lib/a11y-checks.mjs';
import {
  compareToAllowlist, countsByRoute, CUSTOM_RULES, keyOf, toAllowlist, total,
} from '../lib/a11y-gate-lib.mjs';
import { ARTIFACTS, BASE, openSession } from '../lib/harness.mjs';
import { ROUTES } from '../lib/routes.mjs';
import { installWorld } from '../lib/synthetic-world.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ALLOWLIST_PATH = join(HERE, '..', 'a11y-known-failures.json');
const REPORT_PATH = join(ARTIFACTS, 'responsive-a11y-report.json');

const { WCAG_TAGS, SWEEP_WIDTHS, LOCALES } = a11yConfig;
const list = (env) => (env ? env.split(',').map((s) => s.trim()).filter(Boolean) : null);
const routes = list(process.env.E2E_A11Y_ROUTES) ?? ROUTES.map((r) => r.path);
const widths = (list(process.env.E2E_A11Y_WIDTHS) ?? SWEEP_WIDTHS).map(Number);
const locales = list(process.env.E2E_A11Y_LOCALES) ?? Object.keys(LOCALES);
const filtered = routes.length !== ROUTES.length || widths.length !== SWEEP_WIDTHS.length
  || locales.length !== Object.keys(LOCALES).length;
const update = process.argv.includes('--update');
const seed = process.argv.includes('--seed'); // the first baseline only (PR 1a)

const allowlistFile = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
const allowlist = allowlistFile.failures;

/** Run every check on the current page. Returns { rules: [...], details: [...] }. */
async function audit(page) {
  const axe = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const details = axe.violations.map((v) => ({
    rule: v.id,
    detail: `${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}${v.nodes.length > 3 ? ` (+${v.nodes.length - 3})` : ''}`,
  }));
  details.push(...await reflow(page));
  details.push(...await targetSize(page));
  details.push(...await focus(page));
  details.push(...await textSpacing(page)); // last: it restyles the page
  return { rules: [...new Set(details.map((d) => d.rule))], details };
}

(async () => {
  const found = {};
  const report = {};
  const visited = [];
  let anyFailed = false;

  for (const locale of locales) {
    const s = await openSession({
      suite: `responsive-a11y-${locale}`,
      locale,
      beforePage: installWorld,
      // The backend is stubbed, so console noise is about the stubs, not the
      // page. Reported, never failed; this suite judges accessibility.
      owned: [],
    });
    console.log(`\n[${locale.toUpperCase()}] ${routes.length} routes × ${widths.join('/')}px`);

    for (const route of routes) {
      for (const width of widths) {
        const key = keyOf(route, width);
        if (!visited.includes(key)) visited.push(key);
        await s.setViewport(width);
        try {
          // A cold route can take a minute to compile under `next dev`.
          await s.page.goto(`${BASE}${s.localePath(route)}`, { timeout: 120000, waitUntil: 'domcontentloaded' });
          const { stillLoading } = await settle(s.page);
          if (stillLoading) console.log(`      (${route} @ ${width} ${locale} still shows a loading state; judged as is)`);
          const { rules, details } = await audit(s.page);
          found[key] = [...new Set([...(found[key] ?? []), ...rules])];
          report[`${key} ${locale}`] = { url: s.page.url(), stillLoading, details };
          const known = allowlist[key] ?? [];
          const added = rules.filter((r) => !known.includes(r));
          const pass = await s.check(`${route} @ ${width} ${locale}`, added.length === 0,
            added.length ? `NEW: ${added.join(', ')}` : `${rules.length} known`);
          if (!pass) {
            anyFailed = true;
            details.filter((d) => added.includes(d.rule)).slice(0, 6).forEach((d) => console.log(`      ${d.rule}: ${d.detail}`));
          }
        } catch (err) {
          anyFailed = true;
          await s.check(`${route} @ ${width} ${locale}`, false, `crashed: ${String(err).split('\n')[0].slice(0, 140)}`);
        }
      }
    }
    await s.finish();
  }

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 1));
  const { added, fixed } = compareToAllowlist(found, allowlist, filtered ? visited : undefined);

  console.log(`\n${'='.repeat(64)}\nKNOWN FAILURES  (e2e/a11y-known-failures.json)\n${'='.repeat(64)}`);
  if (fixed.length) {
    console.log(`\nFIXED (${fixed.length}) — run \`node e2e/suites/responsive-a11y.mjs --update\` and commit:`);
    fixed.forEach(({ key, rule }) => console.log(`  ✓ ${key}  ${rule}`));
  }
  if (added.length) {
    console.log(`\nNEW (${added.length}):`);
    added.forEach(({ key, rule }) => console.log(`  ✗ ${key}  ${rule}  ${CUSTOM_RULES[rule] ?? ''}`));
  }
  const counts = countsByRoute(allowlist);
  console.log(`\nAllowlist: ${total(allowlist)} entries${filtered ? ' (filtered run: only visited keys judged)' : ''}`);
  Object.entries(counts).forEach(([route, n]) => console.log(`  ${String(n).padStart(4)}  ${route}`));
  console.log(`\nFull findings: ${REPORT_PATH}`);

  if (update) {
    if (filtered) {
      console.error('\n--update needs a full run (no E2E_A11Y_* filters).');
      process.exit(1);
    }
    if (added.length && !seed) {
      console.error('\nRefusing to update: the list only shrinks. Fix the NEW failures above.');
      process.exit(1);
    }
    const next = toAllowlist(found);
    writeFileSync(ALLOWLIST_PATH, `${JSON.stringify({
      ...allowlistFile, total: total(next), byRoute: countsByRoute(next), failures: next,
    }, null, 2)}\n`);
    console.log(`\ne2e/a11y-known-failures.json: ${total(allowlist)} → ${total(next)} entries.`);
    process.exit(0);
  }
  process.exit(anyFailed ? 1 : 0);
})();
