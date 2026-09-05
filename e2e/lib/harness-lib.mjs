/**
 * Pure logic for the E2E harness — the part that decides whether a run can be
 * trusted, kept free of Playwright so it can be unit-tested.
 *
 * Unit-tested by __tests__/e2e/harness-lib.test.js.
 *
 * Shaped by Shopify's mobile E2E write-up (shopify.engineering/mobile-e2e-testing).
 * Their suite degraded until it was "blocking more good PRs than bad ones" and
 * had to be pulled from CI. The two causes they name — fixed sleeps, and
 * asserting a node exists rather than that a person can see it — were both
 * present in our own scripts and both produced false failures in one session:
 * a 2.5s poll reported a hang that did not exist, and a first-child `span`
 * lookup reported a style missing while it was applied.
 *
 * The response is theirs: make the reliable thing the easy thing, and make the
 * escape hatches impossible to use by accident.
 */

/**
 * Turn a selector spec into a described, policy-checked query.
 *
 * Behavioural queries (role+name, visible text, label) are `safe`: they fail
 * when a person could not find or use the thing, which is the failure we
 * actually care about. A test id is `UNSAFE_` because it can pass while the
 * element is invisible, unreachable, or has no accessible name — and it must
 * carry a `why`, so the exception is visible in review rather than habitual.
 */
export function describeSelector(spec = {}) {
  const { role, name, text, label, UNSAFE_testId: testId, why } = spec;

  if (role) {
    return {
      kind: 'role',
      safe: true,
      role,
      name,
      description: `role=${role}${name ? ` name=${String(name)}` : ''}`,
    };
  }
  if (text) {
    return { kind: 'text', safe: true, text, description: `text=${String(text)}` };
  }
  if (label) {
    return { kind: 'label', safe: true, label, description: `label=${String(label)}` };
  }
  if (testId) {
    if (!why) {
      throw new Error(
        `UNSAFE_testId("${testId}") needs a \`why\`: state which behavioural query was `
        + 'tried and why it could not work. A test id can pass while nothing is visible.',
      );
    }
    return {
      kind: 'testid',
      safe: false,
      testId,
      why,
      description: `UNSAFE testid=${testId} (${why})`,
    };
  }

  throw new Error('describeSelector needs a selector: role+name, text, label, or UNSAFE_testId.');
}

/**
 * Aggregate repeated runs into stable / flaky / failed.
 *
 * A check absent from a run counts as a failure for that run. A check that
 * silently stopped running is not a check that passed, and treating it as
 * neutral is how a suite reports green while covering less than it did before.
 */
export function summarizeRuns(runs = []) {
  const names = [...new Set(runs.flatMap((r) => Object.keys(r.results ?? {})))].sort();
  const rates = {};
  const stable = [];
  const flaky = [];
  const failed = [];

  names.forEach((n) => {
    const passes = runs.filter((r) => (r.results ?? {})[n] === true).length;
    const rate = runs.length ? passes / runs.length : 0;
    rates[n] = rate;
    if (rate === 1) stable.push(n);
    else if (rate === 0) failed.push(n);
    else flaky.push(n);
  });

  return {
    runs: runs.length, names, rates, stable, flaky, failed,
  };
}

/**
 * Whether a suite has earned the right to block CI.
 *
 * Deliberately strict, and deliberately not a percentage. Shopify's suite died
 * of accumulated tolerance — every individually reasonable allowance summing to
 * a suite nobody believed. A single intermittent check is the disease, not an
 * acceptable rate of it: it is what teaches a reader to re-run instead of read.
 */
export function verdict(summary) {
  const { runs, flaky, failed } = summary;

  if (runs < 2) {
    return {
      promotable: false,
      reason: `Only one run. Stability is a claim about repetition — run it at least twice.`,
    };
  }
  // A suite that produced NO checks did not pass — it almost certainly crashed
  // before reaching its first assertion. Reporting that as green is the gate
  // failing at its own job.
  if (!summary.names.length) {
    return {
      promotable: false,
      reason: 'No checks were recorded — the suite produced nothing and most likely crashed. '
        + 'Run it directly to see the error.',
    };
  }
  if (failed.length) {
    return {
      promotable: false,
      reason: `${failed.length} check(s) fail every run: ${failed.join(', ')}`,
    };
  }
  if (flaky.length) {
    return {
      promotable: false,
      reason: `${flaky.length} check(s) are flaky across ${runs} runs: `
        + flaky.map((n) => `${n} (${Math.round(summary.rates[n] * 100)}%)`).join(', '),
    };
  }
  return { promotable: true, reason: `All checks passed all ${runs} runs.` };
}

