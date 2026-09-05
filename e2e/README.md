# E2E

**One command. Never hand-roll a Playwright script.**

```bash
node e2e/run-e2e.mjs --repeat 3
```

```
run-e2e.mjs                       every suite, one run
run-e2e.mjs craft                 one suite
run-e2e.mjs --repeat 3            the stability gate — required before trusting a result
run-e2e.mjs sign-in dashboard     several
```

Needs a dev server (`preview_start`, never `yarn dev` in Bash). Credentials
default to `Test` / `test`; override with `PARSE_USERNAME` / `PARSE_PASSWORD`.
Artifacts land in `.e2e-artifacts/` (gitignored).

| Suite | Writes? | Covers |
| --- | --- | --- |
| `sign-in` | no | The gate, refusal of a bad password, session across reload, logout |
| `sign-up` | **opt-in** | Registration form, field types, password-mismatch refusal. The write is behind a flag — see below |
| `dashboard` | no | Quantities and denominators, hover, dispatch, Spanish, narrow viewport |
| `craft` | no | Keyboard, focus ring, colour-independence, signature, hierarchy, composition, failed-connection state |
| `features` | no | Round-trip cost, every queue row's dispatch, rail affordance, nav, reload, unmount leak |
| `form-create` | **yes** | Build → publish → find → delete, and sweeps leftover `e2e-*` forms |
| `form-edit` | **yes** | Create, edit in a fresh session, verify against the server, confirm no duplicate, delete |
| `data-export` | reads real data | Really downloads the CSV, checks it is not an error body, deletes it |

---

## The environment: which database am I writing to?

**This repo's `.env.local` points at PRODUCTION.** The sibling
`puente-node-cloudcode/.env.prod` is *mislabelled* and holds staging
credentials. A filename is not evidence here.

`.env.development.local` (gitignored) points local dev at **staging**, and Next
gives it precedence over `.env.local` in development. Keep it.

Any suite that writes — and `data-export`, which pulls a complete household CSV —
calls `requireWritableEnvironment()`. It reads the app id the browser **actually
sends to Parse** (`_ApplicationId`, in the POST body; the JS SDK sends no
`X-Parse-Application-Id` header) and checks it against an **allowlist**.

It fails closed: production is named and refused, and anything not on the
allowlist is *also* refused. An earlier version was a one-entry denylist while
claiming to fail closed — so an unrecognised id was allowed, and a second
production app or a renamed instance would have passed. Widen it deliberately
with `E2E_WRITABLE_APP_IDS`.

---

## The four rules

Taken from Shopify's mobile E2E post-mortem, where fixed sleeps and
implementation-shaped assertions accumulated until the suite "blocked more good
PRs than bad ones" and was pulled from CI. Our own audit before this harness
existed: **15 fixed sleeps vs 11 conditional waits, 35 test-id selectors vs 1
behavioural query**, and three false failures in a single session.

### 1. Every step that changes the screen declares what comes next

`go`, `click` and `step` require an `expect` and throw without one.

```js
await s.go('/quick-start', { role: 'link', name: /missing key fields/i });
await s.click({ role: 'link', name: /unresolved household/i }, { text: /curation/i }, 'open curation');
```

**Choose an `expect` that proves the thing you need.** This is the mistake that
keeps happening: a heading renders before the fetch resolves; "+ Create form"
exists before any form loads; Form Manager's built-in list arrives before the
custom-forms section. Each produced a confident, wrong conclusion.

### 2. Selectors are behavioural

```js
{ role: 'link', name: /records missing key fields/i }   // ✓ fails if a person couldn't use it
{ text: /most recently synced records/ }                // ✓
{ UNSAFE_testId: 'triage-loading', why: 'aria-hidden skeleton, no name to query' }  // last resort
```

`UNSAFE_testId` throws without a `why`, and every use is printed at the end of
the run.

### 3. Waits are conditional

`s.see(spec)` waits for visibility. `UNSAFE_pause(ms, why)` throws without a
reason and is reported. It is legitimate about once — the unmount sweep, where
varying the timing *is* the test.

### 4. Failures self-diagnose

Every failed check writes a screenshot **and** a `.txt` with the URL, visible
text, and recent console. Read those first. They have already caught three of my
own wrong assumptions faster than re-running would have.

---

## Console errors: owned vs foreign vs expected

