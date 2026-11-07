#!/usr/bin/env node
/**
 * `yarn lint:css` — stylelint with a ratcheting baseline.
 *
 *   node scripts/lint-css.mjs            # the gate (CI)
 *   node scripts/lint-css.mjs --update   # rewrite stylelint-baseline.json
 *
 * stylelint reports every violation; stylelint-baseline.json records how many
 * of each rule each file had when the gate went in (PR 1a). This fails when
 *   - a (file, rule) pair has MORE violations than the baseline records
 *     (including any rule in any file the baseline doesn't list), or
 *   - a (file, rule) pair has FEWER: the fix is real, so lock it in with
 *     `yarn lint:css:baseline` and commit the shorter file. The list only
 *     shrinks; PR 7 empties it.
 *   - the config itself is invalid or a file fails to parse.
 *
 * `--update` refuses to grow the baseline: a new violation is fixed, not
 * recorded. (`--update --seed` wrote the first baseline; it is not for reuse.)
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join, relative } from 'path';
import stylelint from 'stylelint';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = join(ROOT, 'stylelint-baseline.json');
const GLOB = '{app,pages,styles}/**/*.{css,scss}';
const update = process.argv.includes('--update');
// Seeding only: the one run that wrote the first baseline (PR 1a). Never CI.
const seed = process.argv.includes('--seed');

const prior = JSON.parse(readFileSync(BASELINE, 'utf8'));
const { results } = await stylelint.lint({ files: GLOB, cwd: ROOT, configFile: join(ROOT, '.stylelintrc.js') });

const counts = {};
const errors = [];
results.forEach((r) => {
  const file = relative(ROOT, r.source);
  r.warnings.forEach((w) => {
    if (w.rule.startsWith('--')) errors.push(`${file}:${w.line}  ${w.text}`); // needless/invalid disables
    else (counts[file] ??= {})[w.rule] = (counts[file]?.[w.rule] ?? 0) + 1;
  });
  (r.invalidOptionWarnings ?? []).forEach((w) => errors.push(`config: ${w.text}`));
  (r.parseErrors ?? []).forEach((w) => errors.push(`${file}: parse error ${w.text}`));
});

/** The PR that owns a file's cleanup, from the baseline's hand-kept owners map. */
const owner = (file) => Object.keys(prior.owners ?? {})
  .filter((p) => !p.startsWith('_') && file.startsWith(p))
  .sort((a, b) => b.length - a.length)
  .map((p) => prior.owners[p])[0] ?? 'no owner: add one to stylelint-baseline.json';

const grew = [];
const fixed = [];
const pairs = new Set([
  ...Object.entries(prior.files).flatMap(([f, rs]) => Object.keys(rs).map((r) => `${f}\t${r}`)),
  ...Object.entries(counts).flatMap(([f, rs]) => Object.keys(rs).map((r) => `${f}\t${r}`)),
]);
pairs.forEach((key) => {
  const [file, rule] = key.split('\t');
  const was = prior.files[file]?.[rule] ?? 0;
  const now = counts[file]?.[rule] ?? 0;
  if (now > was) grew.push(`${file}  ${rule}: ${was} → ${now}`);
  if (now < was) fixed.push(`${file}  ${rule}: ${was} → ${now}  [${owner(file)}]`);
});

const total = (b) => Object.values(b).reduce((n, rs) => n + Object.values(rs).reduce((a, c) => a + c, 0), 0);

if (update) {
  if (errors.length || (grew.length && !seed)) {
    console.error('Refusing to update: the baseline only shrinks. Fix these first:');
    [...errors, ...grew].forEach((l) => console.error(`  ${l}`));
    process.exit(1);
  }
  const files = Object.fromEntries(Object.keys(counts).sort().map((f) => [
    f, Object.fromEntries(Object.keys(counts[f]).sort().map((r) => [r, counts[f][r]])),
  ]));
  const unowned = Object.keys(files).filter((f) => owner(f).startsWith('no owner'));
  if (unowned.length) console.warn(`No owning PR for: ${unowned.join(', ')}. Add a prefix to "owners".`);
  writeFileSync(BASELINE, `${JSON.stringify({ owners: prior.owners, total: total(files), files }, null, 2)}\n`);
  console.log(`stylelint-baseline.json: ${total(prior.files)} → ${total(files)} known violations.`);
  process.exit(0);
}

if (fixed.length) {
  console.log(`Fixed since the baseline (${fixed.length}) — run \`yarn lint:css:baseline\` and commit:`);
  fixed.forEach((l) => console.log(`  ✓ ${l}`));
}
if (errors.length) {
  console.error(`\n${errors.length} config, parse or disable-comment error(s):`);
  errors.forEach((l) => console.error(`  ✗ ${l}`));
}
if (grew.length) {
  console.error(`\nMore violations than the baseline allows (${grew.length}):`);
  grew.forEach((l) => console.error(`  ✗ ${l}`));
  console.error('Run `npx stylelint <file>` to see each one.');
}
const ok = !errors.length && !grew.length && !fixed.length;
console.log(`\nstylelint: ${total(counts)} known violation(s) in ${Object.keys(counts).length} file(s); baseline ${total(prior.files)}. ${ok ? 'OK' : 'FAILED'}`);
process.exit(ok ? 0 : 1);