/**
 * Production app-id prefixes. A suite that writes must never run against these.
 *
 * This is not hypothetical: `.env.local` in this repo points at production, and
 * the sibling cloudcode repo's `.env.prod` is MISLABELLED — it holds staging
 * credentials. The filename cannot be trusted, so the guard checks the app id
 * itself, which can be.
 */
export const PRODUCTION_APP_ID_PREFIXES = ['vBdTHqQU31'];

/** App ids a write suite may safely target. An ALLOWLIST, not a denylist. */
export const WRITABLE_APP_ID_PREFIXES = (process.env.E2E_WRITABLE_APP_IDS || 'ZvGwjA7cem')
  .split(',').map((p) => p.trim()).filter(Boolean);

/**
 * Whether a write-performing suite may run against this Parse app.
 *
 * ALLOWLIST, and genuinely fail-closed. It used to be a one-entry denylist while
 * its own docstring, the README and a test name all claimed otherwise — so an
 * unrecognised id was ALLOWED. A second production app, a restored instance or a
 * Back4App rename would each have passed. Found by review, not by me.
 *
 * Widen it deliberately with E2E_WRITABLE_APP_IDS, or per-call with
 * `{ allowUnknown: true }`. Both are explicit; neither is the default.
 */
export function mayWrite(appId, { allowUnknown = false } = {}) {
  if (typeof appId !== 'string' || !appId) {
    return { allowed: false, reason: 'No usable Parse app id — refusing to write to an unidentified database.' };
  }
  const prod = PRODUCTION_APP_ID_PREFIXES.find((p) => appId.startsWith(p));
  if (prod) {
    return {
      allowed: false,
      reason: `App id starts with ${prod} — that is PRODUCTION. Write suites are refused. `
        + 'Point the dev server at staging (.env.development.local) and retry.',
    };
  }
  const safe = WRITABLE_APP_ID_PREFIXES.find((p) => appId.startsWith(p));
  if (safe) return { allowed: true, reason: `App id ${appId.slice(0, 10)}… is on the writable allowlist.` };
  if (allowUnknown) {
    return { allowed: true, reason: `App id ${appId.slice(0, 10)}… allowed by explicit opt-in.` };
  }
  return {
    allowed: false,
    reason: `App id ${appId.slice(0, 10)}… is not a recognised writable database. `
      + 'Add it to E2E_WRITABLE_APP_IDS if it is safe to write to. Refusing by default.',
  };
}

/**
 * Pull the Parse app id out of a request.
 *
 * The JS SDK POSTs it in the BODY as `_ApplicationId` rather than sending
 * `X-Parse-Application-Id`, because a custom header would trigger a CORS
 * preflight. Both forms are accepted; neither present returns null, and the
 * guard treats null as "refuse", never as "probably fine".
 */
export function extractAppId(postData, headers = {}) {
  const header = headers['x-parse-application-id'] ?? headers['X-Parse-Application-Id'];
  if (header) return header;
  try {
    const body = JSON.parse(postData || '{}');
    return body._ApplicationId ?? body.applicationId ?? null;
  } catch {
    return null;
  }
}

/**
 * Whether a sweep should keep deleting.
 *
 * Written after the sweep clicked Delete thirty-odd times on two rows that never
 * disappeared: it re-read the list each pass but never asked whether the last
 * delete had achieved anything. A retry loop with no progress check is an
 * infinite loop with a cap on it — and against a real backend it is also thirty
 * pointless writes.
 */
export function sweepProgress(before, after) {
  if (after === 0) return { continue: false, reason: 'list is clear — nothing left to remove' };
  if (after >= before) {
    return {
      continue: false,
      reason: `no progress: ${after} row(s) could not be deleted. They may be owned by `
        + 'another organization, or the delete may be failing silently. Stopping rather than retrying.',
    };
  }
  return { continue: true, reason: `${before - after} removed, ${after} remaining` };
}

/**
 * Parse the runner's arguments.
 *
 * Extracted and tested because the inline version silently dropped the FIRST
 * positional argument whenever `--repeat` was absent: `indexOf` returned -1, so
 * `repeatAt + 1` was 0, and index 0 was always filtered out. `run-e2e.mjs craft`
 * therefore ran ALL EIGHT suites — including the writers and a full household
 * CSV export — against whatever database the dev server pointed at.
 */
export function parseRunArgs(argv = []) {
  const suites = [];
  let repeat = 1;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--repeat') {
      const n = Number(argv[i + 1]);
      if (Number.isFinite(n) && n > 0) repeat = n;
      i += 1;
    } else if (!a.startsWith('--')) {
      suites.push(a);
    }
  }
  return { suites, repeat };
}
