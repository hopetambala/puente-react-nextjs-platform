# Dashboard dispatch — delivery scope

**Status:** proposed, 2026-08-27. Feeds `red-green-tdd`.
**Covers:** finishing the dispatch the triage rebuild opened, plus the "no records yet"
empty state that was specified for that surface and did not ship.

> The dashboard's concept — a triage queue rather than a scoreboard — was settled
> before this doc and is not re-litigated here. The conclusions it depends on are
> restated inline where they matter, so this page stands on its own.

---

## 1. Why now

`/quick-start` was rebuilt as a triage surface across five commits (`c28077a`…`318d95d`).
Its thesis is one sentence:

> The dashboard's job is to end with the coordinator somewhere else.

It currently ends with them somewhere else and no better off. Queue rows link to
`/data/data-curation` and `/forms/form-manager` unfiltered — the `TODO` at
[triageQueue.js:33-35](../app/epics/DashboardTriage/triageQueue.js#L33-L35) says so
plainly, and stopping there was the right call: shipping `?filter=…` against a page
that ignores it would be a promise the destination doesn't keep.

**Correction to the earlier estimate.** This was scoped as "one repo, one release,
ships same-day." Reading the destination surfaces, that is wrong, and the reason is
worth more than the estimate: **the two screens do not currently mean the same thing
by the same words.** Wiring a param without fixing that would replace a queue that
dispatches nowhere with a queue that dispatches to a contradiction — strictly worse,
because it looks like it works.

---

## 2. Users

| Persona | Surface | What this scope changes for them |
|---|---|---|
| **Data steward** | Manage — curation, record inspector | Primary. Clicks a queue row, expects to land on exactly those rows. |
| **Program manager** | Manage — coverage, exports | Secondary. Reads the queue as a pre-export sanity check. |
| **Field surveyor** | Collect (mobile) | Not a user of this surface. Named because the empty state has to explain that records arrive from *their* phone, not from here. |

---

## 3. The finding that sets the scope

"12 records missing key fields" has **three** different definitions live in the codebase
right now, and no two of them agree.

| # | Where | Predicate | Scope |
|---|---|---|---|
| 1 | Dashboard queue | `Parse.Query.or(...FIELDS.map(f => q.doesNotExist(f)))` — [loadTriage.js](../app/epics/DashboardTriage/loadTriage.js) | Whole class, exact `count()` |
| 2 | Curation "< 60%" | `computeSurveyCompleteness(r) < 60` → **fewer than 5 of 8** fields filled | The fetched page (50 rows) |
| 3 | Curation "Anomalies" | `flagAnomalies` — same `< 60%` threshold, different label | The fetched page (50 rows) |

Three separate disagreements fall out of that table:

- **`''` vs absent.** `computeSurveyCompleteness` counts the empty string as missing;
  `doesNotExist` does not match `''`. A record with `telephoneNumber: ""` is missing a
  key field on one screen and complete on the other.
- **"any one missing" vs "most missing."** A record with 7 of 8 fields is in the
  dashboard's count and *excluded* from curation's `< 60%` bucket. These are not the
  same question with different thresholds; they are different questions.
- **Class scope vs page scope.** `visibleRecords` in
  [DataCurationManager/index.js](../app/epics/DataCurationManager/index.js) filters
  **after** `limit(50).skip(page*50)`. The status and completeness filters therefore
  search within the current page. A page-scoped filter cannot honor a class-scoped
  count, no matter which predicate wins.

The same page-scope defect hits duplicates independently and is worth naming on its
own: `detectDuplicates(results)` runs on the 50 fetched rows, so **the "Duplicates"
filter in curation today finds only duplicates that happen to share a page.** It
silently misses the rest. That is a live bug, not a consequence of this work.

### What that means for the four queue rows

| Row | Reproducible at the destination? | Ships in this scope |
|---|---|---|
| Records missing key fields | **Yes** — server-side `or(doesNotExist ∪ equalTo '')`, exact both ends | ✅ Story 1 + 2 |
| Records with unresolved household link | **Yes** — `exists('householdObjectIdOffline')` + `doesNotExist('householdId')`, exact | ✅ Story 3 |
| Possible duplicate households | **Only if both ends use the same window** — grouping by `householdId + day` is an aggregation the browser SDK cannot do | ✅ Story 4 (window alignment, no Cloud Code) |
| Form renamed since answers collected | **No** — and the destination is probably wrong anyway | ❌ Out of scope, §7 |

Two of four dispatch honestly today. One is fixable by aligning windows. The fourth
needs a decision before it needs code.

---

## 4. Stories

### Story 1 — One definition of "missing key fields", written once

```
As a    data steward
I want  the number I click on the dashboard to be the number of rows I land on
so that I can work the queue instead of re-counting in a spreadsheet to check it
```

The "so that" is the whole scope. A steward who has to verify the queue once will
verify it every time, and then the queue is costing time rather than saving it —
the shadow spreadsheet — screenshots, paper notes, private side-tables — re-earned.
That coping mechanism, not a competing product, is what this tool exists to displace.

**Scenario: an empty string is missing on both screens**
```
Given   a SurveyData record whose telephoneNumber is ""
and     whose other seven key fields are populated
When    the dashboard counts "records missing key fields"
and     the curation surface filters to that signal
Then    both include the record
```

**Scenario: one missing field is enough, on both screens**
```
Given   a record with dob absent and the other seven key fields populated
When    the steward clicks the "records missing key fields" row
Then    that record is in the resulting list
and     the destination does NOT reuse the "< 60%" completeness bucket,
        which would exclude it
```

**Scenario: the predicate exists in exactly one place**
```
Given   a shared module exports missingKeyFieldsQuery({ Parse, org })
When    the dashboard loader and the curation fetch each build the filter
Then    both call that function
and     neither restates SURVEY_COMPLETENESS_FIELDS
```

**Notes for implementation** — constraints, not a design:

- The predicate is `or(...FIELDS.flatMap(f => [doesNotExist(f), equalTo(f, '')]))`.
  Sixteen sub-queries inside one `Parse.Query.or` is still **one round trip**.
- Every sub-query is org-scoped on `surveyingOrganization`. The viewer's org comes
  from `_User.organization`; the record's owner is a property of the record.
- Where the module lives: `app/modules/` is the data layer by the repo's layering convention. Putting the predicates there also closes the standing
  `TODO(layering)` in `loadTriage.js` — the dashboard currently reaches into the
  `DataCurationManager` epic and drags React and CSS into its module graph. Closing it
  is part of this story, not scope creep: the whole point is that there is one
  definition, and a definition that lives inside a UI epic will drift again.

---

### Story 2 — Curation filters that signal server-side

```
As a    data steward
I want  the filtered view to cover every matching record, not just the page I'm on
so that the total I was promised is the total I can work through
```

**Scenario: the filtered total is the class total**
```
Given   300 records match the missing-key-fields predicate
and     the page size is 50
When    the steward arrives at /data/data-curation?signal=missing-key-fields
Then    the total reads 300
and     the first 50 matching records are shown
and     paging forward shows the next 50 of the same 300
```

**Scenario: the URL is the filter's source of truth**
```
Given   the steward arrives with ?signal=missing-key-fields
When    the page loads
Then    the filter control reflects the active signal
and     the URL can be copied to a colleague and reproduce the same view
```

**Scenario: an unrecognised signal degrades to unfiltered**
```
Given   the steward arrives with ?signal=nonsense
When    the page loads
Then    the unfiltered records render
and     no error is shown and nothing throws
```

**Scenario: the round-trip budget does not grow**
```
Given   the signal filter is applied from the URL on first load
When    the page fetches
Then    find() and count() are issued once, concurrently
and     no query is added per queue signal
```

That last scenario is a real regression risk, not boilerplate: this page already
runs `Promise.all([q.find(), q.count()])` on **every page turn**, and the count is
usually the slower half. Adding a predicate makes it slower still. Do not also add
a query. (Reducing the count to once-per-filter-change is a worthwhile follow-up and
is deliberately not in this scope.)

---

### Story 3 — Unresolved household links dispatch the same way

```
As a    data steward
I want  the unresolved-household-link row to land me on exactly those records
so that I can repair them without hunting for them first
```

Same shape as Stories 1–2, different predicate:
`exists('householdObjectIdOffline')` + `doesNotExist('householdId')`. Exact on both
ends, so it can ship in the same release.

**Scenario: orphans are shown, not filtered away**
```
Given   a record whose offline parent link never resolved server-side
When    the steward arrives at /data/data-curation?signal=unresolved-parent
Then    that record appears in the list
and     its unresolved parent is visible in the row, not silently omitted
```

Filtering the null-parent case out of a join is how orphans stay invisible; this has
required hand-repair in production before.

---

### Story 4 — Duplicates: same window on both screens

```
As a    data steward
I want  the duplicate count and the duplicate list to be computed over the same records
so that clicking "3 possible duplicates" does not show me zero
```

Grouping by `householdId + day` is an aggregation, so neither screen can be exact
until it moves to Cloud Code. But they can at least be **the same approximation**:
the dashboard reduces over its 1000-row sample; curation reduces over the current 50.

**Scenario: both screens reduce over the same window**
```
Given   the dashboard reports N possible duplicates from its 1000-row sample
When    the steward arrives at /data/data-curation?signal=possible-duplicates
Then    the destination detects duplicates over an equally-sized recent window
and     the resulting count matches the dashboard's
```

**Scenario: the window is disclosed, and the row stays hedged**
```
Given   the destination's duplicate view is window-scoped, not exhaustive
Then    it says so at the point of display
and     the dashboard row keeps its "estimated" marker
```

**Note:** curation already fetches a 1000-row sample for its facet dropdowns, selecting
only `surveyingUser` and `communityname`. Adding `householdId` to that `select()` makes
the wider detection possible at **zero extra round-trips** — `createdAt` comes free on
every Parse object. This also fixes the page-scoped duplicate bug in §3 as a side
effect, which is the main reason it belongs in this release rather than waiting for
Cloud Code.

---

### Story 5 — "No records yet" is not "nothing needs attention"

```
As a    coordinator at a partner org logging in for the first time
I want  the screen to tell me records arrive from the mobile app
so that I don't read an empty database as a clean bill of health
```

Today, a brand-new org sees four exact zeros and the queue renders **"Nothing needs
attention — every record that synced passed the quality checks."** That is a green
all-clear on an empty database, at first login, before anyone trusts the tool. The
coverage rail and the sync ribbon both handle this correctly; the queue — the focal
point, the 65%-width element — does not. The surface's definition of done required
these two empty states be distinguished; it shipped with only one.

This matters more than a normal empty state because **data is not entered in Manage.**
A new user staring at an empty screen has no way to know the next action lives on
someone else's phone. That sentence is the entire onboarding for this surface.

**Scenario: an org with no records is told where records come from**
```
Given   the organization has never synced a record
When    the dashboard renders
Then    the queue says no records have arrived yet
and     it says records arrive when field staff sync from the mobile app
and     it does NOT say the checks passed
```

**Scenario: a clean org still gets its all-clear**
```
Given   the organization has synced records
and     every check ran and returned zero
Then    the queue says nothing needs attention
```

**Scenario: a failed freshness query is not reported as an empty org**
```
Given   the last-sync query failed
When    the dashboard renders
Then    the queue does NOT claim the organization has no records
and     it reports an incomplete result instead
```

That third scenario is the load-bearing one. `loadTriage` resolves a failed read to
`null` via `soft()`, so a failed last-sync query produces `lastSyncAt: null`, which
`summarizeSyncState` reads as status `never` — indistinguishable from a genuinely
empty org. The loader has to distinguish "query returned nothing" from "query did not
run" before the page can key an empty state off it. This is the same class of bug as
commit `318d95d`, one field over.

**Existing coverage is safe:** the `triage-clear` test's fixture supplies a
`lastSyncAt` three hours old, so it keeps its meaning and should keep passing.

---

## 5. Out of scope — explicitly

- **The form-drift row's destination.** See §7; it needs a decision, not an estimate.
- **A `dashboardTriage` Cloud Code function.** Named as a dependency in §6, not built here.
- **Making duplicates exact.** Requires the above.
- **Reducing curation's `count()` to once per filter change.** Real, adjacent, separate.
- **Search, surveyor, community, and date filters in the URL.** Only the queue signals.
- **Any change to the dashboard's layout, copy tone, or the four rows themselves.**
  The rebuild's explicit rejections stand — no greeting, no activity feed, no forms
  list, no chart. Pressure-testing the row set is a discovery question, not this scope.
- **Translating the new keys into the other five locales.** Add to `eng`, flag the rest.
  Never machine-guess a locale.

---

## 6. Dependencies & risks

| Item | Owner | Note |
|---|---|---|
| Shared predicate module location | Eng | Blocks Stories 1–3; decide before RED |
| `dashboardTriage` Cloud Code fn | `puente-node-cloudcode` | Not blocking this scope. Makes duplicates and drift exact and collapses 6 reads to 1. **Not gated on a mobile release** — it is a fast train. |
| Curation `count()` latency | Eng | Already 2 predicate evaluations per page turn; measure on Slow 3G before and after |
| `resolveParseClass('env-health')` returns `'EnvironmentalHealth'` | Eng | That class does **not** exist in `schema/schema.json`; the real one is `HistoryEnvironmentalHealth`. Pre-existing, unrelated, filed separately. |

**Measurement to record in the PR**, per the data-layer budget: round-trips and rows
transferred for `/data/data-curation` with and without the signal filter, on throttled
Slow 3G. "Improved performance" is not a claim anyone can check.

---

## 7. Open questions

### Decided 2026-08-27 — the drift row lands in Form Creator

**The row opens the drifted form in Form Creator, with the renamed questions
called out and the count of answers stranded under the old key.**

Rejected: Form Manager with the form pre-selected (cheapest, but the destination
can only confirm the form exists — the steward still has nowhere to go); expanding
the row in place (turns the dispatcher into a reading surface); leaving it
unlinked (a dead row at critical severity teaches people to skim past all of them).

The reasoning that decided it: every other option reports the drift. Only this one
sits where the drift is *caused* — `formikKey` is derived from `label` once at
field-creation time and never re-derived — so it is the only option that can also
warn the next person before they rename something. Making the label/formikKey
relationship visible in Form Creator was already the stated requirement for that
surface — a rename must show what it does to submissions already collected.

Two consequences:

- **`driftedFormIds` must survive the loader.** `detectFormDrift` computes them
  and `loadTriage` keeps only `count`, discarding the IDs the link needs.
- **This is a new view, not a param.** It does not ship with Stories 1–5. Scope it
  as its own piece of work against the Form Creator requirement.

### Still open

| Question | Owner | Needed by |
|---|---|---|
| Does `< 60% completeness` still earn a place in the filter bar once the queue's definition is wired, or does it become a third thing meaning almost-but-not-quite the same? | Product + Eng | Story 2 review |

---

## 8. Test list for `red-green-tdd`

One failing test per behavior, in this order. Every scenario above is a test; these
are the ones whose *absence* would let the bug back in.

**Shared predicate** (pure, no mocking — the cheap wins)
1. includes a record with a key field set to `''`
2. includes a record missing exactly one key field
3. is the only place `SURVEY_COMPLETENESS_FIELDS` is read by both callers

**Query contract** (mock the `Parse.Query` chain; assert which methods were called)
4. every sub-query in the OR is scoped to `surveyingOrganization`
5. `distinct` is never called — the browser SDK has no Master Key
6. the signal filter adds no round trip: `find()` + `count()` once, concurrently
7. curation's facet sample selects `householdId` so wide duplicate detection is possible

**Dispatch**
8. a queue row's href carries its signal
9. an unknown `?signal=` renders unfiltered and does not throw
10. the filter control reflects the URL on first load

**Empty states**
11. never-synced org → "no records yet", not the all-clear
12. synced org, all checks zero → the all-clear (regression guard on existing behavior)
13. failed last-sync query → neither, and says so

**i18n**
14. every key the changed surfaces use exists in `public/locales/eng/common.json`
    — extend the existing assertion in `__tests__/pages/quick-start/index.test.js`

---

## 9. i18n keys to add (`eng` only; flag the other five)

| Key | English |
|---|---|
| `triage_no_records` | No records yet |
| `triage_no_records_sub` | Records appear here when field staff sync from the mobile app. |
| `curation_signal_missing_key_fields` | Records missing key fields |
| `curation_signal_unresolved_parent` | Records with an unresolved household link |
| `curation_signal_possible_duplicates` | Possible duplicate households |
| `curation_signal_window_note` | Detected within the most recent 1,000 records. |

Counts interpolate, never concatenate. The 65/35 split is the first thing a long
translation breaks; region labels tolerate 2× length. No RTL locale ships since
`ara` was retired (2026-08-28), but keep logical properties — cheap insurance.

---

## 10. Assumptions to validate

None of these is evidenced in the repo. The first three are one 30-minute call with
one coordinator — ask them to talk through their Monday morning, and don't show them
the screen until after.

1. **"Where do I send a team next" is the program manager's real question.** The whole
   coverage rail rests on it. The surface's research cites DHIS2 and the offline-first
   literature for the general principle, but this specific claim is inferred, not sourced.
2. **`QUIET_DAYS = 14`.** [coverage.js](../app/epics/DashboardTriage/coverage.js) says it
   outright: "tune it with a coordinator, not by intuition." A self-declared unvalidated
   number in shipped code.
3. **`MAX_ROWS = 6`** on the coverage rail — set from visual QA, not from how many
   communities a coordinator actually manages.
4. **Stewards will act on queue rows rather than learn to ignore them.** Cheapest test:
   `count()` of `SurveyData` where `editedAt` is within 7 days, snapshotted weekly. If it
   doesn't rise after this scope ships, the queue isn't converting — and the answer is to
   stop investing in the dashboard and go fix the source in Collect.

**Start the weekly snapshot before this ships.** It costs zero code and it is the only
before/after this scope will ever have.
