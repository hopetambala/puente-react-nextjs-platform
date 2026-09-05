/**
 * The Puente E2E harness.
 *
 * Read e2e/README.md before writing a suite against this.
 *
 * The design goal, taken from Shopify's mobile E2E post-mortem: make the
 * reliable test the easiest one to write, and make every shortcut visible.
 * Concretely —
 *
 *   1. Every step carries an assertion. `go`, `click`, `type` all take an
 *      `expect`, because a step that changes the screen without declaring what
 *      the screen should then show is where a confusing downstream failure is
 *      born.
 *   2. Waits are conditional. There is no bare sleep; `UNSAFE_pause` exists,
 *      demands a reason, and is counted in the run summary.
 *   3. Selectors are behavioural. `role`/`text`/`label` query the accessibility
 *      tree — what a coordinator can actually find. `UNSAFE_testId` demands a
 *      reason and is counted.
 *   4. Failures self-diagnose. Any failed check or thrown step captures a
 *      screenshot, the visible text, and the recent console — so the next step
 *      is reading, not writing a throwaway isolation script.
 *
 * Pure logic lives in harness-lib.mjs and is unit-tested.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { describeSelector, extractAppId, mayWrite, summarizeRuns, verdict } from './harness-lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = process.env.E2E_ARTIFACTS ?? join(ROOT, '.e2e-artifacts');
export const BASE = process.env.E2E_BASE ?? 'http://localhost:3000';

/** Surfaces a suite is allowed to fail on. Errors elsewhere are reported, not failed. */
const DEFAULT_OWNED = [/quick-start/, /data-curation/];

export { summarizeRuns, verdict, mayWrite };

