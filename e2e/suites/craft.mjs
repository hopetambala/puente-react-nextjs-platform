/**
 * Dashboard — the interaction-designer blocking checks, run against the
 * RENDERED screen. Keyboard, colour independence, signature, hierarchy,
 * composition, and the connection states nobody looks at.
 *
 * These are the checks that cannot be satisfied by a glance, which is why they
 * are a script. See e2e/README.md for the harness rules.
 */
import { openSession, BASE } from '../lib/harness.mjs';

const QUEUE = { role: 'heading', name: /needs attention/i };
// A heading renders before the fetch resolves, so waiting on it is not waiting
// for data — the ribbon is still its loading <div> at that point. Wait for a
// row, which only exists once the queue has real counts.
const LOADED = { role: 'link', name: /unresolved household|missing key fields/i };
const ROW = { role: 'link', name: /unresolved household/i };

(async () => {
  const s = await openSession({ suite: 'craft-check' });
  await s.login();
  await s.go('/quick-start', LOADED);

  // ── KEYBOARD ─────────────────────────────────────────────────────────────
  console.log('\n[KEYBOARD] every mouse verb has a key; focus is visible');
  const { loc: firstRow } = await s.see(ROW);
  let tabs = 0; let onRow = false;
  while (tabs < 40 && !onRow) {
    await s.page.keyboard.press('Tab'); tabs += 1;
    onRow = await firstRow.evaluate((n) => n === document.activeElement).catch(() => false);
  }
  await s.check('a queue row is reachable by Tab', onRow, onRow ? `${tabs} tabs from load` : 'never focused in 40 tabs');

  const ring = await firstRow.evaluate((n) => {
    const cs = getComputedStyle(n);
    return { outline: `${cs.outlineStyle} ${cs.outlineWidth}`, shadow: cs.boxShadow };
  });
  await s.check('focused row has a real focus ring, not just a tint',
    (ring.outline !== 'none 0px' && !/none/.test(ring.outline)) || (ring.shadow && ring.shadow !== 'none'),
    JSON.stringify(ring));
  await s.shot('keyboard-focus');

  await s.page.keyboard.press('Enter');
  await s.see({ text: /record|curation|filter|search/i });
  await s.check('Enter activates the focused row, same as click',
    s.page.url().includes('/data/data-curation'), s.page.url());

  // ── SIGNATURE + HIERARCHY + COMPOSITION ──────────────────────────────────
  await s.go('/quick-start', LOADED);

  console.log('\n[SIGNATURE] the provenance strip is not dressed as page chrome');
  const bars = await s.page.evaluate(() => {
    const pick = (el) => (el ? { bg: getComputedStyle(el).backgroundColor, h: Math.round(el.getBoundingClientRect().height) } : null);
    return {
      topbar: pick(document.querySelector('[class*="topbar"]')),
      ribbon: pick(document.querySelector('[aria-label]')?.closest('section') ?? document.querySelector('section[aria-label]')),
    };
  });
  await s.check('the signature is not wearing the topbar surface',
    bars.ribbon && bars.topbar && bars.ribbon.bg !== bars.topbar.bg,
    bars.ribbon ? `ribbon ${bars.ribbon.bg} vs topbar ${bars.topbar.bg}` : 'not found');

  const ribbonFonts = await s.page.locator('section[aria-label] span').evaluateAll(
    (ns) => ns.map((n) => getComputedStyle(n).fontFamily),
  );
  await s.check('bare numerals in the band use the mono face',
    ribbonFonts.some((f) => /mono|Source Code Pro/i.test(f)),
    `${ribbonFonts.filter((f) => /mono/i.test(f)).length}/${ribbonFonts.length} spans mono`);

  console.log('\n[HIERARCHY] chrome recedes so the data is the focal block');
  const title = await (await s.see(QUEUE)).loc.evaluate((n) => {
    const cs = getComputedStyle(n);
    return { size: parseFloat(cs.fontSize), tracking: cs.letterSpacing, transform: cs.textTransform };
  });
  const countSize = await (await s.see(ROW)).loc.locator('span').first()
    .evaluate((n) => parseFloat(getComputedStyle(n).fontSize));
  await s.check('section title is subordinate to the data it labels',
    title.size < countSize, `title ${title.size}px vs count ${countSize}px`);
  await s.check('section title carries a label treatment, not just a weight',
    title.tracking !== 'normal' && parseFloat(title.tracking) > 0,
    `tracking ${title.tracking}, transform ${title.transform}`);

  console.log('\n[COMPOSITION] the page is a frame, not content-then-void');
  const gap = await s.page.evaluate(() => {
    const strip = [...document.querySelectorAll('footer')].pop();
    if (!strip) return null;
    const scroller = strip.closest('[class*="page"]') || document.documentElement;
    return Math.round(scroller.getBoundingClientRect().bottom - strip.getBoundingClientRect().bottom);
  });
  await s.check('context strip anchors the bottom of the frame',
    gap !== null && gap < 140, gap === null ? 'not found' : `${gap}px of void below it`);
  await s.shot('composition');

  // ── COLOUR ───────────────────────────────────────────────────────────────
  console.log('\n[COLOUR] every state legible without colour');
  const rowText = await (await s.see(ROW)).loc.innerText();
  await s.check('severity is carried by TEXT, not colour alone',
    /needs repair|fixable|blocks exports/i.test(rowText), rowText.replace(/\s+/g, ' ').slice(-30));
  const railRow = await s.page.getByText(/quiet \d|synced \d/i).first().innerText();
  await s.check('coverage silence is carried by text', /quiet|synced/i.test(railRow), railRow);
  await s.page.addStyleTag({ content: 'html{filter:grayscale(1)!important}' });
  await s.shot('greyscale');
  await s.page.addStyleTag({ content: 'html{filter:none!important}' });

  // ── CONNECTION: FAILED ───────────────────────────────────────────────────
  console.log('\n[CONNECTION] a designed state for failed, not a blank or a false all-clear');
  let aborted = 0;
  await s.withExpectedErrors(/ERR_FAILED|Failed to load resource|net::/i, async () => {
  await s.page.route('**/*', (r) => {
    const u = r.request().url();
    if (u.startsWith(BASE) || u.startsWith('data:')) return r.continue();
    aborted += 1; return r.abort();
  });
  await s.page.goto(`${BASE}/quick-start`);
  // Wait for the page to SETTLE rather than polling at a guessed moment: the
  // Parse SDK retries before giving up, and a 2.5s poll once reported a hang
  // that did not exist. A false failure costs as much as a false pass.
  // The one test-id here, and deliberately so: this waits for a STATE
  // TRANSITION (the skeleton going away), not for content to assert on. The
  // skeleton is aria-hidden by design, so it has no accessible name to query —
  // and waiting for its absence is the correct conditional wait.
  await s.page.waitForSelector('[data-testid="triage-loading"]', { state: 'detached', timeout: 40000 }).catch(() => {});
  await s.see({ text: /not everything could be checked|no records yet|nothing needs attention/i });
  await s.shot('connection-failed');
  const body = (await s.page.locator('body').innerText()).replace(/\s+/g, ' ');
  await s.check('the failure scenario actually ran', aborted > 0, `${aborted} requests aborted`);
  await s.check('page still stands when every query fails', body.length > 150, `${body.length} chars`);
  await s.check('does NOT show a false all-clear', !/Nothing needs attention/i.test(body),
    /not everything could be checked/i.test(body) ? 'shows the partial-result state' : body.slice(0, 60));
  await s.check('no raw error object or stack reached the UI',
    !/\[object|TypeError|undefined is not|status: [45]/i.test(body));
  await s.page.unroute('**/*');
  });

  const { failed } = await s.finish();
  process.exit(failed.length ? 1 : 0);
})();
