/**
 * @jest-environment node
 *
 * Every `var(--name)` in app/, pages/ and styles/ must resolve to something.
 *
 * An undefined custom property fails silently: the declaration becomes
 * `unset`, so a button loses its background or a toast its colour, and nothing
 * in the console says so. This test is the only place that notices.
 *
 * A name counts as defined when it is declared in
 *   - the installed style-dictionary-dlite-tokens dist for Puente (every
 *     stylesheet `pages/_app.js` imports from `web/puente/default/`),
 *   - `app/impacto-design-system/_css/variables.css`, or
 *   - any stylesheet or source file in the scanned tree (`--name:`). Custom
 *     properties inherit, so a component may legitimately set one for its
 *     children (`--checkbox-size` in controls.css is the example today).
 *
 * A `var(--x, fallback)` still counts as a use. The fallback hides the bug on
 * screen; it does not make the token real.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SCAN_DIRS = ['app', 'pages', 'styles'];
const SOURCE = /\.(css|scss|js|jsx|ts|tsx)$/;

/**
 * Known offenders on the day the gate went in (PR 1a). Each later PR removes
 * the names it fixes; this list only ever shrinks. Name → why it is still here.
 *
 * TODO(PR 1b, foundation): map every name below to a real dlite token, and
 * delete this list.
 */
const KNOWN_UNDEFINED = {
  // The toast palette was never ported. PR 3 replaces react-toastify anyway.
  '--color-toast-bg': 'toast',
  '--color-toast-button-active': 'toast',
  '--color-toast-button-hover': 'toast',
  '--color-toast-error-bg': 'toast',
  '--color-toast-error-button-active': 'toast',
  '--color-toast-error-button-hover': 'toast',
  '--color-toast-error-icon': 'toast',
  '--color-toast-error-text': 'toast',
  '--color-toast-icon': 'toast',
  '--color-toast-success-bg': 'toast',
  '--color-toast-success-button-active': 'toast',
  '--color-toast-success-button-hover': 'toast',
  '--color-toast-success-icon': 'toast',
  '--color-toast-success-text': 'toast',
  '--color-toast-text': 'toast',
  '--color-toast-warning-bg': 'toast',
  '--color-toast-warning-button-active': 'toast',
  '--color-toast-warning-button-hover': 'toast',
  '--color-toast-warning-icon': 'toast',
  '--color-toast-warning-text': 'toast',
};

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const declared = (s) => [...stripComments(s).matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    if (e.name === 'node_modules') return;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (SOURCE.test(e.name)) out.push(p);
  });
  return out;
}

// Read from disk, not require.resolve: next/jest maps every `.css` request to
// a style mock, so resolving the stylesheet returns the mock's directory and the
// scan would silently find no tokens at all.
const TOKEN_DIST = path.join(ROOT, 'node_modules/style-dictionary-dlite-tokens/dist/web/puente/default');

function scan() {
  const defined = new Set();
  fs.readdirSync(TOKEN_DIST).filter((f) => f.endsWith('.css')).forEach((f) => {
    declared(fs.readFileSync(path.join(TOKEN_DIST, f), 'utf8')).forEach((n) => defined.add(n));
  });
  const fromDist = defined.size;
  const legacy = path.join(ROOT, 'app/impacto-design-system/_css/variables.css');
  declared(fs.readFileSync(legacy, 'utf8')).forEach((n) => defined.add(n));

  const uses = {};
  SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d))).forEach((file) => {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    declared(src).forEach((n) => defined.add(n));
    [...src.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].forEach(([, name]) => {
      (uses[name] ??= new Set()).add(path.relative(ROOT, file));
    });
  });

  const undefinedNames = Object.keys(uses).filter((n) => !defined.has(n)).sort();
  return { uses, undefinedNames, fromDist };
}

describe('every var(--…) resolves to a defined token', () => {
  const { uses, undefinedNames, fromDist } = scan();

  it('reads real token definitions and real uses (the scan is not vacuous)', () => {
    expect(fromDist).toBeGreaterThan(200);
    expect(Object.keys(uses).length).toBeGreaterThan(100);
  });

  it('introduces no new undefined tokens', () => {
    const added = undefinedNames
      .filter((n) => !(n in KNOWN_UNDEFINED))
      .map((n) => `${n}  ← ${[...uses[n]].join(', ')}`);
    if (added.length) {
      throw new Error(
        `${added.length} var(--…) name(s) are not defined in style-dictionary-dlite-tokens or _css/variables.css:\n  ${added.join('\n  ')}\n`
        + 'Use a real dlite token (node_modules/style-dictionary-dlite-tokens/dist/web/puente/default/variables.css).',
      );
    }
  });

  it('keeps the known-offenders list honest (remove names that are fixed)', () => {
    const fixed = Object.keys(KNOWN_UNDEFINED).filter((n) => !undefinedNames.includes(n));
    if (fixed.length) {
      throw new Error(
        `Fixed — delete from KNOWN_UNDEFINED in ${path.relative(ROOT, __filename)}:\n  ${fixed.join('\n  ')}`,
      );
    }
  });
});