export async function openSession({
  suite,
  owned = DEFAULT_OWNED,
  // Warnings this suite's surfaces already emit on master. Declared ONCE for
  // the whole session rather than wrapped around each phase — scoping them
  // per-block meant a warning fired during setup slipped past the wrapper and
  // failed the run. Listed explicitly, never a blanket mute, so a NEW error
  // still fails.
  expectedErrors = null,
  viewport = { width: 1440, height: 900 },
  deviceScaleFactor = 1,
} = {}) {
  mkdirSync(OUT, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport, deviceScaleFactor });
  const page = await ctx.newPage();

  const results = {};
  const order = [];
  const consoleLog = [];
  const foreign = [];
  const unsafeUses = [];

  // "state update on an unmounted component" fires when a PREVIOUS page's
  // pending work resolves, by which time the URL is already the next page.
  // Attributing it by current URL produces false accusations, so it is never
  // owned; suites that care about it must test it directly (see leakCheck).
  const UNATTRIBUTABLE = /unmounted component/i;
  const isOwned = () => owned.some((re) => re.test(page.url()));
  // Errors a suite DELIBERATELY causes — e.g. aborting every request to reach
  // the offline state. Without this the suite fails on the very condition it
  // set up, which trains the reader to ignore the console check.
  let expected = expectedErrors;
  const noteError = (t) => {
    if (/favicon/i.test(t)) return;
    const line = `${safePath(page.url())}: ${t.slice(0, 140)}`;
    if (expected && expected.test(t)) { foreign.push(`[expected] ${line}`); return; }
    if (UNATTRIBUTABLE.test(t) || !isOwned()) foreign.push(line);
    else consoleLog.push(line);
  };
  // Ground truth for which database we are talking to: the app id the browser
  // ACTUALLY sends, not what an env file claims. This repo's `.env.local` points
  // at production and the sibling repo's `.env.prod` is mislabelled staging, so
  // a filename is not evidence.
  let observedAppId = null;
  page.on('request', (r) => {
    if (observedAppId || !/parseapi|back4app/i.test(r.url())) return;
    const id = extractAppId(r.postData(), r.headers());
    if (id) observedAppId = id;
  });

  page.on('console', (m) => { if (m.type() === 'error') noteError(m.text()); });
  page.on('pageerror', (e) => noteError(`PAGEERROR: ${String(e)}`));

  const safePath = (u) => { try { return new URL(u).pathname; } catch { return u; } };

  const shot = async (label) => {
    const f = join(OUT, `${ts}_${suite}-${label}.png`);
    await page.screenshot({ path: f, fullPage: true }).catch(() => {});
    return f;
  };

  /** Everything a reader needs to diagnose without re-running. */
  const diagnose = async (label) => {
    const png = await shot(`FAIL-${label}`);
    let visible = '';
    try { visible = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 1200); } catch { /* torn down */ }
    const txt = join(OUT, `${ts}_${suite}-FAIL-${label}.txt`);
    writeFileSync(txt, [
      `suite:    ${suite}`,
      `check:    ${label}`,
      `url:      ${page.url()}`,
      `screenshot: ${png}`,
      '',
      '--- visible text ---',
      visible,
      '',
      '--- console (owned) ---',
      ...consoleLog.slice(-12),
      '',
      '--- console (other pages / unattributable) ---',
      ...foreign.slice(-12),
    ].join('\n'));
    return { png, txt };
  };

  const check = async (name, pass, detail) => {
    if (name in results) throw new Error(`Duplicate check name: "${name}" — names are the stability-gate key.`);
    results[name] = !!pass;
    order.push(name);
    console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
    if (!pass) {
      const d = await diagnose(name.replace(/[^a-z0-9]+/gi, '-').slice(0, 50));
      console.log(`      ↳ ${d.png}`);
      console.log(`      ↳ ${d.txt}`);
    }
    return !!pass;
  };

  /** Build a Playwright locator from a policy-checked selector spec. */
  const find = (spec) => {
    const d = describeSelector(spec);
    if (!d.safe) unsafeUses.push(`selector ${d.description}`);
    if (d.kind === 'role') return { d, loc: page.getByRole(d.role, d.name ? { name: d.name } : undefined) };
    if (d.kind === 'text') return { d, loc: page.getByText(d.text) };
    if (d.kind === 'label') return { d, loc: page.getByLabel(d.label) };
    return { d, loc: page.locator(`[data-testid="${d.testId}"]`) };
  };

  /** Wait for a thing to be visible. Conditional — never a sleep. */
  const see = async (spec, { timeout = 30000 } = {}) => {
    const { d, loc } = find(spec);
    await loc.first().waitFor({ state: 'visible', timeout });
    return { d, loc: loc.first() };
  };

  /**
   * A step that changes the screen MUST declare what the screen shows after.
   * `expect` is a selector spec, and it is awaited before the step returns, so
   * a failure is reported where it happened rather than three steps later.
   */
  const step = async (description, action, expectSpec) => {
    if (!expectSpec) throw new Error(`step("${description}") needs an \`expect\` — declare what the screen shows afterwards.`);
    try {
      await action();
      await see(expectSpec);
    } catch (err) {
      await check(`step: ${description}`, false, String(err).split('\n')[0].slice(0, 160));
      throw err;
    }
  };

  const go = (path, expectSpec, description = `go ${path}`) =>
    step(description, () => page.goto(`${BASE}${path}`), expectSpec);

  const click = async (spec, expectSpec, description) => {
    const { d, loc } = await see(spec);
    return step(description ?? `click ${d.description}`, () => loc.click(), expectSpec);
  };

  /**
   * The only sleep. Requires a reason, is counted, and is reported at the end —
   * so a fixed wait can never quietly become the house style.
   */
  const UNSAFE_pause = async (ms, why) => {
    if (!why) throw new Error('UNSAFE_pause needs a reason. Prefer see()/waitFor — a fixed sleep is the flakiness this harness exists to remove.');
    unsafeUses.push(`pause ${ms}ms (${why})`);
    await page.waitForTimeout(ms);
  };

  /**
   * Run `fn` with console errors matching `re` treated as expected rather than
   * owned. Scoped, so the tolerance cannot leak past the scenario that needs it.
   */
  const withExpectedErrors = async (re, fn) => {
    const prev = expected;
    expected = re;
    try { return await fn(); } finally { expected = prev; }
  };

  /**
   * Refuse to continue unless this is a database a suite may write to.
   *
   * Call it AFTER login, so a real Parse request has been observed. Exits
   * non-zero rather than throwing, so a guarded suite fails loudly in the runner
   * instead of looking like a crash.
   */
  const requireWritableEnvironment = async () => {
    const v = mayWrite(observedAppId);
    await check('environment is safe for a suite that writes', v.allowed, v.reason);
    if (!v.allowed) {
      console.error(`\n  REFUSING TO WRITE. ${v.reason}`);
      await browser.close();
      process.exit(3);
    }
    return observedAppId;
  };

  const login = async (username = process.env.PARSE_USERNAME ?? 'Test', password = process.env.PARSE_PASSWORD ?? 'test') => {
    // The Next dev server recompiles between suites, and a cold route can take
    // well over the 30s default — one gate run crashed here for that reason,
    // which the stability gate then reported as thirteen 50%-flaky checks.
    // A generous timeout plus ONE announced retry, so genuine slowness does not
    // read as a product failure and a real outage still surfaces.
    const open = async (attempt) => {
      try {
        await page.goto(`${BASE}/account/login`, { timeout: 90000, waitUntil: 'domcontentloaded' });
      } catch (err) {
        if (attempt > 1) throw err;
        console.log('      (login page slow to compile — retrying once)');
        await page.goto(`${BASE}/account/login`, { timeout: 90000, waitUntil: 'domcontentloaded' });
      }
    };
    await open(1);
    await page.locator('input[name="usernameV"], input[name="username"], input[type="email"]')
      .first().waitFor({ state: 'visible', timeout: 60000 });
    await page.locator('input[name="usernameV"], input[name="username"], input[type="email"]').first().fill(username);
    await page.locator('input[name="passwordV"], input[name="password"], input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first().click();
    await page.waitForURL((u) => !u.pathname.includes('/account/login'), { timeout: 60000 });
  };

  const finish = async () => {
    console.log('\n[CONSOLE]');
    await check('no console errors on owned surfaces', consoleLog.length === 0, consoleLog.slice(0, 2).join(' | ') || 'clean');
    if (foreign.length) {
      console.log(`  … ${foreign.length} error(s) on other pages or unattributable, reported not failed:`);
      [...new Set(foreign)].slice(0, 3).forEach((f) => console.log(`      ${f}`));
    }
    if (unsafeUses.length) {
      console.log(`\n[UNSAFE] ${unsafeUses.length} escape hatch use(s) — each needs a standing reason:`);
      [...new Set(unsafeUses)].forEach((u) => console.log(`      ${u}`));
    }
    await browser.close();
    const failedNames = order.filter((n) => !results[n]);
    console.log(`\n${'='.repeat(60)}\n${order.length - failedNames.length}/${order.length} checks passed  [${suite}]`);
    failedNames.forEach((n) => console.log(`  ✗ ${n}`));
    if (process.env.E2E_JSON) writeFileSync(process.env.E2E_JSON, JSON.stringify({ suite, results }, null, 1));
    return { results, failed: failedNames, unsafeUses };
  };

  return {
    page, results, check, see, find, step, go, click, UNSAFE_pause, login, shot, finish,
    withExpectedErrors, requireWritableEnvironment, consoleLog, foreign,
    get appId() { return observedAppId; },
  };
}
