# Community name fragmentation

**Status: measured 2026-08-30, not yet fixed.** `communityname` is free text
collected on a phone, and it has split every community in the dataset across
several spellings. This is the same problem the `Organization` work already
solved, one layer down, at roughly fifty times the cardinality — and unlike
organizations, there is already a screen in this repo that "fixes" it by
rewriting collected data.

Companion to [self-service-organizations.md](self-service-organizations.md) and
[organization-delivery-status.md](organization-delivery-status.md) §4, whose
alias/resolver design this reuses and whose fuzzy-match findings this depends on.

---

## 1. The measurement

**Complete, not sampled.** Every `SurveyData` row in production was paged —
43,979 of them — reading `communityname` only. No `limit(1000)` sample, because
a sample cannot tell you how many distinct values exist; it can only tell you
how many it happened to see.

| | |
|---|---|
| `SurveyData` rows scanned | **43,979 — all of them** |
| distinct `communityname` strings | **3,196** |
| distinct after folding case + whitespace | **1,949** |
| strings that are *pure* case/whitespace duplicates | **1,247 (39%)** |
| communities written more than one way | **520** |

**`La Islita` is 24% of the entire dataset, fragmented six ways.** 10,439
records, spread across `La Islita`, `La islita`, `La Islita `, `la islita`,
`La islita ` and ` la islita`. Every one of those six is a separate bucket to
every query in every repo.

The rest of the head of the distribution:

| community | spellings |
|---|---|
| El Arenazo | 13 |
| La Sabina | 12 |
| Colonia Japonesa | 11 |
| Barrio Las Flores | 11 |
| El Cercado | 9 |
| Villa Sabina | 8 |
| La Islita | 6 |

And there are genuine misspellings, which are a different problem (§3).
`Jabonico de cevicos` also appears as `Jsbonico`, `Janonico`, `Jabinico`,
`Jabonicos` and `Jabonico decevicos`.

### Reproducing it

Same method as the organization audit. Page `SurveyData` over the REST API with
`select=communityname` and a page size of 1000 — 44 requests — accumulating
values in a `Map`. Credentials are `APP_ID` + `REST_API_KEY` in the flask repo's
`secretz.py`.

**Assert the app id before trusting any result.** Production is
`vBdTHqQU31…`; a file named `.env.prod` in this repo is *staging*, and checking
the filename instead of the id has already cost one full audit run against the
wrong database.

Then count twice: raw distinct values, and distinct values after the fold

```js
value.trim().toLowerCase()
```

The difference between those two counts is the mechanical half of the problem.

**The fold used above deliberately does not strip accents.** The organization
resolver does (`normalizeOrganizationName`, NFD + `\p{M}`), and applying the
same fold here would collapse more than 1,247. That number has not been
measured — see §9.

---

## 2. What it costs today

Community is the unit field coordinators actually filter and audit by. It is
not a reporting nicety; it is how the question *"where do we send a team next"*
gets answered.

**A coordinator who filters on "La Islita" today silently gets one of six
buckets, with no indication the other five exist.** The filter runs, rows come
back, a count renders. Nothing is wrong on screen. This is the characteristic
Puente failure — not a crash, a number that is quietly wrong.

It is also already being used as *evidence about something else*:
[organization-delivery-status.md](organization-delivery-status.md) §4c
identified Holy Family Mission from the community `cevicos` on its records. A
column that identifies an organization has to be trustworthy in a way a display
label does not.

Every surface below was read, not assumed:

| Surface | File | What fragmentation does |
|---|---|---|
| Curation filter dropdown | `app/epics/DataCurationManager/index.js:148-161` | Options are built from a **1000-row sample**, then `equalTo('communityname', filters.community)` at line 196. Six entries for one place, each returning a slice |
| Dashboard coverage rail | `app/epics/DashboardTriage/coverage.js:33` | Groups on `(r.community \|\| '').trim()` — **trims but does not case-fold**, so `La Islita ` merges and `La islita` does not. One community shows up as several rows, each with its own "quiet for N days" |
| Completeness scoring | `app/modules/data-quality/index.js:12` | `communityname` is one of the eight `SURVEY_COMPLETENESS_FIELDS`. Unaffected by *which* spelling — presence is all it checks. Called out so nobody assumes it is broken too |
| Community audit screen | `app/epics/DataCurationManager/CommunityAudit/index.js` | See §2a. This one is worse than doing nothing |
| Collect home-screen counts | cloudcode `cloud/src/services/batch/batch.js:96-103` | `countService`'s `SurveyData` group key includes `$communityname`, so two spellings make one person into two "distinct" people. This is the number on Collect's header |
| CSV export | aggregator `mainV3.py` `DEDUPE_COLUMNS` | `drop_duplicates` keys on `communityname` among others — same effect, in the file a funder opens |

