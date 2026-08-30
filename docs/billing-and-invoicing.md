# Billing & invoicing — delivery scope

> **Status note (updated 2026-08-30):** the phase plan below is partly stale.
> Phase 1 is largely shipped and parts of Phase 4 landed early. This file remains
> the authority on the *reasoning* — why flat-tier over metered, the referee
> rule, the backfill runbook, the ACL sequencing. For state and sequencing, read:
>
> - **[billing-roadmap.md](billing-roadmap.md)** — the remaining path from today
>   to invoices going out, with gates and decisions pre-resolved. **Start here.**
> - [organization-delivery-status.md](organization-delivery-status.md) — what
>   shipped, with production evidence
> - [organization-admin-prd.md](organization-admin-prd.md) — the buildable spec
>   for the next step
>
> **Do not execute the Phase 5 list below as a linear plan.** §5 Phase 0 sets an
> evidence trigger for Phase 2 that a linear reading skips; it is Step B of the
> roadmap.

Branch: `feat/billing-organizations` (off `master`)

---

## Context

Puente Development Corps already earns revenue two ways — recurring platform
access for partner organizations, and one-off services for NGOs (custom form
builds, data cleanup, training). Both are billed **manually today, and it hurts**
in three specific places: working out what to charge, producing and sending the
invoice, and chasing payment.

This is not a bet on future revenue. It is existing revenue with an ugly process.

Three answers narrow the solution space hard:

- **US entities, USD.** No VAT, no GST, no fiscal-receipt sequence (no DGII/NCF
  exposure). Invoicing is legally boring, which is good news.
- **Stripe access already exists** — used today for donations on the Gatsby site.
- **The operator is a finance/ops person who lives in QuickBooks**, not an engineer.

The intended outcome: **money gets invoiced and collected without a human
assembling it by hand**, in a surface Puente owns, sitting next to the data it
bills for.

Two decisions were taken during scoping and are reflected throughout:

- **Build the operator experience here, not in a vendor's dashboard** (§1). Stripe
  stays underneath as the money rail and the arbiter of payment state.
- **`Organization` becomes a real first-class model across the whole stack** (§3)
  and **replaces `surveyingOrganization` as the thing features read.** Not a
  Manage-local convenience. Billing is the forcing function; the model earns its
  keep four other ways — the case-sensitivity bug, per-org cost allocation,
  access control (§7), and the org scoping the AI-assistant grant needs in Year 1.

---

## 1. The recommendation, up front

**Build the whole operator experience in Manage. Don't rebuild the money rail.**

Stripe has an API. Everything the finance/ops person touches — composing an
invoice, editing line items, seeing who owes what, attaching usage evidence —
gets built here, in Manage, in Spanish and English, against the dlite design
system. Stripe stays underneath as the thing that **holds money** and is the
**system of record for payment state**.

| Concern | Where it lives | Why |
|---|---|---|
| Invoice composer, line items, rate card | **Build — Manage** | This is the operator's job. It should be in our product. |
| Org billing page, who-owes-what | **Build — Manage** | Belongs next to the org's data, not in a vendor dashboard |
| Usage evidence on the invoice | **Build — Manage** | Only Puente can produce it (§4) |
| Money movement, card handling | **Stripe** | PCI scope is a liability, not a feature |
| Is this invoice paid? | **Stripe (canonical)** | See the referee rule below |
| Dunning schedule, retries, receipts | **Stripe** | Solved, regulated, and boring |
| Chargebacks, disputes, refunds | **Stripe** | Legal process, not UI |

### The referee rule

> **Payment state is mirrored into Parse, never authored there.** If Parse says
> paid and Stripe says unpaid, that is a money bug with no arbiter. Whoever holds
> the money is the ledger. Manage renders and drives Stripe; it does not keep a
> competing opinion about whether cash arrived.

Concretely: `Invoice` records in Parse carry a `stripeInvoiceId` and a cached
status, refreshed from Stripe. Nothing in Manage sets `paid` on its own.

### On "it's cheaper to build"

Partly true, and the plan now reflects it — the UI is all ours. But two costs
survive the build/buy flip and should be stated plainly:

