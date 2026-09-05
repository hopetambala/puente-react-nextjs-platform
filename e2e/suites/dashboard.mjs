/**
 * Dashboard — quantities, i18n and responsive behaviour.
 *
 * Every query here is behavioural: if a coordinator could not find or read the
 * thing, the check fails. See e2e/README.md for the harness rules.
 */
import { openSession, BASE } from '../lib/harness.mjs';

const RIBBON = { role: 'region', name: /sync/i };
const QUEUE = { role: 'heading', name: /needs attention|requiere atenci/i };

(async () => {
  const s = await openSession({ suite: 'dashboard-e2e' });
  await s.login();

  // ── QUANTITIES ───────────────────────────────────────────────────────────
  console.log('\n[QUANTITIES] every number states a base rate, and only a true one');
  await s.go('/quick-start', QUEUE);

  const row = (name) => ({ role: 'link', name });
  const readRow = async (name) => (await (await s.see(row(name))).loc.innerText()).replace(/\s+/g, ' ');

  const missing = await readRow(/missing key fields/i);
  const orphan = await readRow(/unresolved household/i);
  const dupes = await readRow(/duplicate households/i);
  [missing, orphan, dupes].forEach((t) => console.log(`      ${t}`));

  await s.check('record-based rows quote the org total',
    / of [\d.,]+/.test(missing) && / of [\d.,]+/.test(orphan),
    `${missing.slice(0, 24)} | ${orphan.slice(0, 24)}`);

  // The base rate must be TRUE, not merely present: duplicates come from a
  // capped sample and form drift counts forms, so neither may quote a record
  // total. A wrong denominator is worse than none — it reads as measured.
  await s.check('sampled row does NOT quote the record total',
    !/ of [\d.,]+/.test(dupes), dupes.slice(0, 40));
  await s.check('sampled row still discloses that it is estimated',
    /estimat/i.test(dupes), dupes.slice(0, 40));

  const rail = await (await s.see({ text: /most recently synced records/ })).loc.innerText();
  await s.check('coverage rail states its denominator once', /\d/.test(rail), rail);

  const strip = await (await s.see({ text: /not people who collected/ })).loc.innerText();
  await s.check('context strip keeps the sampling disclosure', /sampled/i.test(strip));
  await s.check('24h count is not duplicated into the footer', !/last 24/i.test(strip), strip.slice(0, 70));

  // ── HOVER ────────────────────────────────────────────────────────────────
  // The global `a:hover` in root.css sets a link colour and a hardcoded 0.3s
  // colour transition. A queue row is an anchor, so without an override the
  // tabular count turns link-blue — a NUMBER changing colour reads as a change
  // in the data, not a pointer affordance.
  console.log('\n[HOVER] a quiet background shift, not a colour change');
  const { loc: hoverRow } = await s.see(row(/unresolved household/i));
  const colour = () => hoverRow.evaluate((n) => getComputedStyle(n).color);
  const resting = await colour();
  await hoverRow.hover();
  await hoverRow.evaluate((n) => new Promise((r) => {
    // Settle on the computed colour rather than sleeping past a guessed duration.
    const start = performance.now();
    const tick = () => (performance.now() - start > 600 ? r() : requestAnimationFrame(tick));
    tick();
  }));
  await s.check('row keeps its colour on hover', resting === await colour(), `${resting} → ${await colour()}`);
  await s.check('hover carries no hardcoded 0.3s colour transition',
    !/color 0\.3s/.test(await hoverRow.evaluate((n) => getComputedStyle(n).transition)),
    await hoverRow.evaluate((n) => getComputedStyle(n).transition));

  // ── DISPATCH ─────────────────────────────────────────────────────────────
  console.log('\n[DISPATCH] the screen ends with the coordinator somewhere else');
  await s.click(row(/unresolved household/i), { text: /record|curation|filter|search/i },
    'click the unresolved-household row');
  await s.check('lands on curation with the signal filter',
    s.page.url().includes('/data/data-curation') && s.page.url().includes('signal=unresolved-parent'),
    s.page.url());

  // ── SPANISH ──────────────────────────────────────────────────────────────
  console.log('\n[SPANISH] longer strings and a different grouping separator');
  await s.go('/spa/quick-start', QUEUE);
  const spa = await readRow(/vínculo de hogar|hogar sin resolver/i);
  await s.check('Spanish is translated, not English', /\bde\b/.test(spa), spa.slice(0, 50));
  await s.check('no raw interpolation tokens leaked', !/\{\{|\}\}/.test(spa), 'checked {{n, number}}');
  await s.shot('spanish');

  // ── NARROW ───────────────────────────────────────────────────────────────
  console.log('\n[NARROW] the 65/35 split stacks rather than squeezing');
  await s.page.setViewportSize({ width: 860, height: 900 });
  await s.go('/quick-start', QUEUE);
  await s.check('no horizontal page overflow at 860px',
    !await s.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1));
  const box = await (await s.see(row(/missing key fields/i))).loc.boundingBox();
  await s.check('queue rows hold single-line density when narrow',
    !box || box.height <= 72, box ? `${Math.round(box.height)}px` : 'no rows');
  await s.shot('narrow');

  const { failed } = await s.finish();
  process.exit(failed.length ? 1 : 0);
})();