### 2a. The community audit screen is a liability, not a mitigation

`CommunityAudit` already exists and already offers a "rename all records in this
group" button. Reading it produced four separate problems, each independently
disqualifying:

1. **It rewrites collected field values in place.** `r.set('communityname', target); r.save()`
   across every matched record. That is precisely what §5 forbids.
2. **It renames at most 100 records per variant per class, and reports success.**
   The rename query sets `containedIn` and `equalTo` but **no `limit`**, so it
   takes Parse's default page size of 100. Its own modal says *"This updates
   every matching record and cannot be undone."* For `La Islita` that is 100 of
   10,439 — an irreversible, silent, partial rewrite.
3. **It only ever sees a sample.** Groups are built from `q.limit(1000)` per
   class, so on 43,979 rows it can see at most a few thousand values and most of
   the 520 fragmented communities are simply invisible to it.
4. **It audits three classes that do not have the field, and misses the one that
   does.** `AUDIT_CLASSES` is `['SurveyData', 'EvaluationMedical', 'Vitals', 'HistoryEnvironmentalHealth']`.
   Per `schema/schema.json`, `communityname` exists on **`SurveyData`** and
   **`Assets`** — and on nothing else. Three of the four queries read a field
   that is not there; `Assets` is never audited.

It also groups by pure Levenshtein ≤ 2 on the raw string, greedily and
first-come, so group membership depends on the order the sample came back. §4 is
about why that matcher must not be trusted.

**Nothing in this spec should be built on top of that screen.** It needs to stop
writing before anything else happens here.

---

## 3. The hard split: mechanical vs judgment

These are two different problems that happen to share a column. Conflating them
is how a data-cleanup turns into data loss.

| | Mechanical | Judgment |
|---|---|---|
| What | case and whitespace | misspellings, abbreviations, alternate names |
| Scale | **1,247 strings (39%)** | the remainder of the 520 fragmented communities |
| Example | `La islita ` → `La Islita` | `Jsbonico` → `Jabonico de cevicos`? |
| Judgment required | **none** | **every case** |
| Reversible | yes — it is a display fold, nothing is written | only if recorded as an alias, never as a rewrite |
| Can be automated | **yes, entirely** | **no** — §4 |
| Who decides | nobody; it is a pure function | a person who knows the area |

The mechanical half is the whole of the near-term win: 39% of the distinct
values, and every one of `La Islita`'s six buckets, collapse under
`trim().toLowerCase()` alone. It needs no new Parse class, no ACL, no backfill,
no cross-repo deploy ordering, and no human in the loop — because there is no
decision in it. `La islita ` and `La Islita` are not two opinions about a place.

The judgment half is smaller, harder, and has no deadline.

---

## 4. Why the judgment half must not be automated

Because it was tried, on the easier problem, and it was wrong a third of the
time.

The 2026-08-31 organization audit ran a fuzzy matcher over nine unresolved
organization strings. **Three of the nine answers were wrong**
([organization-delivery-status.md](organization-delivery-status.md) §4):

| proposed | actually |
|---|---|
| `UMSI` → `MSI` | UMSI is Michigan's School of Information |
| `Tech` → `TECHO` | TECHO is a real, separate NGO |
| `Accenture` → `internal-test` | it matched the junk-bucket alias `accentute` |

**Edit distance 1 is not identity.** That failure rate came from a population of
**168** organization strings whose canonical set was **37** known partners, with
a human able to recognise every one of them. Community names are **3,196**
strings over **1,949** normalised values, in Spanish, from places the reviewer
has mostly never heard of, with no canonical list to check against. There is no
reason to expect the matcher to do better here and every reason to expect worse.

Two of the three failures are directly reproducible on this data. `La Sabina`
and `Villa Sabina` are edit distance 6 apart but are plainly related — a matcher
tuned to catch them catches far more than it should. `El Cercado` is a real
Dominican municipality; anything within distance 2 of it is a coin flip.

This is the same reasoning that made `findSimilarOrganization` **refuse** near
matches at signup rather than join them, and the same reasoning behind
`resolveOrganization`'s comment: *"Never falls back to a 'closest' organization:
an unresolved record is recoverable, a misattributed one is not."*

**A matcher may propose. It must never apply.** Its correct output is a
worklist for a human, and the human's decision is recorded as an alias — not as
a rewrite of the rows.

---

## 5. The constraint: collected values are not renamed in place

This is non-negotiable and it predates this spec. The standing
`puente-domain-expert` rule, on exactly this class of "fix":

