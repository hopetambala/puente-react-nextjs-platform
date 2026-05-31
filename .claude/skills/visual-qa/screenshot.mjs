/**
 * Puente Manage — visual QA screenshot runner
 * Usage: node .claude/skills/visual-qa/screenshot.mjs [--url http://localhost:3000]
 *
 * Logs in with Parse credentials, then screenshots every authenticated page.
 * Saves PNGs to .claude/screenshots/ with a timestamp prefix.
 */

import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const OUT = join(ROOT, '.claude', 'screenshots');

const BASE_URL = process.argv.find((a) => a.startsWith('--url='))?.split('=')[1] ?? 'http://localhost:3000';
const USERNAME = process.env.PARSE_USERNAME ?? 'Test';
const PASSWORD = process.env.PARSE_PASSWORD ?? 'test';

const PAGES = [
  { name: '00-landing',            path: '/',                          auth: false },
  { name: '01-login',              path: '/account/login',             auth: false },
  { name: '02-dashboard',          path: '/quick-start',               auth: true  },
  { name: '03-form-manager',       path: '/forms/form-manager',        auth: true  },
  { name: '04-form-creator',       path: '/forms/form-creator',        auth: true  },
  { name: '05-form-marketplace',   path: '/forms/form-marketplace',    auth: true  },
  { name: '06-data-visualization', path: '/data/data-visualization',   auth: true  },
  { name: '07-account-management', path: '/account/management',        auth: true  },
];

mkdirSync(OUT, { recursive: true });

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  // ── Log in ───────────────────────────────────────────────────────────────
  console.log(`→ Logging in as ${USERNAME}…`);
  await page.goto(`${BASE_URL}/account/login`);
  await page.waitForLoadState('networkidle');

  // Fill whichever field names are present
  const userField = page.locator('input[name="usernameV"], input[name="username"], input[type="email"]').first();
  const passField = page.locator('input[name="passwordV"], input[name="password"], input[type="password"]').first();

  await userField.fill(USERNAME);
  await passField.fill(PASSWORD);

  const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
  await submitBtn.click();

  // Wait for redirect away from login
  try {
    await page.waitForURL((url) => !url.pathname.includes('/account/login'), { timeout: 8000 });
    console.log('  ✓ Login succeeded');
  } catch {
    console.warn('  ⚠ Login may have failed — screenshotting anyway');
  }

  // ── Screenshot every page ─────────────────────────────────────────────────
  for (const { name, path, auth } of PAGES) {
    console.log(`→ ${name}  (${path})`);
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForLoadState('networkidle').catch(() => {});
    // Let animations settle
    await page.waitForTimeout(600);

    const file = join(OUT, `${ts}_${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  ✓ saved ${file}`);
  }

  await browser.close();
  console.log('\nDone. Screenshots in .claude/screenshots/');
})();
