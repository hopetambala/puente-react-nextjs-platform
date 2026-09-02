import '@testing-library/jest-dom';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

// Parity proves the three catalogs agree with each other. It cannot prove the
// catalogs agree with the CODE: a `t('data_curaton_save')` typo satisfies every
// existing check — parity, worksheet coverage, lint, build, and the component
// tests, which assert on the key the component passes rather than on a catalog
// entry. The user sees the raw key. That is the exact failure this repo's i18n
// work exists to prevent, so it gets a test rather than a convention.
const KEY_PREFIXES = [
  'account_', 'action_', 'analytics_', 'billing_', 'breadcrumb_', 'context_',
  'coverage_', 'dashboard_', 'data_curation_', 'divider_', 'error_', 'export_',
  'field_', 'field_activity', 'footer_', 'form_creator_', 'form_manager_',
  'form_marketplace_', 'forgot_', 'inspector_', 'language', 'login_', 'nav_',
  'org_admin_', 'page_', 'pagination_', 'register_', 'select_', 'sign_in',
  'stat_', 'sync_ribbon_', 'topbar_', 'triage_', 'your_forms',
];

const looksLikeKey = (s) => KEY_PREFIXES.some((p) => s.startsWith(p));

function sourceFiles() {
  return execSync("git ls-files 'app/**/*.js' 'app/**/*.jsx' 'app/**/*.ts' 'app/**/*.tsx' 'pages/**/*.js' 'pages/**/*.tsx'", {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
}

// Two shapes reach the catalog: a direct `t('key')` call, and a key held in a
// `labelKey`/`titleKey`/`key` field that some component later passes to `t()`.
// Both are collected, because the indirection is exactly where a typo hides.
function referencedKeys() {
  const found = new Map();
  const direct = /\bt\(\s*'([^']+)'/g;
  const indirect = /\b(?:labelKey|titleKey|key)\s*:\s*'([^']+)'/g;

  sourceFiles().forEach((file) => {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    [direct, indirect].forEach((re) => {
      re.lastIndex = 0;
      let m = re.exec(src);
      while (m !== null) {
        if (looksLikeKey(m[1]) && !found.has(m[1])) found.set(m[1], file);
        m = re.exec(src);
      }
    });
  });
  return found;
}

describe('Every key the code asks for exists in the source catalog', () => {
  const catalog = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public', 'locales', 'eng', 'common.json'), 'utf8'),
  );

  it('resolves every t() key referenced in app/ and pages/', () => {
    const missing = [...referencedKeys().entries()]
      .filter(([key]) => !(key in catalog))
      .map(([key, file]) => `${key}  (${file})`);

    expect(missing).toEqual([]);
  });

  it('actually looks at a meaningful number of keys, so a broken scan cannot pass silently', () => {
    // Guards the test itself: if the glob or the regex stops matching, the
    // check above would pass on an empty set and prove nothing.
    expect(referencedKeys().size).toBeGreaterThan(150);
  });
});