A suite fails only on errors from surfaces it owns (`owned` in `openSession`).
Errors elsewhere are printed, not failed — failing on debt the author cannot act
on is how a check stops being read.

- **Unattributable.** *"State update on an unmounted component"* fires when a
  previous page's pending work resolves, so the URL already belongs to the next
  page. Never owned; test it directly (see the leak sweep in `features`).
- **Deliberate.** Wrap a scenario that causes its own errors:
  ```js
  await s.withExpectedErrors(/ERR_FAILED|net::/i, async () => { … });
  ```
  Scoped, so the tolerance cannot leak past the scenario that needs it. Used for
  the offline test and for Parse's `404 POST /login` on a bad password, which is
  the correct rejection rather than a fault.

---

## Writes and cleanup

**Default to leaving nothing behind.** Where cleanup is possible, do it through
the UI so the delete path is covered too, and sweep leftovers from crashed runs.

Where cleanup is *impossible*, the write is opt-in and says so:

- **`sign-up`** does not register by default. Registration requires email
  verification, so a new account cannot sign in, so it cannot reach "Delete
  user"; and `Test` is not an org admin (`/organization-admin` redirects), so no
  admin surface can remove it either. There is no UI path to undo a
  registration. `E2E_ALLOW_ORPHAN_USER=1` performs the real write and reports
  the account a human must delete. The flag is the consent.
- **`form-create`** sweeps every `e2e-*` form at the end. The scoping is a
  substring match on the whole row, so a human form whose name *or description*
  contained `e2e-form` would be in range — unlikely, but not "never". A row whose
  name cannot be parsed is refused rather than deleted.

---

## The stability gate

```bash
node e2e/run-e2e.mjs --repeat 3
```

Checks are **stable** (passed every run), **flaky** (passed some), or **failing**
(passed none). A check missing from a run counts as a failure — a check that
stopped running is not a check that passed.

`PROMOTABLE` requires **at least two runs and zero flaky checks.** Not a
percentage: a single intermittent check is the disease, not an acceptable rate
of it. The dev server talks to remote Parse, so one green run proves little.

---

## Writing a new suite

1. Add it under `e2e/suites/` and register it in `SUITES` in `run-e2e.mjs`.
2. `const s = await openSession({ suite: 'name', owned: [/route/] }); await s.login();`
3. If it writes: `await s.requireWritableEnvironment();` immediately after login.
4. `s.go` / `s.click` / `s.step` with a real `expect`; `s.see` to wait;
   `s.check(name, pass, detail)` to assert.
5. **Check names are the gate's key** — unique and stable across runs. The
   harness throws on a duplicate.
6. End with `const { failed } = await s.finish(); process.exit(failed.length ? 1 : 0);`
7. Run `--repeat 3` before believing it.

Pure logic (selector policy, app-id extraction, flakiness maths, the verdict)
lives in `e2e/lib/harness-lib.mjs` and is unit-tested by
`__tests__/e2e/harness-lib.test.js`. Changing the gate's strictness means
changing those tests first.

---

## Known findings these suites surfaced

Left failing on purpose where they are real. Muting them would defeat the point.

- **RETRACTED — there was no such bug.** An earlier version of this file
  reported that a published form does not appear in Form Manager in its creating
  session. That was wrong: the suite's post-publish wait matched the Publish
  button's own label, so it returned instantly and the suite queried Form Manager
  mid-request. `form-create` now asserts the form appears immediately, with no
  reload. Recorded here rather than deleted, because the retraction is the more
  useful lesson: a wait satisfied by chrome is indistinguishable from a product
  defect until you look at the network.
- **Pre-existing React warnings**, reported not failed: `Stack` propTypes on
  `/forms/form-manager` and `/account/register`, a `forwardRef` warning, and a
  `does not recognize the prop` warning caused by `FormInput` spreading
  `errorobj` onto the DOM.
- **The organization picker has a visible label with no programmatic
  association** and no `combobox` role, so a screen-reader user may not hear what
  the field is. Lives in the design system's `FormSelectAutoComplete`.

## Gotchas that have cost time

- **`yarn build` wipes `.next` under a running dev server**, and the suites then
  fail with connection errors that look like product bugs. Build last, or restart
  the server. `run-e2e.mjs` fails fast rather than producing a wall of noise.
- **The dev server hits remote Parse.** Flaky by nature; hence the gate.