> **Never "fix" this by renaming historical values in place.** That rewrites
> collected field data to match a UI decision. Map at read time, or migrate
> deliberately with the mismatch documented and explicit sign-off.

`communityname` is what a field worker typed, in a community, on a phone. It is
provenance. `La islita` is not a defect in the record; it is a true statement
about what was entered. Overwriting it destroys the only evidence that the
fragmentation ever happened, and — as §2a shows — does so 100 rows at a time
with no undo.

The organization work reached the same conclusion independently and stated it as
**"aliases, not row rewrites"**: for a typo the fix is one write to the
`Organization` record, not many writes to `_User`. That is reversible, and it
fixes historical records too.

So: **normalise at read time.** A deliberate migration is not forbidden, but it
requires the mismatch documented and explicit sign-off, and it is not on the
near-term path.

Note also that `surveyingOrganization` is **still** stamped from the collected
string on write, deliberately, for the same provenance reason
([organization-delivery-status.md](organization-delivery-status.md) §6). The
community equivalent inherits that decision, not a new one.

---

## 6. Cross-repo reach

Run [cross-repo-impact-checklist.md](cross-repo-impact-checklist.md). Every
claim below was read in the actual code, not inferred.

| System | Reads `communityname`? | What it does, and what changes |
|---|---|---|
| **Manage** (this repo) | Yes — filter, coverage rail, record inspector, duplicate resolver | Filter uses `equalTo`; must become the community equivalent of `containedIn(organizationMatchValues(...))`. The coverage rail already folds *whitespace only* and must not keep its own third definition of "same name" |
| **Collect** | Yes — writes it, and reads it for the autofill list | See §6a. This is the origin |
| **cloudcode** | Yes — `countService` groups on `$communityname` | A deduped person count that over-counts. It is aggregation-pipeline code, so a read-time fold means changing the pipeline, not a client |
| **aggregator** | Yes — column in every main export; a `DEDUPE_COLUMNS` key | See §6b. It already normalises *one* column, and community is not it |
| **Gatsby website** | No | Donor site, not on this dataset. Confirmed, not assumed |

### 6a. Collect is the origin, and the mechanism is specific

The community field is declared in two places —
`domains/DataCollection/Forms/IdentificationForm/config/config.js:162-169` and
`domains/DataCollection/Assets/NewAssets/AssetCore/config/config.js:26-33` —
both as `fieldType: "autofill"`, `parameter: "Communities"`.

`autofill` is an **autocomplete over a suggestion list, not a constrained
picker**. `AutoFill/index.js` writes the raw typed text straight through on every
keystroke:

```js
onChangeText={(text) => { setQuery(text); formikProps.setFieldValue(formikKey, text); }}
```

There is no `.trim()` on that path, and none on submit. Whatever is typed is
what is stored. Three consequences that explain the exact shape of the data:

- **The list the field offers is almost certainly not the communities in the
  data.** `modules/cached-resources/read.js:47-72` builds an org-scoped list of
  communities from `SurveyData` and stores it as **`CommunitiesUserEntered`** —
  a key **nothing reads**, verified by grep across the repo. The `parameter` the
  fields actually declare is `Communities`, which resolves against the
  Google-Sheets-backed blob fetched from S3 (`services/aws/index.js`,
  bucket `google-sheets-lambda`, key `test/puente-test.json`). A comment at
  `read.js:69` asserts that blob "already has City, Communities stored" — that
  is a comment, not evidence, and it is unverified (§9). If the key is absent,
  `resolveAutofillFields` returns `[]` and the field silently degrades to a
  plain free-text box.
- **The two input paths capitalise differently.** The `Autocomplete` branches
  set `autoCapitalize="none"`; the free-text fallback rendered when the list is
  empty sets nothing, so it defaults to sentence case. That is a plausible
  mechanism for `la islita` and `La islita` coexisting, and it is checkable on a
  device.
- **`Assets` has two fields, `communityName` and `communityname`**, both
  `String`, both in `schema/schema.json`. Collect's asset form writes the
  lowercase one. The aggregator's `asset.py` exports both columns;
  `assetSupForms.py` allowlists only `communityName`. Whether that column is
  blank in real downloads is unverified (§9), but the field-name split is real.

**Collect has no OTA.** `expo-updates` is installed but disabled natively on
both platforms, so any Collect-side change here needs a store release and
reaches the field in weeks, not hours. That forces the sequencing in §8.

### 6b. The aggregator, precisely

The premise that the aggregator "groups CSV output by community" **is not
correct** — there is no `groupby` anywhere in `api/`. What it actually does
matters more:

