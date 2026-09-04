# Puente Manage — Design Direction

**One page. The north star.** Everything in `.interface-design/system.md` is a
decision record; this is the thing decisions are measured against.

Status: written 2026-08-21 from industry research + an audit of the current
codebase. Supersedes the previous `_design_handoff_puente_manage_redesign/`
artifacts, which were removed.

---

## 1. The problem this product actually has

Puente Manage is not a dashboard problem. It is a **trust** problem.

Data arrives here asynchronously from phones that were offline in a community
hours or days ago. By the time a coordinator sees a record, they cannot tell —
from the interface — any of the things that determine whether they can act on it:

- Is this everything, or everything *that has synced*?
- Was this collected today, or received today?
- Is this household in here twice, or twice-visited?
- Is this column empty because nobody answered, or because the form was renamed?
- Does this export contain all the rows, or the first thousand?

The offline-first UX literature names the consequence precisely: when people
can't tell whether data is current, **they invent their own logic** — screenshots,
paper notes, a private spreadsheet, double entry.
([Pavilion](https://pavilion.network/blog/local-first-content-caching-offline-ux),
[Developers Voice](https://developersvoice.com/blog/mobile/offline-first-sync-patterns/))

That shadow spreadsheet is the real competitor. Not Kobo, not ODK, not Excel as a
product — **Excel as a coping mechanism.**

> ### The north star
>
> **Make the state and trustworthiness of every record legible, so the shadow
> spreadsheet has no reason to exist.**

Measurable, non-aspirational version: *a coordinator can answer "can I trust this
number?" without leaving the screen it appears on.* That is the bar. Not "modern",
not "clean", not "intuitive."

---

## 2. What that makes us

**A records instrument, not an analytics product.**

The distinction is load-bearing and it is where the previous direction went wrong.
An analytics product's job is to summarize — to compress many rows into one
insight. A records instrument's job is to let someone **find and fix the specific
wrong row**, then trust the summary as a consequence.

Puente Manage is the second thing. Coordinators are accountable for individual
households, by name, to funders and to the people surveyed. So:

| We are | We are not |
|---|---|
| The row is the atom | The chart is the atom |
| Precision, then aggregate | Aggregate, then drill down |
| "Show me what's wrong" | "Show me how we're doing" |
| A tool you work *in* for hours | A page you glance at |

The right references are clinical records systems, financial back-office tools,
and DHIS2's data-quality surfaces — where a data-quality dashboard exists to
*drive correction activity* at every level, not to decorate a status meeting
([DHIS2](https://docs.dhis2.org/en/implement/health/chis-community-health-information-system/implementation/data-quality-and-use.html)).
The wrong reference — and the default every AI and most templates reach for — is
the marketing-analytics dashboard: gradient KPI cards, donut charts encoding a
single number, sparklines without axes.

---

## 3. Three principles, in priority order

When two principles conflict, the earlier one wins.

### I. Provenance is a first-class citizen

Every record carries where it came from and when, and the interface says so
without being asked. This is the principle that distinguishes this product.

- **Two timestamps, never conflated.** `createdAt` is when Parse *received* the
  record. It is not when fieldwork happened. Label it **"Synced"** — never
  "Created", never "Date". Where true collection time exists, show it as
  **"Collected"** and let the gap between them be visible. A record collected
  Tuesday and synced Friday tells a coordinator something real about a
  community's connectivity.
- **Freshness at the point of work.** Last successful sync, and how many records
  came with it, live *on the records surface* — not on a settings page.
- **Edits are annotations, not overwrites.** `editedAt` / `editedBy` exist on
  `SurveyData`; surface them. A curated value shows that it was curated, by whom.
  > **Honest limit, verified 2026-08-21:** these are **single-value** fields —
  > last editor and last edit time only. There is **no audit-log class.** The
  > repo README claims a `SurveyDataActivity` class; it does not exist in
  > `schema/schema.json` and is referenced nowhere in code. So "the full edit
  > history is visible" is **not buildable today** — it needs a new Parse class
  > in `puente-node-cloudcode`. Design to *last-edit* provenance now, and treat
  > the trail as a named backend dependency rather than pretending it exists.
- **Never delete to resolve.** Duplicates get *annotated and superseded*, never
  silently removed — keep the trail for audits and appeals. Same caveat: with no
  audit class, "superseded" needs a field somewhere to live. Name it before
  designing a flow that assumes it.

### II. Sampling and completeness are always disclosed

The most dangerous thing this interface can do is present a partial answer in the
visual language of a complete one.

- A count that came from `count()` and a count that came from the length of a
  capped `find()` **must not look the same.** A sampled figure is marked as
  sampled, at the point of display, every time.
- A filter dropdown built from a 1000-row sample says so. "Communities seen in
  recent records" is honest; "Communities" is a lie once the class grows.
- A completeness percentage states its denominator. The current survey metric
  covers **8 of ~65 fields** — so it is **"Key fields: 8/8"**, not "100%
  complete." A metric label that overclaims is a design defect, not a copy nit.
- An export either contains everything it implies or refuses. Never a partial CSV
  that looks whole.

### III. Density serves scanning, and scanning is the job

A coordinator reviewing a sync batch is scanning for the anomaly. Everything
serves that.

Per the enterprise-table consensus
([Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables),
[Setproduct](https://www.setproduct.com/blog/data-table-ui-design)):

- **Three named densities, user's choice persisted:** Condensed **40px** /
  Regular **48px** / Relaxed **56px** rows. Not one hardcoded height.
- **Alignment is the trust signal.** Text left. Quantities right, tabular
  figures, consistent decimals. Qualitative numbers — dates, household IDs,
  phone numbers — left, because they are identifiers, not magnitudes. Headers
  align to their column's content.
- **One line, ellipsis, tooltip on hover *and* keyboard focus.** At most one
  designated wrapping column. Multi-line rows destroy the vertical rhythm that
  makes scanning possible.
- **Default sort is "needs attention", not alphabetical.** Incomplete, duplicate,
  and anomalous rows surface first. The table opens on the work.
- **Bulk affordances appear on demand** — checkboxes on hover, bulk actions only
  once something is selected.
- **High-stakes edits get friction.** Field-collected data is not a spreadsheet
  cell; correction happens in the record inspector, where provenance and context
  are visible, not by double-clicking a cell in a list.

---

## 4. The signature

One element that could only belong to Puente Manage, carried across surfaces:

**The provenance strip.** A compact, consistent horizontal band — present on
every record row (collapsed) and in every record inspector (expanded) — that
reads:

```
Collected 12 Aug · Synced 15 Aug · Yolanda R. · Los Alcarrizos · Key fields 7/8 · edited
```

It is not a badge cluster and not a metadata dump. It is one line, always in the
same order, always the same fields, so a coordinator learns to read it in a
glance and notices when part of it is missing. The three-day gap between
*collected* and *synced* is visible without being alarming. `Key fields 7/8` is
specific where "88%" is vague.

This is the element that makes the product's argument. If it gets cut for space,
the direction is gone.

---

## 5. Status, quality, and colour

- **Colour is never the only signal.** Every state is badge-with-label or
  icon-with-label. A red dot is invisible to a colourblind reviewer making a
  data-quality call — and this app's whole purpose is data-quality calls.
- **Four record states, named, in the copy:** `Complete` · `Missing fields` ·
  `Possible duplicate` · `Needs review`. Not a numeric score alone, not a traffic
  light alone.
- **Accent is scarce and means one of two things:** this is live/active, or this
  is actionable. Never decoration. If accent appears three times on a screen, two
  are wrong.
- **~60/30/10** — dominant surface, secondary tone, scarce accent.

---

## 6. Language is a design constraint, not a localization task

**Three locales ship — `eng` (source), `spa`, `hat` — and none is
right-to-left.** Corrected 2026-09-01: this section previously claimed six
locales including Arabic. That was the unmaintained Next.js template set. The
supported set is now asserted by `__tests__/locales/translations.test.js`, which
exists precisely so `ara/deu/ind/prt/zho` cannot return by accident after they
sat 47 keys stale.

- Logical properties (`margin-inline-start`, `text-align: start`) remain the
  default because they cost nothing — but **do not budget an RTL pass**, and do
  not cite Arabic to justify a layout decision.
- Layouts tolerate a longer Spanish string than the English you designed to.
  Spanish is where a fragile column header breaks, and it is the locale most of
  the field operation actually reads.
- **Parity is strict and enforced.** A new key lands in all three catalogs and
  in `docs/i18n/review-worksheet.csv` in the same change, or the suite fails.
  `spa` and `hat` are Claude-authored pending native review — reuse the
  vocabulary already in the catalogs instead of inventing terms.
- **Quantities interpolate with Intl formatting**: `{{total, number}}` resolves
  per-locale (`43,979` in `eng`, `43.979` in `spa`). Never hand-format.
- **No sentence assembled from fragments.** `t('found') + n + t('records')`
  breaks in every language with different word order. Interpolate.
- No idiom, no wordplay. The reader is frequently not a native English speaker
  and is making a decision about someone's household.

---

## 7. Slow connections are the design case

Not the edge case. Every meaningful action is a network round-trip, often on
Slow 3G.

- Every fetching surface has a **designed** loading state — skeletons that hold
  layout, never a blank region, never a spinner that shifts the page.
- **A paginated table does not blank between pages.** Keep the previous page
  visible while the next loads. A table that empties on every page turn reads as
  data loss.
- Long operations that leave the app — exports go out to a separate aggregator
  service — need a pending state and a completion signal. A button that looks
  idle during a 30-second export gets clicked four more times.
- Failure is loud, specific, and retryable. Never a silent partial success, and
  never a downloaded file containing an error body.

---

## 8. The five surfaces, and what each must earn

| Surface | Must earn |
|---|---|
| **Dashboard** (`/quick-start`) | Answers "what needs my attention today", in rows I can click into. Not four KPI tiles and a chart. Every number states its denominator and its freshness. |
| **Records table** (Form Manager) | Scanning at three densities, provenance strip per row, needs-attention default sort, honest totals, no blanking between pages. |
| **Data curation** | The correction workbench. Duplicate pairs shown as two aligned records, not two list rows. Annotate-and-supersede, never delete. Quality states named in words. |
| **Record inspector** | The full provenance expansion + the edit surface. Enough friction that correcting field data feels deliberate. |
| **Form creator** | The `label` ↔ `formikKey` relationship made **visible**, because its invisibility is what silently empties CSV columns. Renaming a label must show what it does to existing submissions. |

---

## 9. Explicit non-goals

- No gradient KPI cards. Stat tiles are a number, a label, and a denominator.
- No chart that encodes a single number.
- No donut charts.
- No decorative accent.
- No colour-only status.
- No photographs of the people in the data as interface decoration. They did not
  consent to being visual texture.
- No "AI insights" surface. This product's credibility rests on being auditable;
  an unexplained inference is the opposite of the north star.
- No infinite scroll on records. Coordinators cite positions and come back to
  them; pagination is addressable.

---

## 10. How to check a surface against this page

Blocking, before showing anything:

1. **Swap** — remove the product name. Still obviously a field-data curation tool
   and not a generic SaaS dashboard?
2. **Squint** — one dominant block (the data). Chrome is a quiet frame.
3. **Provenance** — can I tell where this row came from and when, without
   clicking?
4. **Honesty** — does every number state its denominator, its freshness, and
   whether it is sampled?
5. **Signature** — is the provenance strip present and earning its space?
6. **Colour** — is every state legible without colour?
7. **Language** — survives 2× string length and reads correctly in RTL?
8. **Connection** — is there a designed state for slow, failed, and stale?

Then run the ship gate (see
the `dlite-design-system` skill). Craft
makes it good; the gate proves it.

---

## Sources

- [Data Table Design UX Patterns & Best Practices — Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [Data table UI design reference guide for 2026 — Setproduct](https://www.setproduct.com/blog/data-table-ui-design)
- [Essential resources to design complex data tables — Stéphanie Walter](https://stephaniewalter.design/blog/essential-resources-design-complex-data-tables/)
- [Data Quality and Use — DHIS2 Documentation](https://docs.dhis2.org/en/implement/health/chis-community-health-information-system/implementation/data-quality-and-use.html)
- [Local-First Content: Caching, Offline Modes & UX — Pavilion Network](https://pavilion.network/blog/local-first-content-caching-offline-ux)
- [Offline-First Done Right: Sync Patterns for Real-World Mobile Networks — Developers Voice](https://developersvoice.com/blog/mobile/offline-first-sync-patterns/)

---

## 11. The dashboard, specified

`/quick-start` is the first screen after login and the most-seen surface in the
product. It gets its own section because it is where the north star either holds
or collapses.

### 11.1 What is there now, and why it fails

Read [pages/quick-start/index.tsx](../pages/quick-start/index.tsx) alongside this.
Current shape: a greeting, two stat cards, a 50-row activity feed, a forms list.

| # | Problem | Evidence |
|---|---|---|
| 1 | **It's a greeting screen, not a work screen.** "Good morning, Yolanda" + two counts + a log. Nothing on it is actionable. It answers *how are we doing* (analytics product) instead of *what needs my attention* (records instrument). | The whole layout |
| 2 | **The activity feed is a log, not information.** 50 rows of `` `${surveyingUser} submitted a record` ``, identically shaped, **not clickable** — you cannot get from a row to the record. It also restates what the stat card already said. | `index.tsx:100-103` |
| 3 | **`Active surveyors` is doubly dishonest, and decorated to look live.** It's a `limit(1000)` **sample** (so it silently undercounts past 1000 records in the window), and `surveyingUser` records **who synced, not who collected** — on shared field phones several people's work lands under one account. It is rendered next to a **pulsing dot**. The pulse is a liveness claim the number cannot support. | `index.tsx:68-77`, and §4 of the domain skill |
| 4 | **Colour that encodes nothing.** `FORM_DOT_COLORS[i % 5]` assigns blue/green/yellow/purple/orange by array index. A blue dot versus a purple dot means *nothing*. Direct violation of "accent means live-or-actionable." | `index.tsx:10-16` |
| 5 | **A badge on 100% of rows.** The query is `equalTo('active', 'true')`, so every row already *is* active — then each one gets a "Field-active" badge. A badge that is always present carries zero information. | `index.tsx:117`, `:245` |
| 6 | **No denominators, no freshness.** "1204" of what, as of when? Nothing says when the last sync was — the single most important fact for deciding whether to trust the screen. | Both stat cards |
| 7 | **Hardcoded English on a 6-locale app.** `"No recent submissions."`, `"No forms yet."`, `"View all →"`, `"Field-active"` are literals, not `t()`. | `:206`, `:238`, `:229` |
| 8 | **Four round-trips** across three `useEffect`s for a screen that shows two numbers and two lists. | `:52`, `:88`, `:113` |

Credit where due: the sampling comments in this file are **correct and honest**
(`index.tsx:66-67` explains why `distinct()` is unavailable). The code knows it's
sampling. The *interface* doesn't say so. That gap is the bug.

### 11.2 The concept: a triage queue, not a scoreboard

> **The dashboard's job is to end with the coordinator somewhere else.**

It is a dispatcher. Success is a click into curation, a record, or a community —
not time spent on the dashboard. Nothing earns a place here unless it either
(a) tells you whether to trust today's data, or (b) hands you work.

Four regions, in priority order:

```
┌──────────────────────────────────────────────────────────────────────┐
│  SYNC RIBBON        Last sync 15 Aug 14:32 · 47 records · 2 devices  │  ← trust
│                     behind                                    [why?] │
├────────────────────────────────────────────┬─────────────────────────┤
│  NEEDS ATTENTION                    (65%)  │  COVERAGE        (35%)  │
│                                            │                         │
│   12  Records missing key fields        →  │  Los Alcarrizos         │
│    3  Possible duplicate households     →  │    412 · synced 2h ago  │
│    1  Form renamed since last export    →  │  Batey 7                │
│    2  Records with unresolved parent    →  │    198 · quiet 18 days  │
│                                            │  Villa Altagracia       │
│   [ Nothing needs attention ] ← good day   │     87 · quiet 31 days  │
├────────────────────────────────────────────┴─────────────────────────┤
│  Records synced · last 30 days · 1,204  (count)                      │  ← context
│  Accounts that synced · last 30 days · 7  (sampled from 1,000)        │
└──────────────────────────────────────────────────────────────────────┘
```

**Region 1 — The sync ribbon.** The provenance strip at *organization* scale, and
the answer to the north star's central question before any number appears. One
line, always the same order: when the last sync landed, how much came with it,
how many devices look behind. `[why?]` opens the explanation of sync-vs-collection
time — teaching the concept at the moment it's relevant.

**Region 2 — Needs attention. This is the focal point.** Rows, grouped by *what
to do* rather than by entity, each one a link into a pre-filtered surface. Count
is tabular and right-aligned; the label says what it is; the row is the action.
Default order is severity, so the screen opens on the work.

The four rows are chosen because each maps to real, recurring failure in this
system — not because they're four things we could count:

| Row | Why it exists | Buildable now? |
|---|---|---|
| Records missing key fields | The 8-field completeness score already exists | **Yes** — `count()` |
| Possible duplicate households | `detectDuplicates` already exists | **Yes** |
| **Form renamed since last export** | The `formikKey`/`title` drift that silently empties CSV columns — caught *before* someone exports | **Yes, sampled** — see 11.4 |
| Records with unresolved parent | Orphaned children after a sync; has required manual repair before | **Yes** |

The third row is the one that could only exist in *this* product. It encodes
institutional scar tissue as an affordance.

**Region 3 — Coverage, not counts.** The stat cards get replaced by the question
a program manager actually has: *where do I send a team next?* Community, record
count, last sync — with **"quiet 18 days"** as the signal. A community that has
gone silent is the finding; the org-wide total never was. This is the
DHIS2 lesson: a data-quality surface exists to drive activity, not to decorate a
status meeting.

**Region 4 — Context strip.** The two totals survive, demoted to a footer, with
honest labels and their denominators. `Records synced` is a real `count()`.
`Accounts that synced` says *accounts*, says *sampled*, and loses the pulse.

### 11.3 Explicit rejections

- **The greeting.** "Good morning, Yolanda" costs a full row of vertical space on
  the most-visited screen in the product, every single visit, and answers nothing.
  If the human touch matters, it belongs in the AppShell top bar, not in the
  content column. (Named as a rejection because it is the single most likely thing
  to get argued back in.)
- **The undifferentiated activity feed.** 50 rows saying the same sentence is not
  awareness. What survives of it is the sync ribbon (the aggregate) and the queue
  (the exceptions).
- **The pulsing dot.** Liveness decoration on a sampled number.
- **`FORM_DOT_COLORS`.** Delete. Colour returns only when it means a state.
- **The forms list.** It is navigation, not attention. It belongs in the nav or in
  Form Manager. A form that needs something (renamed, no submissions in 30 days)
  earns a queue row instead.
- **Any chart.** Nothing here is a trend question yet. A sparkline of daily sync
  volume is the *first* chart that would earn its place — and only once the sync
  ribbon proves people care about the rhythm.

### 11.4 The engineering constraint that shapes this design

Be honest about this up front, because it is the difference between the design
shipping and the design being quietly hollowed out.

**An honest queue needs real counts. Real counts are `count()` calls. Four rows
is four round-trips** — on top of coverage and the ribbon. That breaks the
one-round-trip budget for a page load
(see the `data-pipeline-engineer` skill).

There are exactly three options, and only one is good:

| Option | Cost | Verdict |
|---|---|---|
| Sample every queue count client-side | Fast, and **wrong** — the numbers you triage from become approximations | **No.** Violates principle II on the screen whose whole job is trust |
| Fire 6+ `count()` calls | Honest and slow — several seconds on Slow 3G before the queue paints | Acceptable only as a stopgap, with skeletons |
| **One Cloud Code function** returning the whole triage payload | One round-trip, honest counts, `distinct` available server-side where the master key legitimately lives | **Yes** |

`puente-node-cloudcode` already defines 30 functions, including `basicQuery`,
`genericQuery`, and `countService` — a `dashboardTriage` function is squarely in
that idiom, not a new pattern. **This design has a named backend dependency, and
that is the correct place for the cost to land.**

The drift check ("form renamed since last export") is the one row that stays
approximate client-side: it compares each active form's
`FormSpecificationsV2.fields[].formikKey` set against the distinct `title` set in
recent `FormResults`. Client-side that requires sampling. Server-side it is a
`distinct`. Until it moves server-side, the row must read **"1 form may have been
renamed"** — hedged, because the check is.

### 11.5 Component brief

```
Intent:     A coordinator opening Manage at 8am · triage today's sync · calm, decisive, trustworthy
Hierarchy:  Needs-attention queue wins by width (65%), position, and being the only
            interactive rows on the screen. Sync ribbon wins the top edge by being
            full-bleed and singular. Totals are demoted to a footer.
Tokens:     surface-base (page) · surface-raised (ribbon, queue rows) ·
            text-primary (counts) · text-secondary (labels, "quiet 18 days") ·
            action-primary (queue row affordance, ONLY there) ·
            feedback-warning / -danger (queue severity, always with a text label) ·
            border (row rules) · spacing-{sm,md} · duration-fast (row hover)
Depth:      border, not elevation. A queue is a list, not a stack of cards —
            elevation on every row is the gradient-KPI-grid failure in disguise.
Typography: One size for counts, tabular figures, right-aligned. Weight + colour
            carry the three tiers. No size ramp.
Spacing:    Queue rows at Regular density (48px) — it is a scan target, not a
            dense table. Coverage rail Condensed (40px).
Signature:  The sync ribbon = the provenance strip at org scale. Same field order,
            same reading discipline, one level up.
i18n:       Every string a t() key. Quantities interpolated, never concatenated —
            t('triage_count_of_total', { count, total }), with {{total, number}}
            doing the per-locale formatting. Region labels tolerate a longer
            Spanish string; the 65/35 split is the first thing Spanish strains,
            so the columns stack rather than squeeze. Logical properties
            throughout (cheap, correct) — but no RTL locale ships.
```

### 11.6 Definition of done for this surface

1. `red-green-tdd` — every behavior tested, seen failing first. The queue counts,
   the empty state, and the drift hedge are all behavior.
2. Zero hardcoded strings; every key present in all three catalogs (`eng`, `spa`,
   `hat`) and in `docs/i18n/review-worksheet.csv` in the same change — parity is
   test-enforced. `spa`/`hat` await native review.
3. Every number states denominator + freshness; anything sampled says so.
4. Skeletons hold layout for the ribbon, queue, and coverage rail independently —
   a slow coverage query must not block the queue.
5. Two empty states, distinguished: "nothing needs attention" (good — say so) vs
   "no data yet" (explain that records arrive by mobile sync).
6. `prefers-reduced-motion` respected on the only remaining transition (row hover).
7. The ship gate passes.
