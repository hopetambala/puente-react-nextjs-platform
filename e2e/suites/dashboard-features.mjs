/**
 * Dashboard — feature behaviour a coordinator depends on, plus the cost of the
 * load. Run this before merging anything that touches the view; merging ships
 * to production.
 *
 * See e2e/README.md for the harness rules.
 */
import { BASE,openSession } from '../lib/harness.mjs';

const LOADED = { role: 'link', name: /unresolved household|missing key fields/i };
// Discovered at runtime rather than hardcoded: which triage signals exist
// depends on the data, and staging has no unresolved-parent rows. A suite that
// assumes production's signals fails in staging for a reason that has nothing
// to do with the code under test.
const ON_CURATION = { text: /record|curation|filter|search/i };

(async () => {
  const s = await openSession({ suite: 'dashboard-features' });
  await s.login();

  // ── COST ─────────────────────────────────────────────────────────────────
  // This view fires 8 org-scoped reads in one Promise.all. Wall-clock is the
  // slowest read rather than the sum, but request COUNT is what a bad
  // connection multiplies, so it is tracked rather than assumed.
  console.log('\n[COST] backend round-trips for one load');
  const reqs = [];
  s.page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(BASE) && !u.startsWith('data:') && /parse|back4app|classes|functions/i.test(u)) reqs.push(u);
  });
  const t0 = Date.now();
  await s.go('/quick-start', LOADED);
  console.log(`      ${reqs.length} backend requests, first row at ${Date.now() - t0}ms (unthrottled)`);
  await s.check('round-trips stay in the expected band', reqs.length > 0 && reqs.length <= 14,
    `${reqs.length} backend requests`);

  // ── DISPATCH ─────────────────────────────────────────────────────────────
  console.log('\n[DISPATCH] every row delivers the records it counted');
  // Read the queue that actually rendered, so the suite covers whatever signals
  // this environment has rather than the ones production happened to show.
  const ROWS = await s.page.getByRole('link', { name: /records|households|form/i })
    .evaluateAll((ns) => ns
      .map((n) => n.innerText.replace(/\s+/g, ' ').trim())
      .filter((t) => /^[\d.,]+( of [\d.,]+)?\s/.test(t))
      .map((t) => ({ label: t.slice(0, 46) })));
  await s.check('the queue rendered rows to exercise', ROWS.length > 0,
    ROWS.map((r) => r.label.slice(0, 26)).join(' | ') || 'queue is empty in this environment');

  // One check per row would put DATA in the check name, and the stability gate
  // keys on names: a signal that drops out of staging between run 1 and run 2
  // then reads as a check that vanished, which the gate correctly — and
  // uselessly — calls a failure. So every row is still exercised, but the two
  // check names are fixed and the rows are named in the detail instead.
  const dispatched = [];
  for (const r of ROWS) {
    await s.go('/quick-start', LOADED);
    const words = r.label.replace(/^[\d.,]+( of [\d.,]+)?\s+/, '').split(' ').slice(0, 4).join(' ');
    const spec = { role: 'link', name: new RegExp(words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
    await s.click(spec, ON_CURATION, `click "${r.label}"`);
    const body = (await s.page.locator('body').innerText()).replace(/\s+/g, ' ');
    dispatched.push({
      words,
      arrived: s.page.url().includes('/data/data-curation') && body.length > 200,
      clean: !/something went wrong|failed to|cannot read|undefined is not/i.test(body.slice(0, 600)),
      where: `${new URL(s.page.url()).search || '(no filter)'} · ${body.length} chars`,
    });
  }

  const stranded = dispatched.filter((d) => !d.arrived);
  await s.check('every queue row lands on a working destination', stranded.length === 0,
    stranded.length
      ? `stranded: ${stranded.map((d) => `"${d.words}" → ${d.where}`).join('; ')}`
      : dispatched.map((d) => `"${d.words}" → ${d.where}`).join('; ') || 'no rows to dispatch');

  const broken = dispatched.filter((d) => !d.clean);
  await s.check('no queue row destination shows an error', broken.length === 0,
    broken.length ? `errored: ${broken.map((d) => `"${d.words}"`).join(', ')}`
      : `${dispatched.length} destination(s) clean`);

  // ── RAIL ─────────────────────────────────────────────────────────────────
  console.log('\n[RAIL] coverage is informational and says what it missed');
  await s.go('/quick-start', LOADED);
  const railRow = s.page.getByText(/quiet \d|synced \d/i).first();
  const affordance = await railRow.evaluate((n) => {
    const li = n.closest('li') ?? n;
    return { tag: li.tagName, hasLink: !!li.querySelector('a'), cursor: getComputedStyle(li).cursor };
  });
  await s.check('rail rows are not falsely affordant',
    !affordance.hasLink && affordance.cursor !== 'pointer',
    `<${affordance.tag}> cursor:${affordance.cursor}`);
  const body = await s.page.locator('body').innerText();
  await s.check('rail discloses what it could not attribute',
    /no community recorded|not shown/i.test(body), 'disclosure present');

  // ── NAVIGATION ───────────────────────────────────────────────────────────
  console.log('\n[NAV] the view survives leaving and returning');
  // Count what is on screen BEFORE leaving, so "restored" can mean restored to
  // the same thing rather than merely "a page rendered". Both checks below used
  // to assert `true`: the step()'s own wait had already proved the page loaded,
  // so the checks restated it and padded the stable count.
  const queueRows = () => s.page.getByRole('link', { name: /records|households|form/i })
    .evaluateAll((ns) => ns.map((n) => n.innerText.replace(/\s+/g, ' ').trim())
      .filter((t) => /^[\d.,]+( of [\d.,]+)?\s/.test(t)));
  const before = await queueRows();

  await s.click({ role: 'link', name: /^.?\s*Manage$/i }, { text: /form|record|name/i }, 'click Manage in the sidebar');
  await s.check('sidebar navigation works from this view',
    !s.page.url().includes('/quick-start'), s.page.url());

  await s.step('browser back to the dashboard', () => s.page.goBack(), LOADED);
  const back = await queueRows();
  await s.check('back-navigation restores the dashboard with data',
    s.page.url().includes('/quick-start') && back.length === before.length && back.length > 0,
    `${before.length} row(s) before → ${back.length} after back`);

  // ── RELOAD ───────────────────────────────────────────────────────────────
  console.log('\n[RELOAD] a hard reload lands in the same place');
  await s.step('hard reload', () => s.page.reload(), LOADED);
  const reloaded = await queueRows();
  await s.check('reload re-renders the queue',
    reloaded.length === before.length && reloaded.length > 0,
    `${before.length} row(s) before → ${reloaded.length} after reload`);

  // ── LEAK ─────────────────────────────────────────────────────────────────
  // Dashboard only, no other page's code involved. "State update on an
  // unmounted component" cannot be attributed by URL — it fires when a previous
  // page's pending work resolves — so it gets a direct test instead of a guess.
  console.log('\n[LEAK] no state update after unmount');
  const leaks = [];
  const onLeak = (m) => { if (m.type() === 'error' && /unmounted component/i.test(m.text())) leaks.push(m.text().slice(0, 80)); };
  s.page.on('console', onLeak);
  for (let i = 0; i < 10; i += 1) {
    await s.page.goto(`${BASE}/quick-start`);
    // Deliberately unmount mid-load, sweeping the window in which a pending
    // fetch could resolve into a dead component. A conditional wait is wrong
    // here: the point IS to interrupt at varying moments.
    await s.UNSAFE_pause(80 + i * 120, 'sweeping unmount timing is the test itself');
  }
  await s.go('/quick-start', LOADED);
  s.page.off('console', onLeak);
  await s.check('no state update after unmount across 11 mounts', leaks.length === 0, leaks[0] || 'clean');

  await s.shot('final');
  const { failed } = await s.finish();
  process.exit(failed.length ? 1 : 0);
})();