1. **It already strips whitespace, from exactly one column.**
   `mainV3.py` does `df['surveyingOrganization'] = df['surveyingOrganization'].str.strip()`.
   There is no equivalent line for `communityname`. The precedent for targeted
   normalisation in the export path exists; community was left out of it.
2. **Accent stripping applies to the custom-forms path only.**
   `replace_spanish_characters` lives in
   `api/data_aggregation_v2/dicts/_utils/flatten_custom_fields.py` and is called
   from **`supplementary.py` alone**, and only when `model == "FormResults"`. It
   is applied to column names *and*, via `applymap`, to **every string cell**.
3. **So the same community exports under two different spellings from two
   endpoints of the same service.** `supplementary.py` merges `SurveyData` into
   the custom-form frame, so `communityname` is in that dataframe and *is*
   accent-folded there. The `mainV3.py` records export is not. A community
   written with an accent reaches a funder one way in the records CSV and
   another way in the custom-forms CSV.
4. **It is a hand-rolled character map, not a Unicode fold.** Fourteen
   characters plus `¿` and `¡`. `normalizeOrganizationName` deliberately uses NFD
   + `\p{M}` instead, after a mark from Combining Diacritical Marks Extended
   survived a hand-written range check. Any community fold that has to agree
   with the exporter must reckon with the exporter being the weaker of the two.
5. **`drop_duplicates(subset=DEDUPE_COLUMNS)` includes `communityname`**, so
   fragmentation makes the exporter *miss* duplicate rows it would otherwise
   collapse.

**This is the constraint that shapes the design.** A fold applied only in Manage
would make Manage disagree with the CSV a funder receives. Whatever fold is
chosen has to be implemented in Python too, and #3 above means the aggregator
already disagrees with itself before we start.

---

## 7. The proposed shape

### Recommendation: read-time normalisation now. No `Community` class yet.

`Organization` is the right *analogy* and the wrong *copy*. Three asymmetries
decide it:

**Cardinality is two orders of magnitude apart.** `Organization` is 37 records,
staff-created, growing when a partner signs — which is why
`ORGANIZATION_FETCH_LIMIT` can be 500 and the whole alias table can be fetched
into the browser on every page. Communities are **1,949 normalised values and
growing every time a team visits somewhere new**. A `Community` class modelled
the same way is truncated on the day it ships, and the browser SDK's 1000-row
ceiling means the client-side alias table needs paging that `Organization` never
needed. That is real architecture, bought for a problem a pure function solves.

**Nobody owns the curation.** An organization's aliases are curated by that
organization's admin — a bounded, motivated population of ~30 people, each entry
a statement about tenancy and billing. A community alias list has no owner.
520 fragmented communities across 30-odd organizations is a backlog nobody is
funded to work, and **an uncurated alias table is worse than none, because it
looks authoritative.**

**The stakes are different in both directions.** A wrong organization merge
misroutes data *and money*, which is why `resolveOrganization` throws on an
ambiguous alias rather than picking. A wrong community merge misstates coverage
— serious, but it does not hand one partner another partner's records. The guard
can be lighter. The flip side is that nothing forces anyone to fix it, which is
the argument for making the fix require no ongoing human effort at all.

And decisively: **the mechanical 39% needs no table.** A three-line pure
function collapses `La Islita`'s six buckets into one, identically in three
repos, with no class, no ACL, no CLP, no deploy ordering, and no backfill.

### Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Fold at read time; never rewrite `communityname`** | §5. The collected string is provenance |
| D2 | **One shared fold, extracted from `normalizeOrganizationName`** | Three repos must agree on "same community" or they disagree about coverage. The organization resolver already carries a comment saying exactly this about its three copies |
| D3 | **The fold is case + whitespace + accents** (NFD + `\p{M}` + `trim` + `toLowerCase`) | Same as organizations. Consistency beats a second definition; the accent half also brings the exporter's behaviour into a rule instead of an accident (§6b.3) |
| D4 | **Display the most frequent raw spelling in each fold group** | The UI must show a real collected value, not a lowercased slug. `la islita` is not a place name |
| D5 | **The community filter switches from `equalTo` to a value set**, the way org scoping did | `containedIn(everySpellingInTheGroup)`. Directly mirrors `organizationMatchValues` |
| D6 | **`CommunityAudit`'s rename button is removed before anything else lands** | §2a — it is destructive, partial, and silent. It cannot coexist with D1 |
| D7 | **No `Community` class in this phase** | The 39% needs none; the remainder needs a human first (D8). Build the store when there is something to store |
| D8 | **The judgment cases produce a worklist for a human, never an automatic merge** | §4. Three wrong in nine on the easier problem |
| D9 | **When a `Community` class is eventually added, it is seeded only from decisions a human already made** — never from a matcher | Mirrors the organization audit's "aliases, not row rewrites", and its refusal to run `applyOrgAdminSeed` all-or-nothing |
| D10 | **The fold ships in the aggregator too, in the same phase** | A Manage-only fold makes the screen disagree with the funder's CSV (§6b) |
| D11 | **Collect keeps writing what was typed** | Provenance, and it matches the standing `surveyingOrganization` decision (§6 of the delivery status). Constraining the picker is a separate, later call |

