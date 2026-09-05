/**
 * Data export — click Export, really download the CSV, check it, delete it.
 *
 * The export leaves the app entirely: it goes to the Flask aggregator at
 * NEXT_PUBLIC_PUENTE_DATA_EXPORTER_API_URL, a different reliability domain from
 * Parse. Its documented failure mode is specific and has shipped before: the
 * service returns `Content-Type: text/csv` EVEN ON FAILURE, so an error body or
 * the string "undefined" will happily download as a `.csv` unless the `resp.ok`
 * guard in services/flask-api stops it. A CSV that looks whole and is not gets
 * emailed to a funder.
 *
 * So this suite asserts the artifact, not the click: a real file, with real
 * headers, that is not an error body. The file is deleted afterwards — no
 * household data is left on disk.
 *
 * See e2e/README.md for the harness rules.
 */
import { openSession } from '../lib/harness.mjs';
import { existsSync, readFileSync, rmSync, statSync } from 'fs';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const MANAGER_LOADED = { text: /SurveyData/ };
const PRE_EXISTING = /supplied to `Stack`|headerActions|does not recognize the/;

(async () => {
  const s = await openSession({ suite: 'data-export', owned: [/forms/] });
  await s.login();

  const dir = mkdtempSync(join(tmpdir(), 'puente-e2e-export-'));
  let saved = null;

  await s.withExpectedErrors(PRE_EXISTING, async () => {
    await s.go('/forms/form-manager', MANAGER_LOADED, 'open Form Manager');

    const row = s.page.locator('tr', { hasText: /SurveyData/ }).first();
    const exportBtn = row.getByRole('button', { name: /export/i }).first();
    await s.check('the SurveyData row offers an Export action', await exportBtn.count() > 0);

    // ── THE DOWNLOAD ───────────────────────────────────────────────────────
    console.log('\n[DOWNLOAD] exporting SurveyData for this organization');
    const started = Date.now();
    const waitForDownload = s.page.waitForEvent('download', { timeout: 120000 }).catch(() => null);
    await exportBtn.click();

    // An export is slow and out-of-process. The button must not look idle while
    // it runs, or it gets clicked four more times — four more aggregator jobs.
    const busy = await s.page.locator('tr', { hasText: /SurveyData/ })
      .evaluate((n) => /export(ing)?…|loading|please wait/i.test(n.innerText)
        || !!n.querySelector('[aria-busy="true"], [role="progressbar"]'))
      .catch(() => false);

    const download = await waitForDownload;
    const elapsed = Date.now() - started;
    await s.check('clicking Export produces a download', !!download,
      download ? `${download.suggestedFilename()} in ${elapsed}ms` : 'no download event in 120s');

    if (!download) return;

    saved = join(dir, download.suggestedFilename() || 'export.csv');
    await download.saveAs(saved);
    console.log(`      saved ${saved}`);

    // ── THE ARTIFACT IS REAL ───────────────────────────────────────────────
    console.log('\n[ARTIFACT] the file is a CSV, not an error body');
    await s.check('the download reached the filesystem', existsSync(saved));

    const bytes = statSync(saved).size;
    await s.check('the file is not empty', bytes > 0, `${bytes} bytes`);

    const head = readFileSync(saved, 'utf8').slice(0, 4000);
    const firstLine = head.split(/\r?\n/)[0] ?? '';

    // The guard that exists because this shipped once: a non-ok response must
    // never reach disk. An error body, a stack trace, or the literal string
    // "undefined" saved as .csv is the worst artifact this system can produce,
    // because it looks exactly like a complete one.
    await s.check('the file is not an error body masquerading as CSV',
      !/^\s*(undefined|null|<!DOCTYPE|<html|Traceback|Internal Server Error)/i.test(head)
      && !/"error"\s*:/i.test(head.slice(0, 200)),
      JSON.stringify(firstLine.slice(0, 70)));

    await s.check('the first line looks like a CSV header row',
      firstLine.includes(',') && /[A-Za-z]/.test(firstLine),
      `${firstLine.split(',').length} columns`);

    // Domain check: the aggregator strips Spanish accents from headers AND
    // values, so a column named for an accented formikKey arrives folded. Assert
    // the export is legible rather than asserting a specific schema, which is
    // maintained in a separate repo and would make this suite brittle.
    const cols = firstLine.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    console.log(`      columns: ${cols.slice(0, 8).join(', ')}${cols.length > 8 ? ` …(+${cols.length - 8})` : ''}`);
    await s.check('the header carries named columns, not positional junk',
      cols.filter((c) => /^[A-Za-z]/.test(c)).length >= Math.min(3, cols.length),
      `${cols.length} columns`);

    const rows = head.split(/\r?\n/).filter(Boolean).length;
    await s.check('the export contains at least a header and one row', rows >= 2,
      `${rows} line(s) in the first 4KB`);

    // Reported rather than failed: a pending state is web-delight-auditor's to
    // enforce, and this suite should not block on a presentation gap.
    if (!busy) {
      console.log('      ⚠ the Export button showed no pending state while the request ran.');
      console.log('        An export that looks idle for tens of seconds gets clicked again.');
    }
  });

  // ── CLEAN UP ─────────────────────────────────────────────────────────────
  // Real household data was downloaded. It does not stay on this machine.
  console.log('\n[CLEANUP] deleting the downloaded export');
  rmSync(dir, { recursive: true, force: true });
  await s.check('the downloaded export was deleted from disk',
    !saved || !existsSync(saved), saved ? `${saved} removed` : 'nothing downloaded');

  const { failed } = await s.finish();
  process.exit(failed.length ? 1 : 0);
})();
