---
name: red-green-tdd
description: >
  Use for ALL new behavior in Puente Manage — adding or changing a function,
  component, page, epic, hook, or fixing a bug. Orchestrates strict
  red-green-refactor TDD across three context-isolated subagents
  (tdd-test-writer → tdd-implementer → tdd-refactorer) with hard gates: the test
  is written and seen FAILING first (RED), then minimum code makes it pass
  (GREEN), then it is refactored with the suite staying green. A change that
  lands without a test that was seen failing first is not done. This is the
  project's standing rule (see the user memory `feedback_tdd_first.md`).
---

# Red-Green TDD — orchestrate test-first, always

In this repo, **no production behavior changes without a test that was watched
failing first.** Tests are written *before* the code, to drive it into
existence — for new features *and* bug fixes. If you're about to edit a source
file before its test exists, stop and run the pipeline.

This skill is the **orchestrator**. It runs each phase as a separate subagent so
the phases can't pollute each other's context: the test writer describes the
desired behavior without knowing the implementation, and the implementer sees
only a failing test, not your design ideas.

## The pipeline (one behavior at a time)

For each distinct, assertion-worthy behavior, run these three phases **in order,
honoring the gates between them.**

### Phase 1 — RED  →  invoke `tdd-test-writer`
Spawn the `tdd-test-writer` agent with **just the behavior requirement** (no
implementation hints). It writes one failing test and returns the test path, the
failure output, and a one-line summary.

> **GATE 1 — do NOT proceed to GREEN until RED is confirmed.** The returned
> failure must be the genuine assertion missing — not `Cannot find module`,
> `X is not a function`, or a render crash. If the failure is for the wrong
> reason, send it back to the test writer. No red, no green.

### Phase 2 — GREEN  →  invoke `tdd-implementer`
Spawn the `tdd-implementer` agent with **only the failing test path + its
failure output**. It writes the minimum code to pass and returns the modified
source files and the passing output.

> **GATE 2 — do NOT proceed to REFACTOR until the test passes.** If the
> implementer reports the test seems wrong, fix the test (re-enter Phase 1) —
> never let the implementer edit tests to force green.

### Phase 3 — REFACTOR  →  invoke `tdd-refactorer`
Spawn the `tdd-refactorer` agent with the list of changed files. It applies
behavior-preserving cleanups (dedup, naming, [dlite tokens](../dlite-design-system/SKILL.md))
or returns "No refactoring needed", and re-runs the full suite green.

Then move to the next behavior and repeat.

## Never

- Write implementation before the test.
- Proceed to Green without seeing Red fail **for the right reason**.
- Edit, skip, weaken, or delete a test to make it pass.
- Skip the Refactor evaluation (skipping is fine; *not evaluating* is not).

## When to run it inline vs. via subagents

Default to the **subagent pipeline** for any feature or multi-file work — the
context isolation is the point. For a trivial single-assertion tweak you may run
the same loop inline (write test → see it red → implement → green → refactor),
but the gates are identical and non-negotiable.

## Bug fixes are TDD too

Start with a **failing regression test** that reproduces the bug:
1. Test the *correct* behavior — its red proves you reproduced the bug.
2. Fix the code to green.
3. The test now guards against regression.

When the buggy behavior already has a test asserting the *wrong* thing (written
to match broken code), fix that test first, watch it go red against current
code, then fix the source. (This is exactly how the TopBar `firstname`/`lastname`
initials bug was fixed.)

---

## Project conventions (reference for the subagents)

### Running tests
```
yarn jest path/to/file.test.js      # one file — the red/green loop
yarn jest -t "partial test name"    # one test by name
yarn jest                           # full suite — before declaring done
```

### Test location & setup
- `__tests__/` mirrors source: `app/epics/Foo/index.js` →
  `__tests__/app/epics/Foo/index.test.js`.
- Begin files with `import '@testing-library/jest-dom';`.
- React Testing Library: `render`, `screen`, `fireEvent`/`userEvent`,
  `waitFor`; query by role/text the user sees.

### Mock boundaries (match neighboring files)
- `jest.mock('app/impacto-design-system', …)` — real prop API: `Button` renders
  `text` (not children), uses `isDisabled`; `Modal` →
  `open`/`handleClose`/`text`/`action`/`actionText`/`intent`; `Toast` → `text`.
- `jest.mock('parse', …)` — `Parse.Query` chain methods return `this`, with
  `find`/`count`/`save`. Browser SDK can't use the Master Key: mock
  `find`+`select`+`limit` for sampling, **never** `distinct`.
- `jest.mock('next/router', …)` and `jest.mock('next-i18next', …)` for pages.

### Targeting
- **Pure functions** (completeness scoring, dedup, `levenshtein`, reducers) are
  the cheapest, highest-value targets — export and test inputs → outputs.
- **Components** — test observable behavior (what renders, what a click calls),
  one behavior per `it`.

## Definition of done

1. Every new/changed behavior has a test that was **seen failing first**.
2. `yarn jest` — full suite green.
3. `yarn build` — clean (for page/component changes).
4. Styling touched? [dlite scan](../dlite-design-system/SKILL.md) clean for the
   changed files.

If you can't honestly say each test was red before it was green, the work isn't
following this skill — go back and prove the test fails.