1. **Building does not avoid the fee.** Money still has to move, and card
   processing is charged either way. The only saving is the *incremental*
   invoicing surcharge on top of processing.
   *[Assumption — confirm Puente's actual Stripe rate; the delta is likely small.]*
2. **The build was never the expensive part.** Partial payments, card expiry,
   refunds, corrections, and disputes need a human indefinitely. Code generation
   removes the typing, not the ownership.

> **Anti-pattern: the competing ledger.** Modelling payment state as authoritative
> in Parse because the code was easy to write.
> **Consequence:** two systems disagree about money, and reconciliation becomes a
> permanent manual job — re-creating the exact pain this scope exists to remove.
> **Fix:** the referee rule above.

---

## 2. The finding that sets the scope

**There is no `Organization` entity. You cannot invoice a string.**

Verified in `schema/schema.json` — all 17 Parse classes are survey, clinical,
user, or messaging classes. Organization is expressed as free text in two places:

| Field | Class | Type | Set by |
|---|---|---|---|
| `organization` | `_User` | `String` | **The user types it at signup** |
| `surveyingOrganization` | `SurveyData`, `FormResults`, `Household`, `Vitals`, … | `String` | Stamped from the collecting account |
| `organizations` | `FormSpecificationsV2` | `Array` | Form sharing (already multi-org) |

The origin is [pages/account/register/index.js:23](pages/account/register/index.js):

```js
organization: yup.string().required('Organization Name is required')
```

No dropdown, no normalization, no validation against a known list. Six partner
organizations, an **unknown** number of distinct strings.

This already causes a live bug that reads as data loss: a user whose
`organization` is `"puente"` matches no records that say `"Puente"`, and sees an
empty app **with no error**. Under billing, that same typo becomes an unbillable
account or a double-billed one.

**So `Organization` is the real deliverable. Billing is the forcing function that
finally justifies it.** It pays for itself three other ways: it fixes the
case-sensitivity bug, it makes per-organization cost allocation possible, and
org-level data scoping is Year 1 of the AI-assistant grant proposal.

---

## 3. `Organization` is a real first-class model, across the whole stack

Owned by `puente-node-cloudcode` / Back4App, adopted by every consumer.

```
Organization
  name             String   canonical, human-facing      "World Outreach Fund"
  shortCode        String   stable, URL-safe, immutable  "wof"
  aliases          Array    every string seen in the wild ["WOF","wof","W.O.F."]
  billingEmail     String
  stripeCustomerId String
  plan             String   "partner" | "services-only" | "no-charge"
  active           Boolean
```

Record classes gain a **pointer** — `organization → Organization`. It becomes the
field features read; `surveyingOrganization` is kept on the record as collected
provenance but stops being queried.

> **`stripeCustomerId` and `billingEmail` must not land on `Organization` until
> its permissions are settled** (§7.1). New classes inherit permissive defaults,
> and every existing class in the snapshot is publicly writable. Billing
> identifiers in a world-writable class is not a risk worth taking for the
> convenience of one join. Ship the class with `name`/`shortCode`/`aliases`
> first; add the billing fields behind the access-control work, or put them on a
> separate, locked class.

### `surveyingOrganization` stops being a query key — the goal is full replacement

The intent is that features **stop reading the string and read the pointer**.
That is achievable, and here is the precise reason it is:

- **Historical records get a pointer** from the §6 backfill.
- **New records from old app builds get a pointer too**, because the server stamps
  it at write time (§3.1) — the device never needs to know `Organization` exists.

So after the backfill there is no record that has *only* a string. **Every
consumer can move to pointer-only reads**, and `surveyingOrganization` stops being
a query key across the stack. That is the target state.

What stays permanent is narrower than "the string":

> **Alias translation is permanent at the *write* boundary, not the read boundary.**
> Old Collect builds will keep sending organization *strings* for as long as they
> exist in the field, and the server must keep mapping those to an `Organization`.
> Reads move to the pointer; the inbound translation never goes away.

Two rules follow, and both are load-bearing:

- **Keep the `surveyingOrganization` column; stop reading it.** It is the value the
  field actually collected. Deleting it destroys provenance and makes the backfill
  irreversible. Retention is cheap; the read cutover is the win.
- **The read cutover is gated on unresolved reaching zero.** A record with no
  pointer becomes *invisible* the moment its consumers go pointer-only. Same gate
  as §7.4, same reason: this is how data silently disappears.

**Cutover order** — pointer-only reads land per consumer, not globally, and each
one only after the backfill covers the classes it touches: Manage's own queries
first (fast to fix, fast to revert), then the Flask aggregator's new `shortCode`
path once its callers have moved.

### The rollout, in dependency order

| # | Step | Repo | Train |
|---|---|---|---|
| 1 | `Organization` class + CRUD + `resolveOrganization` | `puente-node-cloudcode` | Fast — deploys independently |
| 2 | Audit distinct strings → create records, populate `aliases` | ops / Back4App console | One-off |
| 3 | **Stamp the pointer on write**, server-side — see §3.1 | `puente-node-cloudcode` | Fast |
| 4 | **Read** pointer-or-alias behind one shared module | Manage | Ships on merge |
| 5 | Backfill pointers onto historical records | ops | **High risk — runbook in §6** |
| 6 | **Cut over to pointer-only reads**, per consumer, gated on 100% resolution | Manage | Ships on merge |
| 7 | Accept `shortCode` on a new path; migrate callers off the string path | **Flask aggregator** | Separate EB deploy |
| 8 | Retire alias translation on **write** | **never** — old builds keep sending strings | — |

**There is no Collect step and no store-review train** — see §3.1.
`puente-react-gatsby-website` is unaffected; it is donor-facing and not on the
survey dataset. Both stated so their absence is a decision, not an oversight.

### A sixth system, dormant

`app/modules/django-etl/` calls a **Django REST ETL service** at
`NEXT_PUBLIC_PUENTE_REST_ETL_URL`, consumed by `app/epics/DataAnalyticsManager`.
It is **not in `TECHNOLOGY_ARCHITECTURE.md`'s system inventory** and not in the
five-repo model any of the skills describe. Status: possible revival, undecided.

Treated as **dormant — excluded from the rollout, but not forgotten**:

- If it is revived, it must resolve organizations through the same `aliases`
  table. It must not grow a seventh independent opinion about what an org is.
- **If it is revived after §7 ships, it needs ACL-aware credentials** — a service
  reading records under restrictive ACLs will silently return nothing, which
  looks exactly like "no data" rather than "no permission."
- Resolution step: check whether `NEXT_PUBLIC_PUENTE_REST_ETL_URL` is set in the
  production environment. Unset means dormant in fact, not just in intent.

`app/modules/apollo-grapql/` has **no callers** in this repo — likely dead, worth
confirming before anyone plans work around it.

### 3.1 How `Organization` works on data collection

**The mobile app is not changed. At all.**

Collect writes `surveyingOrganization` today from the cached `currentUser.organization`
at form-fill time — `domains/DataCollection/Forms/SupplementaryForm/index.js:148`.
It keeps doing exactly that. The **pointer is resolved server-side**, in the Cloud
Code write functions *both* apps already call: `postObjectsToClass` and
`postObjectsToClassWithRelation`. Manage reaches them through
[app/modules/cloud-code/crud/index.js:15](app/modules/cloud-code/crud/index.js);
Collect's offline uploader reaches them through
`cloud/src/_utils/offline/forms.js`. One choke point, both apps.

Why this is the right seam:

- **No Collect release, ever.** Every build in the field — including years-old
  ones — starts producing pointered records the moment cloudcode deploys. This
  is what removes the slow train from the rollout entirely.
- **Queued offline records are covered too.** A survey sitting in AsyncStorage
  from before the change syncs through the same function and gets stamped.
- **The master key is already present** on that path —
  `findExistingOfflineRecord` runs `{ useMasterKey: true }`.
- **Idempotency already exists** — `objectIdOffline` is the dedup key, so a
  retried batch does not double-write.
- **Collection-time fidelity is already protected, in code.**
  `mergeMetadataAsFallback` in `cloud/src/services/offline/offline.js` carries
  this comment:

  > *"Collection-time values (who surveyed, on which app/OS) must win over
  > sync-time metadata — whoever presses 'sync' is often not the surveyor."*

  So resolve the pointer from **the record's own `surveyingOrganization`**, after
  that merge — never from the account that happened to press sync. The pointer
  then carries exactly the fidelity the string already had, no better and no worse.

**Rule: an unresolvable organization must never block a sync.** If the string
matches no alias, the record **saves** with the pointer unset and lands in the
unresolved bucket for a human. A survey collected in the field is never rejected
for a billing-adjacent reason — the sync-path expression of the principle below.

**Considered and rejected: a global `beforeSave` trigger.** Cleaner in theory,
since it would catch every write path. Rejected because this codebase registers
**no** `Parse.Cloud.beforeSave` triggers today — introducing global triggers across
9 clinical and survey classes for a billing-adjacent feature is a large blast
radius, and they would also fire on every write of the §6 backfill. The existing
Cloud Code write functions are already the universal choke point; use them.

### Two hazards worth naming now

- **Step 5 changes an API contract.** The exporter takes the org as a *URL path
  segment* — `/v2/records/organizations/<organization>`, see
  [app/modules/data-export/_types.ts:23](app/modules/data-export/_types.ts).
  Add `shortCode` support as a **new** path; do not repoint the existing one, or
  every export breaks mid-flight.
- **Step 6 is a production backfill across 9 classes.** The riskiest *data* change
  here, and the one most likely to be done from memory. It has its own runbook —
  **§6. Do not start it from this bullet.**
- **Beyond both: the ACL work (§7)** is the riskiest change overall, because it is
  the only one that can take access away from people who currently have it.

### Billing and the rollout are independent

Billing is entirely Manage + cloudcode and has **no Collect dependency** — it
unblocks at step 3. Steps 5–7 are platform-correctness work with their own value
and their own clock.

### Principle: billing state never gates data collection

**A partner organization in arrears keeps collecting data.** No paywall in
Collect, no read-only mode, no export lock, no sync refusal. A promotora in the
field must never lose her tool because an invoice is late — she is not the payer
and cannot resolve it.

Enforcement is a conversation between Puente and the organization, not a
mechanism in the software. This is a deliberate, documented stance so that a
future "obvious" dunning feature has to argue against it first.

---

## 4. Do not bill on metered usage in v1

Billing on "records collected this month" looks obvious and is a trust hazard.

`createdAt` is **sync** time, not collection time. A survey taken Tuesday in a
community with no signal and synced Friday carries Friday's timestamp. A week of
offline backlog lands in a single day.

So a metered invoice would spike in August because July's fieldwork synced late —
and **the customer cannot verify or understand the number.** For a nonprofit
invoicing its closest partners, an unexplainable invoice is worse than no invoice.

**Instead: flat tier per organization, plus a rate card for services.** Usage
becomes *evidence attached to the invoice* — "here is what you got this month" —
not the *basis of the charge*.

This collapses pain #1 almost entirely: for subscriptions there is nothing to
work out, and for services a rate card produces line items directly. The usage
rollup stays valuable — it justifies the price at renewal — but it moves off the
critical path, where a wrong number costs credibility rather than money.

---

## 5. Phases

### Phase 0 — Stop the bleeding this week, with zero code

Not an engineering task, and not the destination — but Phase 2 is weeks away and
invoices go out before then. Everything here is reused, not thrown away: the
Products, Prices, and rate card built now are exactly what the Phase 2 UI drives.

1. **Audit the real org strings.** Distinct `_User.organization` and
   `surveyingOrganization` values in production. This is the input to `aliases`
   and step 2 of the rollout — needed no matter what gets built.
   *(`distinct()` requires the Master Key and is unavailable to the browser SDK —
   run it from the Back4App console or a Cloud Code function. Never ship a master
   key to a client.)*
2. **Configure Stripe Invoicing** in the existing account: Products and Prices for
   the partner tier and the services rate card, invoice branding, net terms,
   automatic dunning.
3. **Enable Stripe's QuickBooks sync.**
4. **Send this cycle's invoices from Stripe by hand.** Before doing so, baseline
   the two metrics in §9 — otherwise there is no way to prove any of this worked.

**Set the trigger for Phase 2 now:** if the operator is still hand-assembling
invoices after Phase 0, build the UI. If Stripe's own screens turn out to be
enough for six customers, that is a legitimate outcome and the engineering time
belongs on the AI-assistant work instead. Decide on evidence, not on plan inertia.

### Phase 1 — `Organization` becomes a real model (rollout steps 1–4)

- **`puente-node-cloudcode`** (fast train): the `Organization` class, CRUD, and
  `resolveOrganization`. Check the existing 30 Cloud Code functions first —
  `organizationVerified` / `organizationUnverified` already exist and may extend
  rather than duplicate.
- **This repo — one shared resolver.** `app/modules/organization/` maps
  *pointer-or-string* → canonical `Organization`, with an explicit **unresolved**
  case that callers must handle. Every consumer goes through this module; a
  second resolution path is how the two systems drift apart. Follow the
  `app/epics/DashboardTriage/` pattern — plain-JS logic modules, tests under
  `__tests__/app/…`.
- **This repo — registration picks from a list**, replacing free text at
  [pages/account/register/index.js:23](pages/account/register/index.js).
  Stops the bleeding at the source. Keep a "my organization isn't listed" path
  that flags for admin review instead of silently minting a new string.
- **This repo — an organization admin surface.** Puente staff only: create an
  organization, edit its `aliases`, and review unresolved strings. Build it here
  rather than in the Back4App console, because **the §6 backfill and the §7 ACL
  migration both need exactly this screen** to work their unresolved buckets. One
  surface, three consumers.

Organizations are created by Puente staff by hand — six partners do not justify a
self-serve flow, and a human confirming each one is what makes the alias table
trustworthy enough to bill from.

Ships one real fix on its own: a user whose stored org is `"puente"` stops seeing
an empty app.

### Phase 2 — The billing surface, built here

The operator's whole job, in Manage, against the Stripe API:

- **Org billing page** — plan, billing contact, Stripe customer link, invoice history
- **Invoice composer** — pick an org, add line items from a rate card or free-form,
  preview, send. Creates the invoice **in Stripe**; Parse stores
  `stripeInvoiceId` + a mirrored status per the referee rule (§1).
- **Who-owes-what** — one list across all orgs, sorted by age of debt

**Visibility ships in two steps.** Phase 2 is **Puente staff only**, gated
server-side by the new `puente_staff` role. The partner-facing half — an
organization seeing its own invoices — lands with §7, because it cannot be
enforced safely before then: given §7.1, a client-side role check would let one
partner read another's invoices. This is sequencing, not a scope cut.

Non-negotiable: dlite tokens, the design ship gate, and i18n from the start —
`docs/design-direction.md` §6 treats language as a design constraint, and this
surface will be read in Spanish.

### Phase 3 — Usage evidence (the part only Puente can build)

Per-organization, per-period: records synced, forms in use, accounts that synced —
attachable to an invoice as justification, never as the charge basis (§4).

Per `docs/design-direction.md` §I–II: label it **"Synced"**, not "Collected";
disclose sampling; never let a count that could not run render as zero. Reuse
`app/epics/DashboardTriage/loadTriage.js`, which already pays an explicit
round-trip cost and distinguishes exact counts from sampled ones.

### Phase 4 — Replace the string across the stack (steps 5–7)

Independent of billing, on its own clock. **No Collect work and no store review** —
§3.1. This is the phase that delivers what §3 is actually for: features stop
reading `surveyingOrganization`.

- **Backfill** historical pointers across 9 classes — **run it to §6, not from
  memory.** Deterministic only, dry run first, unresolved surfaced not skipped.
- **Cut over to pointer-only reads, one consumer at a time**, each gated on 100%
  resolution for the classes it touches (§11). Manage's own queries first — fast
  to fix and fast to revert — starting with `DashboardTriage/loadTriage.js` and
  `DataCurationManager`.
- **Flask aggregator** accepts `shortCode` on a **new** path; migrate callers in
  `app/modules/data-export/_types.ts` once it is live. The old string path stays
  until nothing calls it.

### Phase 5 — Access control (§7)

The largest and riskiest phase; **it goes last for that reason.** Everything
before it is additive, so a mistake here is the only one that can take access
away from people who had it.

- Read the Back4App **CLPs first** — they are not in any repo and they change the
  design (§7.1).
- New `org_<shortCode>` role per organization; new cross-org `puente_staff` role.
  **Tenancy only — no permission tiers within an org** (§7.1).
- Place every user in their org role, via the same resolver.
- **Pass A** (grant only) → verify → **Pass B** (restrict), one class and one org
  at a time, against the blocking gates in §7.4.
- Unlocks partner-facing billing visibility from Phase 2.

---

## 6. The backfill runbook (rollout step 5)

The riskiest operation in this plan. It touches **9 classes** in production, and
this team has run one migration like it before — the discipline below is lifted
from `orphan-backfill-audit-2026-07-15.json`, not invented.

| Class | Fields | Class | Fields |
|---|---|---|---|
| `HistoryEnvironmentalHealth` | 71 | `Assets` | 26 |
| `SurveyData` | 65 | `FormResults` | 15 |
| `EvaluationMedical` | 29 | `FormAssetResults` | 15 |
| `Vitals` | 26 | `Household` | 15 |
| `EvaluationSurgical` | 12 | | |

### Rule 1 — There is no heuristic pass. That is the point.

The orphan backfill needed heuristics because it inferred a *parent* from time
proximity. Even then it linked 114 and **refused 345** — 147 with multiple
candidates, 198 with none. Refusing 75% was the correct call.

This migration needs none of that. `surveyingOrganization` → `Organization` is a
**pure lookup through `aliases`**. An unmatched string is not a guess opportunity;
it is a human decision to add an alias and re-run.

> **If the resolver returns `unresolved`, the record is not written. Full stop.**
> No time-window inference, no fuzzy string matching, no "closest org." A wrong
> pointer here misroutes records *and* money, and it looks exactly like a right one.

### Rule 2 — The dry run is the deliverable

Produce the audit **with zero writes**, in the shape of the 2026-07-15 file:
per-record rows with evidence, and explicit buckets.

| Bucket | Meaning | Action |
|---|---|---|
| `already_pointed` | Pointer set by dual-write | Skip |
| `resolved_by_alias` | Exact alias match | Will write |
| `unresolved` | String matches no alias | **Never written — needs a human** |

A human reads `unresolved`, extends the alias table, and the dry run re-runs.
Writes are authorized only when `unresolved` is empty or every remaining entry has
been explicitly accepted and recorded. **Unresolved records are surfaced, never
silently skipped** — silent skipping is how a whole organization stays invisible
and unbilled.

### Rule 3 — Where and how it runs

- **Cloud Code / Back4App job. Never from Manage.** The browser SDK has no Master
  Key and must never be given one.
- **`select('surveyingOrganization')` is mandatory.** `HistoryEnvironmentalHealth`
  is 71 fields and `SurveyData` is 65. Reading whole objects to write one pointer
  moves gigabytes for nothing.
- **`count()` each class first** to size the job honestly before it starts.
- **Idempotent and resumable** — page on `doesNotExist('organization')`, so a
  re-run skips finished work. This job *will* be interrupted; assume it.
- **Stamp every write with a job id** so rollback is scoped to this run.

### Rule 4 — Do not disturb the curation audit trail

`SurveyData` carries `editedAt` and `editedBy`, which mean **a human curated this
record in Manage**. A backfill that sets them makes it look like a person edited
every record in the database, and there is no audit-log class to recover the
truth from — `editedAt`/`editedBy` are single-value, last-edit-only.

**The job writes `organization` and nothing else.** `updatedAt` will bump
unavoidably; confirm before running that nothing downstream keys off it.

### Rule 5 — Ordering and rollback

- **Server-side stamping (step 3) lands before the backfill.** Otherwise the
  target set grows underneath you while Collect syncs.
- **Rollback is clean by construction** — the job only *adds* a pointer and
  modifies no existing field. Reverting means unsetting `organization` for this
  job id. Nothing collected in the field can be lost by this migration, and that
  property should be preserved deliberately, not by luck.

### Rule 6 — The script is tested code

`red-green-tdd` applies. A one-off script that writes to production data is
exactly the wrong thing to leave untested. Pin before writing it: unresolved never
writes; a second run is a no-op; `editedAt` is untouched; `select()` is applied;
an alias matching two organizations raises rather than picking one.

---

## 7. Access control — the ACL work

In scope by decision: `Organization` becomes the access-control principal, not
just a billing entity. This is the largest and most dangerous part of the plan.

### 7.1 How Parse permissions work, and what we actually have

Parse enforces read/write permission at **two** levels, and both have to be right:

| Level | What it is | Where it lives |
|---|---|---|
| **CLP** — Class-Level Permission | A rule for a **whole class**: "who may read `SurveyData` at all?" | Back4App **dashboard** — not in any repo |
| **ACL** — Access Control List | A rule attached to **one record**: "who may read *this* row?" | Set in code, per object, at save time |

CLPs are the outer gate, ACLs the inner one. A read must pass **both**. A record
with no ACL is unrestricted at the inner gate — so whatever the CLP allows, goes.

**What we have, concretely:**

**1. Our records have no ACL.** `postObjectsToClass` does
`new Parse.Object(parseClass)` and saves it without ever setting one
(`cloud/src/definer/crud.definer.js:104`). So the inner gate is wide open on all 9
classes, and whether anything restricts reads depends entirely on the CLPs — which
nobody can see from the code.

Today, the thing keeping WOF's records off Puente's screen is **the query itself**:
Manage asks for `surveyingOrganization = "Puente"`. Change that filter and the
server has no reason to object. That is isolation by convention, not enforcement.

**2. There is effectively no role model — the existing one is inert.** Cloud Code
defines `admin`, `manager`, and `contributor` (`roles.definer.js`), but verified
across all three repos:

| Check | Result |
|---|---|
| Is `_User.role` read to gate anything in Manage or Collect? | **No** — zero call sites |
| Do either app's code call `createAdminRole` / `addToRole` / `queryRoles`? | **No** — zero call sites |
| Does any record-class ACL reference them? | **No** — records have no ACLs at all |
| What *do* they touch? | ACLs on the `_Role` records themselves, and `setRoleWriteAccess('admin', true)` on `_User` at signup |

So there is no legacy permission model to stay compatible with. **Do not preserve
these as an axis to compose against** — that would be designing around something
nothing uses.

> Treat them as evidence, not as foundation: someone built a three-tier permission
> hierarchy here years ago and **nothing ever consumed it.** That is the strongest
> available argument against inventing a rich new one now.

**What to build instead — the tenancy axis only:**

```
org_wof          ← every WOF user
org_puente       ← every Puente user
puente_staff     ← Puente internal; spans all organizations
```

One role per `Organization`, plus one cross-org staff role. **No permission tiers
within an organization** until someone actually needs them — billing and §7 need
*tenancy*, not a hierarchy. Adding `org_wof_admin` later is easy; unpicking an
unused hierarchy is what got us here.

`puente_staff` is what makes "staff see all invoices, each org sees its own"
expressible at all. Neither role exists today.

**Leave the three legacy roles in place, documented as inert.** Removing them
touches `_User.role` values and the signup ACL for no benefit this scope needs.
But **do not extend them**, and review that signup `setRoleWriteAccess('admin', true)`
during §7 — it is a live grant, unlike the roles themselves.

One distinction worth keeping straight: **`adminVerified` is not inert.** It is
read by Manage (`customQueryService(0, 500, 'User', 'adminVerified', true)`) and
written by `pages/account/verify/redirect/index.js`. The account-verification flow
works; only the *role* half is dead. `addToRole` couples the two by setting
`adminVerified: true` as a side effect — untangle that before reusing it.

**3. Every user profile is created world-readable.**
`acl.setPublicReadAccess(true)` at `cloud/src/definer/auth.definer.js:77` — so
`organization`, `email`, and `phonenumber` on every account may be readable by any
authenticated client, subject only to the `_User` CLP.

> **A CLP snapshot DOES exist in this repo, and it is alarming.**
> `schema/schema.json` carries `classLevelPermissions` per class. **All 17
> classes** — `SurveyData`, `Vitals`, `FormResults`, and also `_User`,
> `_Session`, and `_Role` — are set to:
>
> ```json
> "find": {"*": true}, "get": {"*": true}, "count": {"*": true},
> "create": {"*": true}, "update": {"*": true}, "delete": {"*": true},
> "addField": {"*": true}
> ```
>
> In Parse, `"*"` means **public** — not "any authenticated user". Combined with
> §7.1's finding that records carry no ACL, the App ID and the JavaScript key
> that ships in the browser bundle would be enough to read, modify, or **delete**
> any survey, clinical, or user record, and to mutate the schema.
>
> **Two caveats, stated deliberately.** The snapshot's last commit was an
> unrelated navigation change, so it may be stale. And it has **not** been
> verified against production. **Confirm in the Back4App dashboard before acting
> on it — and before dismissing it.**
>
> If it holds, this is a pre-existing exposure far more urgent than billing, and
> §7 stops being a Phase 5 nicety. It also means an `Organization` class holding
> `stripeCustomerId` and `billingEmail` would inherit the same defaults.

### 7.2 Why this is more dangerous than the §6 backfill

A missing pointer is a billing gap. **A wrong ACL is functional data loss** — the
record exists and nobody can see it.

That is precisely the Yinetza incident (`yinetza-vitals-reconciliation-2026-07-15.md`):
vitals data existed for years, invisible, and recovering it took an engineer and a
surveyor reconstructing matches by hand. **A careless ACL migration recreates that
deliberately, across the entire dataset.**

### 7.3 Additive first, restrictive last — two separate deployments

> **Pass A — grant, take nothing away.** Add `org_<shortCode>` read/write to
> records **without** removing existing public access. Purely additive: no
> permission is withdrawn, so nothing can break. Verify at leisure.
>
> **Pass B — remove public access.** One class and one organization at a time.

**Never combine them.** A single restrictive pass means the first signal of a
mistake is a partner phoning to say their data vanished.

### 7.3a Household is a permanent exception to the 100% gate

Established by the production audit, 2026-08-28. **14,688 of 14,736 Households
(99.7%) carry no organization and cannot be given one.**

They carry nothing that identifies who collected them:

| Attribute | Coverage on the 14,688 |
|---|---|
| `surveyingOrganization` | 0 — by definition |
| `surveyingUser` | **0** |
| `householdId` | the field does not exist on `Household` |
| `objectIdOffline` | 48 of 14,736 |
| `client` pointer | 429, and it targets `Household`, not `SurveyData` |
| Inbound `SurveyData.householdClient` | **3** of 43,979 |

No reverse lookup is possible: there is nothing to look up *through*. Attributing
them by geography or time window would be a heuristic pass, which §6 forbids —
and the 2026-07-15 orphan backfill already established that time proximity
misattributes in this dataset (median parent→child gap ~1 hour, p90 ~30h).

**Forward path: already closed, but unproven.** `postHouseholdArray` applies
`mergeMetadataAsFallback`, and Collect's offline uploader sends
`surveyingOrganization` in its metadata — shipped 2026-07-15 with the orphan fix.
Every org-less Household predates it. No Household has been created since, so
production offers no evidence either way; the claim rests on code inspection.

**Consequence — the gates in §7.4 and §11 must be scoped per class, not global.**
A global 100% requirement can never be met while these 14,688 exist, and a gate
that can never pass is a gate that quietly stops being enforced. Two honest options:

- **Exempt `Household` explicitly**, with the count recorded, and require 100% of
  every other class. Preferred: it keeps the gate meaningful where it can be met.
- **Delete the unattributable Households**, if they turn out to be vestigial —
  note that only 3 SurveyData records reference a Household at all, so the class
  may be effectively unused. A separate decision with its own dry run.

Until one is chosen, **Pass B must not run on `Household`.**

### 7.4 Gates on Pass B — every one is blocking

- **An organization is not locked down until 100% of its users resolve** into its
  role. A user who cannot be placed loses all access the instant public read goes.
- **A record whose organization is unresolved never gets a restrictive ACL.** Leave
  it open and surface it. Locking an unresolvable record makes it invisible with no
  way to find it again — the §6 rule, with worse consequences.
- **Count before, count after, per organization**, simulated under that org's role.
  Any org whose visible count drops is a bug, not a rounding difference.
- **One-operation rollback per class.** Keep the prior ACL state so Pass B reverts
  without a reconstruction job.
- **Who discovers a mistake:** field users on Collect, whose queries return nothing.
  The fix is server-side role membership — a fast train — but discovery happens in
  a batey with no signal. That asymmetry is why these gates are not optional.

### 7.5 What this gives billing

The same mechanism answers "who can see invoices," which is otherwise unenforceable:

- **`org_<shortCode>`** — an organization reads its own records and its own invoices.
- **`puente_staff`** — a new cross-organization role. Nothing today comes close;
  the three legacy roles are inert (§7.1).

Billing visibility is **staff sees all, each org sees its own**, enforced by ACL
server-side. A client-side `if (role === 'staff')` check would let one partner read
another's invoices, and given §7.1 that is not a hypothetical.

---

## 8. Critical files

| Path | Change |
|---|---|
| `app/modules/organization/` | **New** — the single pointer-or-alias resolver, plain JS, unit-tested |
| `pages/account/register/index.js` | Org picker replaces free-text input |
| `pages/account/management/index.js` | Same, for editing |
| `app/epics/Billing/` | **New** — org billing page, invoice composer, who-owes-what |
| `app/services/stripe/` | **New** — Stripe API client; the only module that talks to Stripe |
| `app/epics/OrganizationAdmin/` | **New** — staff-only: create orgs, edit aliases, work the unresolved queue (§6 and §7 both need it) |
| `app/modules/cloud-code/` | Wrappers for the new org functions |
| `app/epics/DashboardTriage/loadTriage.js` | **Reuse** for usage evidence |
| `schema/schema.json` | `Organization` class; `organization` pointer on record classes; `Invoice` **mirror** (`stripeInvoiceId` + cached status only — §1) |

In `puente-node-cloudcode`:

| Path | Change |
|---|---|
| `cloud/src/definer/crud.definer.js:89` | `postObjectsToClass` — stamp the org pointer (§3.1); later, the ACL (§7) |
| `cloud/src/services/offline/offline.js` | Resolve **after** `mergeMetadataAsFallback`, so collection-time org wins |
| `cloud/src/definer/roles.definer.js` | **New** `org_<shortCode>` roles + `puente_staff`. Legacy three left inert and unextended (§7.1) |
| `cloud/src/definer/auth.definer.js:77` | Review `setPublicReadAccess(true)` and `setRoleWriteAccess('admin', …)` on `_User` — a live grant to an otherwise-dead role |
| `cloud/src/definer/verification.definer.js` | `organizationVerified`/`Unverified` move off exact string match onto the resolver |
| *(new)* org CRUD, `resolveOrganization`, usage aggregation | — |

Also: `docs/billing-and-invoicing.md` — a delivery doc in the
`docs/dashboard-dispatch.md` house style.

**Other repos.** `puente-flask-rest-aggregator` gets a new `shortCode` path in
Phase 4. **`puente-reactnative-collect` is not touched at any point** (§3.1).
`puente-react-gatsby-website` is unaffected. `app/modules/django-etl/` is dormant
and excluded, with conditions if revived (§3).

### Secrets

The Stripe **secret** key must never reach the browser. Manage is a Next.js 12
Pages Router app, so Stripe calls belong in API routes (`pages/api/…`) or Cloud
Code — never in a `NEXT_PUBLIC_*` variable. Worth stating explicitly: this repo's
existing integration pattern (`NEXT_PUBLIC_PUENTE_DATA_EXPORTER_API_URL`) is a
public-by-design URL, and copying that shape for a Stripe key would leak it.

---

## 9. Method

Per the standing project rule (`feedback_tdd_first`), every behavioral change goes
through `red-green-tdd` — test written and **seen failing** first. Tests live in
`__tests__/app/…` mirroring source paths; run with `yarn test`.

Two areas carry most of the risk and should be tested hardest:

**The resolver** — pointer present, pointer absent + alias match, case and
whitespace variance, unknown string (must return *unresolved*, never a silent
fallback or an empty result that reads as "no records"), an org with no aliases,
and two orgs that must never collide on one alias.

**The Stripe boundary** — mock the API. Cover: invoice creation fails after the
Parse record is written; Stripe reports paid while Parse still says open;
`stripeInvoiceId` missing. The referee rule (§1) is only real if it is pinned by
a test that fails when someone writes `paid` locally.

Any UI goes through `dlite-design-system` tokens and the design ship gate, and
ships with i18n keys — not English strings to be translated later.

---

## 10. Out of scope — explicitly

- **Payment state authored in Parse** — mirrored only, per the referee rule (§1)
- **Card entry or payment collection in Manage** — Stripe hosted pages only; this
  keeps Puente out of PCI scope entirely, and that is worth more than the UI polish
- **Dunning, retry schedules, receipts, refunds, disputes** — Stripe's, not ours
- **Metered/usage-based charging** — §4; usage is evidence, not the charge basis
- **Removing alias translation on the write path** — permanent; old builds keep
  sending strings (§3). Pointer-only *reads* are very much in scope.
- **Dropping the `surveyingOrganization` column** — retained as collected
  provenance even after reads move to the pointer (§3)
- **Repointing the existing exporter URL** — additive `shortCode` path only (§3)
- **Multi-currency and non-US tax** — US/USD confirmed; revisit only if that changes
- **A general-purpose accounting system** — QuickBooks stays the book of record
- **Self-serve organization creation** — Puente staff create orgs by hand
- **Permission tiers within an organization** — build tenancy, not a hierarchy;
  the inert legacy roles are the argument (§7.1)
- **Removing the legacy `admin`/`manager`/`contributor` roles** — harmless where
  they are; a separate cleanup with no urgency
- **Reviving the Django ETL service** — dormant; conditions recorded in §3 if it returns
- **Restricting `_User` public read** — real (§7.1) but a separate blast radius from
  record ACLs; fix it deliberately, not as a side effect of billing

---

## 11. Success metrics

| Metric | Why it drives a decision |
|---|---|
| Days from month-end to all invoices sent | The actual stated pain. **Baseline before Phase 0** or the rest is unmeasurable. |
| Days sales outstanding | Tests whether automated dunning beats manual chasing |
| Invoices needing manual correction after sending | If this stays high after Phase 1, the alias table is incomplete |
| % of org strings resolving to a canonical `Organization` | **100% per class, and it is a gate, not a target** — see below. `Household` is an explicit exception (§7.3a). |
| Operator time per billing cycle | The one that decides whether Phase 2 was worth building |

### 100% resolution is a gate on three separate things

Not a dashboard number to watch trend upward. Nothing below proceeds until it
holds, **per organization and per class**.

> **Scoped per class, with `Household` exempted.** 14,688 of 14,736 Households
> cannot be attributed at all (§7.3a). A single global gate could therefore never
> pass, and a gate that can never pass is one that quietly stops being enforced.
> Require 100% of every other class; record `Household`'s count as a named,
> accepted exception and do not run Pass B on it.

| Gate | Why 99% fails |
|---|---|
| **Pointer-only reads** (§3) | The unresolved records become invisible the moment consumers stop reading the string |
| **Pass B ACL lockdown** (§7.4) | An unplaced user loses all access to their own organization's data. Skipped entirely for `Household` (§7.3a). |
| **Invoicing an organization** | Its usage evidence is understated by whatever did not resolve, and the invoice is wrong in the customer's favour or ours — both bad |

The failure mode is identical in all three: **the shortfall is silent.** A 99%
resolution rate does not raise an error anywhere. It shows up as one community
missing from a coverage list, one surveyor locked out, one invoice quietly short —
each individually explicable, none obviously a migration artifact.

That is why the unresolved bucket is surfaced in an admin queue (§6, §8) rather
than reported as a percentage. A number trending toward 100% invites shipping at
97%. A worklist with four rows in it invites clearing the four rows.

---

## 12. Verification

1. `yarn test` — full suite green, including resolver and Stripe-boundary tests.
2. `yarn dev` → register a new account; the org picker lists canonical
   organizations and free text can no longer silently mint a new one.
3. Sign in as a user whose stored `organization` is a **non-canonical alias**
   (e.g. `"puente"`); the dashboard resolves it and loads records. This is the
   existing data-loss-looking bug, fixed — and it is the single best proof the
   resolver works.
4. **CSV export still works unchanged**, still using the original
   `surveyingOrganization` string. Proves the aggregator was not disturbed.
5. Stripe test mode, end to end: compose an invoice in Manage → it appears in
   Stripe → pay it with a test card → Manage reflects paid **from Stripe**, and
   nothing in Manage set that status locally.
6. Kill the network mid-send and confirm Manage does not show an invoice as sent
   that Stripe never received.
7. Phase 0 is verified operationally, not in code: one real invoice sent,
   received, paid, and reconciled into QuickBooks.

**Backfill verification (step 5) — run in this order, no shortcuts:**

8. `count()` every one of the 9 classes; record the totals before starting.
9. Dry run with zero writes; the `unresolved` bucket is empty or every entry is
   explicitly signed off. Re-run until true.
10. Execute against **one small, resolvable class first** — `EvaluationSurgical`
    or `Allergies`. **Not `Household`**: 99.7% of it is unattributable (§7.3a), so
    it would prove nothing about the backfill and cannot reach the gate. Never
    start with `SurveyData` or `HistoryEnvironmentalHealth` either — too large to
    fail cheaply.
11. Re-run the same class immediately: the second pass must write **zero** records.
    If it writes any, the idempotency filter is wrong — stop.
12. Spot-check that `editedAt` / `editedBy` on touched `SurveyData` rows are
    unchanged, and that CSV export still returns identical output to a copy taken
    before the migration. Differential comparison, not eyeballing.
13. Only then run the large classes, and keep the audit JSON with the other
    migration records at the repo root.

**Access-control verification (§7) — the gates, executed:**

14. Read and record the Back4App CLPs before designing. This is step zero.
15. After **Pass A**, confirm nothing changed for anyone: a user from each org
    sees the same record counts as before. Pass A grants only — a drop here means
    something else broke and Pass B must not start.
16. Before **Pass B** on any org: 100% of that org's users resolve into its role,
    and its unresolved-record count is zero or explicitly signed off.
17. After Pass B on each class: per-org visible counts match the pre-migration
    baseline exactly. **Sign in as a real non-admin user from a partner org** and
    load the dashboard, curation, and an export — not just a count query.
18. Confirm a user from org A **cannot** read org B's records or invoices by
    querying directly, not merely that the UI hides them.
19. Confirm Collect still works for a field account on that org before moving to
    the next class. This is the population that discovers failures last and
    suffers them worst.

---

## 13. Assumptions to validate

| # | Assumption | Owner | Risk if wrong |
|---|---|---|---|
| 1 | The six partner orgs map cleanly onto a small, closed set of strings | Eng — Phase 0 audit | If there is a long tail, the alias table needs an admin UI sooner |
| 2 | Puente Development Corps' US nonprofit status raises no invoicing constraint (UBIT, state registration) beyond ordinary US invoicing | Finance/ops | Earned revenue at a 501(c)(3) can carry tax treatment questions Stripe won't flag |
| 3 | Partner orgs will accept a flat tier without metered justification | Product — test in a live pricing conversation | If they demand usage-based pricing, §4's sync-time problem re-enters the critical path |
| 4 | The existing Stripe account can host B2B invoicing alongside donor payments without muddling reporting | Finance/ops | May need a separate account or clean Product separation. Cheap to check now, expensive to unwind later. |
| 5 | The incremental cost of Stripe Invoicing over plain processing is small enough that building the invoice rail ourselves would not pay for itself | Finance/ops — read the actual rate | If it is material at Puente's volume, revisit §1. Stated as an assumption because no rate was verified. |
| 6 | Adding an `organization` pointer to record classes has no meaningful write-path or index cost on Back4App at current volume | Eng | Affects Collect's offline sync path, which is the most latency-sensitive part of the stack |
| 7 | No partner org shares a name or alias with another, now or as partners are added | Eng — Phase 0 audit | An alias collision misroutes records **and** money; the resolver must make it impossible, not unlikely |
| 8 | Nothing downstream keys off `updatedAt` on record classes | Eng — check before step 5 | The backfill bumps `updatedAt` on every touched row; if a sync or report reads it, the migration looks like mass edits |
| 9 | Record volume is "tens of thousands" *(sourced from `grant-proposal-ai-agent-interface.md`, not measured)* | Eng — `count()` per class in §12 | Sizes the backfill. An order of magnitude more changes it from a job to a project. |
| 10 | **Back4App CLPs do not already restrict record reads** — unverified, and not knowable from any repo | Eng — read the dashboard **before** §7 design | If CLPs already restrict, §7 is smaller than planned. If they are open, the current exposure is exactly as broad as §7.1 describes. Either way the design changes. |
| 11 | Every active user can be placed in exactly one organization role | Eng — §7.4 gate | A user who resolves to zero or two organizations blocks Pass B for that org. Expect a handful; they need a human decision, not a default. |
| 12 | Back4App's plan tolerates the backfill's request volume and the added pointer index without throttling | Eng / ops | A throttled migration that half-completes is worse than one that never started. Check the plan limits and consider rate-limiting the job. |
| 13 | No Lambda function or scheduled job writes to the 9 record classes outside the Cloud Code write path | Eng | `TECHNOLOGY_ARCHITECTURE.md` names AWS Lambda for "event-based backend tasks" with no detail. A writer that bypasses `postObjectsToClass` would skip both the pointer stamp and the ACL. |

---

## 14. Open questions — not blocking Phase 0

| Question | Owner | Needed by |
|---|---|---|
| What is the partner tier price, and what is included at each level? | Product | Before Stripe Products are created |
| Is any partner org intentionally **not** charged? `plan: "no-charge"` exists for this — mission-critical to get right before a bill reaches a grassroots partner. | Product + leadership | Before the first invoice |
| Does `FormSpecificationsV2.organizations` (an Array — forms are already shared across orgs) encode a relationship the `Organization` model should now own? | Eng | Phase 1 design |
| Does BUSL-1.1 imply a self-host or commercial tier that changes the `plan` model? | Product | Phase 1 |
| `organizationVerified` / `organizationUnverified` match `_User.organization` with an exact `equalTo` on free text (`cloud/src/definer/verification.definer.js`). They inherit the same case-sensitivity bug and should move onto the resolver. In scope, or filed separately? | Eng | Phase 1 |
