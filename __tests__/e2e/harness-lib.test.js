import {
  describeSelector,
  extractAppId,
  mayWrite,
  summarizeRuns,
  sweepProgress,
  verdict,
} from '../../e2e/lib/harness-lib.mjs';

/**
 * Pure logic for the E2E harness. Everything here is the part that decides
 * whether a run is trustworthy, so it is the part that must not itself be
 * guesswork.
 *
 * Shaped by Shopify's mobile E2E write-up: their suite reached the point of
 * "blocking more good PRs than bad ones" and had to be pulled from CI. The two
 * causes they name — fixed sleeps, and asserting a node exists rather than that
 * a person can see it — both showed up in our own scripts, and both produced
 * false failures in a single session.
 */
describe('describeSelector — behaviour over implementation', () => {
  it('prefers a role+name query and says so', () => {
    const s = describeSelector({ role: 'link', name: /missing key fields/ });

    expect(s.kind).toBe('role');
    expect(s.safe).toBe(true);
    expect(s.description).toMatch(/link/);
  });

  it('accepts a visible-text query as behavioural', () => {
    expect(describeSelector({ text: 'Needs attention' }).safe).toBe(true);
  });

  it('marks a test-id query unsafe, because it can pass while nothing is visible', () => {
    const s = describeSelector({ UNSAFE_testId: 'sync-ribbon', why: 'no accessible name yet' });

    expect(s.safe).toBe(false);
    expect(s.kind).toBe('testid');
    expect(s.description).toMatch(/UNSAFE/);
    expect(s.description).toMatch(/no accessible name yet/);
  });

  it('refuses a test-id query with no stated reason, so the escape hatch stays visible', () => {
    expect(() => describeSelector({ UNSAFE_testId: 'sync-ribbon' }))
      .toThrow(/why/i);
  });

  it('refuses an empty selector rather than silently matching everything', () => {
    expect(() => describeSelector({})).toThrow(/selector/i);
  });
});

describe('summarizeRuns — the stability gate', () => {
  const run = (results) => ({ results });

  it('reports a check that passed every run as stable', () => {
    const s = summarizeRuns([
      run({ a: true, b: true }),
      run({ a: true, b: true }),
      run({ a: true, b: true }),
    ]);

    expect(s.flaky).toEqual([]);
    expect(s.failed).toEqual([]);
    expect(s.stable).toEqual(['a', 'b']);
  });

  it('separates a consistently failing check from a flaky one', () => {
    // `b` is the dangerous one: a suite that fails intermittently is what
    // teaches people to re-run instead of read.
    const s = summarizeRuns([
      run({ a: false, b: true }),
      run({ a: false, b: false }),
      run({ a: false, b: true }),
    ]);

    expect(s.failed).toEqual(['a']);
    expect(s.flaky).toEqual(['b']);
  });

  it('reports the pass rate per flaky check so the gate has a number to judge', () => {
    const s = summarizeRuns([run({ b: true }), run({ b: false }), run({ b: true }), run({ b: true })]);

    expect(s.rates.b).toBeCloseTo(0.75, 5);
  });

  it('treats a check missing from a run as a failure, not as absent', () => {
    // A check that did not run is not a check that passed. Silently ignoring it
    // is how a suite reports green while covering less than it did yesterday.
    const s = summarizeRuns([run({ a: true, b: true }), run({ a: true })]);

    expect(s.flaky).toContain('b');
    expect(s.rates.b).toBeCloseTo(0.5, 5);
  });
});

describe('verdict — whether a suite may block CI', () => {
  it('blocks promotion when any check is flaky, however rarely', () => {
    const v = verdict(summarizeRuns([{ results: { a: true } }, { results: { a: false } }]));

    expect(v.promotable).toBe(false);
    expect(v.reason).toMatch(/flaky/i);
  });

  it('blocks promotion on an outright failure', () => {
    const v = verdict(summarizeRuns([{ results: { a: false } }, { results: { a: false } }]));

    expect(v.promotable).toBe(false);
    expect(v.reason).toMatch(/fail/i);
  });

  it('requires more than one run before it will call anything stable', () => {
    const v = verdict(summarizeRuns([{ results: { a: true } }]));

    expect(v.promotable).toBe(false);
    expect(v.reason).toMatch(/one run|single run|at least/i);
  });

  it('promotes only when every check passed every run, across several runs', () => {
    const v = verdict(summarizeRuns([
      { results: { a: true } }, { results: { a: true } }, { results: { a: true } },
    ]));

    expect(v.promotable).toBe(true);
  });
});

/**
 * The guard exists because `.env.local` in this repo points at PRODUCTION, and
 * the sibling repo's `.env.prod` is mislabelled staging. A filename cannot be
 * trusted; an app id can.
 */
describe('mayWrite — the production guard', () => {
  it('refuses the production app id', () => {
    const v = mayWrite('vBdTHqQU31abcdef');

    expect(v.allowed).toBe(false);
    expect(v.reason).toMatch(/production/i);
  });

  it('allows a staging app id', () => {
    expect(mayWrite('ZvGwjA7cemXYZ').allowed).toBe(true);
  });

  it('fails closed when the app id is unknown or absent', () => {
    // "I could not tell which database this is" is not a reason to write to it.
    expect(mayWrite('').allowed).toBe(false);
    expect(mayWrite(undefined).allowed).toBe(false);
    expect(mayWrite(null).reason).toMatch(/unidentified|no parse app id/i);
  });
});

/**
 * The Parse JS SDK does NOT send `X-Parse-Application-Id`: it POSTs the app id
 * in the request BODY as `_ApplicationId`, to avoid a CORS preflight. The first
 * version of the guard looked only at headers, found nothing, and refused to
 * run — correctly, but for the wrong reason. Verified against a real request.
 */
describe('extractAppId — where Parse actually puts the app id', () => {
  it('reads _ApplicationId out of the request body', () => {
    expect(extractAppId('{"username":"Test","_ApplicationId":"ZvGwjA7cem"}', {})).toBe('ZvGwjA7cem');
  });

  it('still accepts the header form, in case a caller uses REST directly', () => {
    expect(extractAppId(null, { 'x-parse-application-id': 'ZvGwjA7cem' })).toBe('ZvGwjA7cem');
  });

  it('returns null rather than guessing when neither is present', () => {
    expect(extractAppId('{"username":"Test"}', {})).toBeNull();
    expect(extractAppId(null, {})).toBeNull();
  });

  it('survives a body that is not JSON', () => {
    expect(extractAppId('not json at all', {})).toBeNull();
  });
});

/**
 * The sweep clicked Delete 30+ times on two rows that never went away, because
 * it re-read the list each pass but never asked whether the LAST delete had
 * achieved anything. A retry loop with no progress check is an infinite loop
 * with a cap on it.
 */
describe('sweepProgress — stop when deleting stops working', () => {
  it('continues while the count is falling', () => {
    expect(sweepProgress(5, 4).continue).toBe(true);
  });

  it('stops when a delete changed nothing', () => {
    const p = sweepProgress(2, 2);

    expect(p.continue).toBe(false);
    expect(p.reason).toMatch(/no progress|could not be deleted/i);
  });

  it('stops when everything is gone', () => {
    const p = sweepProgress(1, 0);

    expect(p.continue).toBe(false);
    expect(p.reason).toMatch(/clear|done|nothing/i);
  });

  it('stops if the count somehow grew, rather than looping harder', () => {
    expect(sweepProgress(2, 3).continue).toBe(false);
  });
});