D7 is the one to re-open first if this is wrong. The signal that it is wrong:
a human works the D8 worklist and has nowhere to record the answer, twice.

---

## 8. Sequencing

Deploy order is forced by which merges auto-deploy and which need a store
review.

| # | Repo | Work | Merging does |
|---|---|---|---|
| 1 | **Manage** | Remove the `CommunityAudit` rename path (D6) | Auto-deploys via Vercel. Do this alone and first — it stops an irreversible write |
| 2 | **Manage** | `app/modules/community/` with the shared fold + match-values, wired into the curation filter (D5) and the coverage rail (D3, replacing its trim-only grouping) | Auto-deploys via Vercel |
| 3 | **aggregator** | The same fold, in Python, applied to `communityname` in `mainV3.py` alongside the existing `surveyingOrganization` strip (D10) | Deploys to Elastic Beanstalk |
| 4 | **cloudcode** | `countService`'s `SurveyData` group key (§6, `batch.js:96-103`) | **Auto-deploys to production Back4App** |
| 5 | **Collect** | Read-side fold for the autofill list; fix `CommunitiesUserEntered` never being read (§6a) | EAS build → store review, **days to weeks**, manual iOS submit |
| 6 | — | Produce the D8 worklist for the judgment cases and put it in front of a coordinator | — |

Steps 1 and 2 are the whole 39%. Everything after that is making the other
consumers agree.

**Run `cross-repo-impact-checklist.md` before step 3, 4 or 5.** Step 4 in
particular changes a number a field worker sees on Collect's home screen, and
merging it deploys immediately to every build in the field, including years-old
ones.

---

## 9. Open questions

1. **How much more does accent folding collapse?** The 1,247 figure is
   case + whitespace only. Re-run the §1 count with the full
   `normalizeOrganizationName` fold and record both numbers. This decides
   whether D3's accent half is material or merely tidy.
2. **Are community names globally unique in this dataset, or only per
   organization?** `resolveOrganization` *throws* when two organizations claim
   one alias, because global uniqueness is correct for tenancy. If two
   organizations legitimately survey different places with the same name, a
   future `Community` (D9) must be scoped by an `organization` pointer and that
   rule cannot be copied over. **Unmeasured** — check whether any normalised
   community value appears under more than one organization.
3. **Does the S3 autofill blob actually have a `Communities` key?** (§6a.) If it
   does not, the field has been a plain free-text box on every device since the
   blob was last shaped, and that is the single largest cause of the 3,196.
   One request answers it.
4. **Is the asset supplementary CSV's community column blank?**
   `assetSupForms.py` allowlists `communityName`; Collect writes `communityname`
   (§6a). Download one and look before asserting either way.
5. **Who adjudicates the judgment cases, and against what?** Is there a
   canonical list of communities Puente works in — a government gazetteer, a
   partner's own list, a coordinator's memory? D8 produces a worklist; it does
   not produce an authority.
6. **Does anything downstream of the CSV key on the exact string?** A funder's
   spreadsheet, a saved pivot, a grant report. Folding accents in the records
   export (D10) changes header-adjacent *cell values* people may have built on.
7. **Should Collect's picker become constrained rather than free text?** D11
   defers this deliberately. It would stop new fragmentation at the source, and
   it would also stop a promotora recording a place that is not on the list —
   which is a field problem, and the standing rule is that field problems beat
   ops problems.

---

## Related

- [organization-delivery-status.md](organization-delivery-status.md) — §4 is the
  audit whose fuzzy-match failure rate §4 here depends on; §4c uses community
  names as identifying evidence; §6 is the standing provenance decision D11
  inherits
- [self-service-organizations.md](self-service-organizations.md) — §3, the
  fuzzy-match guard and why it refuses rather than merges
- [cross-repo-impact-checklist.md](cross-repo-impact-checklist.md) — run before
  steps 3, 4 and 5
- [organization-change-blast-radius.md](organization-change-blast-radius.md) —
  the "can this stop a promotora syncing?" question, asked of the equivalent
  change one layer up. Ask it again before step 5
</content>
</invoke>
