/**
 * Animations of the research export, for the research guides
 * (puente-dr.github.io/guides/research/), in English and Spanish.
 *
 *   yarn dev                                   # in another shell
 *   node e2e/capture-research-export-gifs.mjs  # needs ffmpeg on PATH
 *
 * Records the real interface with Playwright's video, then converts each
 * scene to a GIF with ffmpeg (two-pass palette, so text stays crisp). Headless
 * video does not draw the mouse, so a cursor and a click ripple are injected:
 * a reader has to see WHERE to click, not just that something changed.
 *
 * NEVER LOGS IN: every backend answer is a stub — see research-export-stubs.mjs.
 * Capture only; it asserts nothing.
 */
import { chromium } from '@playwright/test';
import { execFileSync } from 'child_process';
import { mkdirSync, rmSync } from 'fs';

import { BASE } from './capture-lib.mjs';
import { installStubs } from './research-export-stubs.mjs';

const ROOT = process.env.OUT
  || '/Users/hopetambala/Documents/development/puente/puente-react-nextjs-platform/docs/img/research-export';
const SIZE = { width: 1280, height: 800 };
const WIDTH = 960; // GIF width: legible in a 44rem guide column, small enough to load on a phone

/** A visible cursor and a ripple on every click. */
function installCursor() {
  const add = () => {
    const dot = document.createElement('div');
    dot.id = '__cursor';
    Object.assign(dot.style, {
      position: 'fixed', zIndex: 2147483647, width: '22px', height: '22px', marginLeft: '-4px', marginTop: '-2px',
      pointerEvents: 'none', left: '-50px', top: '-50px',
      background: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 22 22'><path d='M4 2 L4 18 L8.5 14 L11.5 20.5 L14 19.3 L11 13 L17 13 Z' fill='black' stroke='white' stroke-width='1.5' stroke-linejoin='round'/></svg>\") no-repeat",
    });
    document.body.appendChild(dot);
    document.addEventListener('mousemove', (e) => { dot.style.left = `${e.clientX}px`; dot.style.top = `${e.clientY}px`; }, true);
    document.addEventListener('mousedown', (e) => {
      const ring = document.createElement('div');
      Object.assign(ring.style, {
        position: 'fixed', zIndex: 2147483646, left: `${e.clientX - 18}px`, top: `${e.clientY - 18}px`,
        width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #3d80fc',
        pointerEvents: 'none', transition: 'transform .45s ease-out, opacity .45s ease-out',
      });
      document.body.appendChild(ring);
      requestAnimationFrame(() => { ring.style.transform = 'scale(1.8)'; ring.style.opacity = '0'; });
      setTimeout(() => ring.remove(), 600);
    }, true);
  };
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
}

const pause = (page, ms) => page.waitForTimeout(ms);

async function clickLike(page, locator, { dwell = 450 } = {}) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 25 });
  await pause(page, dwell);
  await locator.click();
}

async function typeLike(page, locator, text) {
  await clickLike(page, locator);
  await locator.fill('');
  await locator.pressSequentially(text, { delay: 45 });
}

/** One recorded scene: returns the path of the GIF it wrote. */
async function scene(browser, out, name, path, play) {
  const dir = `${out}/.video-${name}`;
  const ctx = await browser.newContext({ viewport: SIZE, recordVideo: { dir, size: SIZE } });
  await installStubs(ctx);
  await ctx.addInitScript(installCursor);
  const page = await ctx.newPage();
  const started = Date.now();
  await page.goto(`${BASE}${path}`);
  const ready = await play(page);
  const skip = Math.max(0, (ready - started) / 1000 - 0.3);
  const video = await page.video().path();
  await ctx.close();

  const gif = `${out}/${name}.gif`;
  const palette = `${dir}/palette.png`;
  const filters = `fps=12,scale=${WIDTH}:-1:flags=lanczos`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(skip), '-i', video, '-vf', `${filters},palettegen=stats_mode=diff`, palette]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(skip), '-i', video, '-i', palette,
    '-lavfi', `${filters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`, '-loop', '0', gif]);
  rmSync(dir, { recursive: true, force: true });
  console.log(`  ✓ ${name}.gif`);
  return gif;
}

const L = {
  publish: /^(Publish|Publicar)$/,
  formName: /detailed name|nombre detallado/i,
  allow: /Allow research export|Permitir exportación/,
  research: /Export research file|Exportar archivo de investigación/,
  duplicate: /^(Duplicate|Duplicar)$/,
  refresh: /^(Refresh|Actualizar)$/,
  expand: /expand|expandir/i,
};

async function walk(browser, prefix, out) {
  // ── 1. turning research export on for a form ─────────────────────────────
  await scene(browser, out, 'research-gif-01-turn-on', `${prefix}/forms/form-creator`, async (page) => {
    const name = page.getByPlaceholder(L.formName);
    await name.waitFor({ timeout: 30000 });
    const ready = Date.now();
    await pause(page, 600);
    await typeLike(page, name, 'Vision exam — Example Clinic');
    await pause(page, 500);
    await clickLike(page, page.getByRole('checkbox', { name: L.allow }));
    await pause(page, 2200); // read the sentence beside the box
    await clickLike(page, page.getByRole('button', { name: L.publish }));
    await pause(page, 2000);
    return ready;
  });

  // ── 2. Form Manager: what each file holds, the count, the download ───────
  await scene(browser, out, 'research-gif-02-export', `${prefix}/forms/form-manager`, async (page) => {
    const research = page.getByRole('button', { name: L.research });
    await research.waitFor({ timeout: 30000 });
    await research.scrollIntoViewIfNeeded();
    await page.mouse.move(640, 300);
    const ready = Date.now();
    await pause(page, 1200);
    const row = page.locator('tr', { hasText: 'Vision exam' });
    await clickLike(page, row.getByRole('button', { name: L.expand }));
    await pause(page, 600);
    await clickLike(page, page.getByRole('button', { name: L.refresh }));
    await pause(page, 2600); // the count, and the two sentences
    await clickLike(page, research);
    await pause(page, 2200);
    return ready;
  });

  // ── 3. a test copy: Duplicate, rename, publish ───────────────────────────
  await scene(browser, out, 'research-gif-03-test-copy', `${prefix}/forms/form-manager`, async (page) => {
    const row = page.locator('tr', { hasText: 'Vision exam' });
    const duplicate = row.getByRole('button', { name: L.duplicate });
    await duplicate.waitFor({ timeout: 30000 });
    await duplicate.scrollIntoViewIfNeeded();
    await page.mouse.move(640, 300);
    const ready = Date.now();
    await pause(page, 1000);
    await clickLike(page, duplicate);
    const name = page.getByPlaceholder(L.formName);
    await name.waitFor({ timeout: 30000 });
    await pause(page, 900);
    await typeLike(page, name, 'PRUEBA - Vision exam — Example Clinic');
    await pause(page, 600);
    await clickLike(page, page.getByRole('button', { name: L.publish }));
    await pause(page, 2000);
    return ready;
  });
}

const browser = await chromium.launch({ headless: true });
try {
  for (const { prefix, out, label } of [
    { prefix: '', out: ROOT, label: 'English' },
    { prefix: '/spa', out: `${ROOT}/es`, label: 'Español' },
  ]) {
    mkdirSync(out, { recursive: true });
    console.log(`\n=== ${label} → ${out} ===`);
    await walk(browser, prefix, out);
  }
} finally {
  await browser.close();
}
