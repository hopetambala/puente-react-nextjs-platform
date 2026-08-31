# Organization → Billing: the remaining path

**What this is.** The complete route from *today* to the outcome
[billing-and-invoicing.md](billing-and-invoicing.md) exists to deliver — **money
gets invoiced and collected without a human assembling it by hand** — with every
step's state, gate, and pre-made decision.

**Why it exists.** Three docs, three jobs, no overlap:

| Doc | Owns |
|---|---|
| [billing-and-invoicing.md](billing-and-invoicing.md) | The **reasoning** — why flat-tier, the referee rule, the backfill runbook, ACL sequencing. Its *phase plan* is stale. |
| [organization-delivery-status.md](organization-delivery-status.md) | **What shipped**, with production evidence |
| **This file** | **The remaining path, in order**, with gates and decisions pre-resolved |

**Last updated 2026-08-30.** State below was verified against the repos, not
recalled. Where a fact is operational (Stripe, QuickBooks, the Back4App
dashboard) it is labelled **unverifiable from the repo** rather than guessed.

---

## The map

```
[DONE] Phase 1 ─── Organization is a real model; resolution works in all 3 apps
   │
   ├─ STEP A ─► puente_staff + OrganizationAdmin        ◄── finishes Phase 1
   │            spec: organization-admin-prd.md              NO GATE. Build it.
   │            cloudcode → Manage. Zero-regret.
   │
   ├─ STEP B ─► ⟦ EVIDENCE GATE ⟧ the Phase 2 trigger
   │            "Is the operator still hand-assembling invoices?"
   │            A conversation, not a project. Runs PARALLEL to Step A.
   │
   ├─ STEP C ─► Phase 2 — the billing surface        ◄── ONLY if Step B says build
   │            Stripe rail + Invoice mirror + composer. Manage + cloudcode only.
   │            │
   │            ▼
   │        ★ THE OUTCOME: invoices go out without hand-assembly ★
   │
   └── separate clock, NOT on the money path ──────────────────────────
       STEP D  Phase 3 — usage evidence (justifies price at renewal)
       STEP E  Phase 4 — pointer-only reads (29 call sites, gated at 100%)
       STEP F  Phase 5 — ACLs (riskiest, last; unlocks partner-facing invoices)
```

**The structural fact that shortens everything:** billing has no dependency on
Steps D–F. Billing unblocks at rollout step 3 (server-side pointer stamping),
which **already shipped** (billing §3). Steps D–F are platform-correctness work
with their own value and their own clock.

**No Collect release is required for any step on the money path.** (billing §3.1)

---

## State, verified

| Phase | State | Evidence |
|---|---|---|
| **0** — org audit | **Done** | 37 orgs, 792 accounts, 123 unresolved (2026-08-29 production audit) |
| **0** — Stripe Products/Prices, QuickBooks sync, hand-sent invoices, **§11 baseline metrics** | **Unverifiable from the repo** — ops | No Stripe reference exists anywhere in this codebase (verified 2026-08-30) |
| **1** — `Organization` class, CRUD, resolver, picker, alias scoping | **Done** | cloudcode #620/#621; Manage #86/#88/#89/#90/#92/#93; aggregator #123/#124; Collect #613 |
| **1** — admin surface | **DONE 2026-08-30** | cloudcode #621/#622 live in prod; Manage #96 (wrappers) + #97 (screen at `/organization-admin`) live on Vercel. Awaiting only the `puente_staff` master-key seed (A4). |
| **4** (partial, early) | **Done** | `short-code` export paths; `containedIn` alias scoping in Manage + Collect |
| **2** — billing surface | **Entirely unbuilt** | No `app/epics/Billing/`, no `app/services/stripe/`, no `pages/api/`, zero Stripe references |
| **3** — usage evidence | Unbuilt | — |
| **4** (rest) — pointer-only reads | Unbuilt, gated | **29 `surveyingOrganization` call sites** in `app/` + `pages/` |
| **5** — ACLs | Unbuilt, last by design | — |

> **`schema/schema.json` is stale — do not treat it as truth.** It contains no
> `Organization` class despite 37 live in production. It is a snapshot. This
> matters twice: it is why the §7.1 CLP finding **must** be read from the
> Back4App dashboard, and why "the schema says X" is never sufficient evidence
> in this repo.

---

## STEP A — `puente_staff` + `OrganizationAdmin` — ✅ COMPLETE, AND LIVE 2026-08-31

Code complete 2026-08-30; **seeded in production 2026-08-31**. `puente_staff` is
role `jJJ8TET4rj`, 30 organizations have an admin, and the screen is reachable.
See `organization-delivery-status.md` §1–2.

> **Shipped and live.** cloudcode #621 (puente_staff, isStaff, gated
> createOrganization) and #622 (editOrganizationAliases) are **deployed to
> production Back4App**; Manage #96 (cloud-code wrappers) and #97 (the screen at
> /organization-admin) are **live on Vercel**.
>
> Verified in production by canary: `isStaff` returns `{"isStaff":false}`
> unauthenticated, `createOrganization` and `editOrganizationAliases` both refuse
> with the new message, and `resolveOrganization` is unaffected — the regression
> check that matters, since Collect and Manage both depend on it.
>
> **The one remaining step is not code: seed `puente_staff` by master key (A4).**
> Until then the route correctly redirects everyone, and the gate is a no-op —
> every non-master call resolves to false exactly as before. Decision D2 stands:
> generate the candidate list by query, have a human confirm, then run the seed.
>
> A review of #621 found and fixed a live escalation path: `addToRole` takes no
> auth and writes under the master key, so it could have granted `puente_staff`
> to any unauthenticated caller once the role existed. Demonstrated against a
> real Parse server, then refused by name. The wider issue — `addToRole` being
> unauthenticated at all — is assumption 7 below.

**Spec:** [organization-admin-prd.md](organization-admin-prd.md) — scope,
stories, tests, critical files, §4 decision locked (convenience-first).

**Why unconditional, regardless of every gate below:**
1. It is the **live blocker** — since the picker landed, a new partner org can
   only be created with the master key and a console.
2. It finishes **Phase 1**.
3. It builds `puente_staff`, which is **the exact gate Step C needs** (billing
   §5 Phase 2 is staff-only, enforced server-side).
4. The unresolved-accounts queue is the worklist Steps E and F will both need.

**Order — cloudcode strictly first.** Manage's create button calls an endpoint
that today rejects every non-master call.

| # | Repo | Work |
|---|---|---|
| A1 | cloudcode | `puente_staff` role + `isStaff()`. **Do not reuse `addToRole`** — it sets `adminVerified: true` as a side effect (`roles.definer.js:23`). **Locked ACL: no public read or write** — the legacy `createAdminRole` sets `setPublicWriteAccess(true)` on the role object, so the legacy pattern must not be copied (PRD §4) |
| A2 | cloudcode | `createOrganization` gate → `request.master \|\| isStaff(request.user)` (the extension its own comment at `organization.definer.js:42` names) |
| A3 | cloudcode | `editOrganizationAliases` (+ optional `updateOrganization`), same gate, **collision guard preserved** |
| A4 | ops | Seed `puente_staff` by master-key script — see *Decisions* D2 |
| A5 | cloudcode | Deploy; canary: staff token creates an org, non-staff token rejected **server-side** |
| A6 | Manage | `isStaff` read, cloud-code wrappers, `OrganizationAdmin` screen, guarded route, i18n ×3, dlite + design ship gate |

**Definition of done:** an ops staffer with no master key creates a partner org
in Manage, and that org appears in the registration picker.

---

## STEP B — the evidence gate (run parallel to Step A)

The plan sets this trigger itself, and a linear reading blows straight through it:

> *"If the operator is still hand-assembling invoices after Phase 0, build the
> UI. If Stripe's own screens turn out to be enough for six customers, that is a
> legitimate outcome and the engineering time belongs on the AI-assistant work
> instead. **Decide on evidence, not on plan inertia.**"* — billing §5 Phase 0

**Four questions, one conversation with the finance/ops operator:**

1. Is Stripe Invoicing configured — Products, Prices, branding, net terms, dunning?
2. Is the QuickBooks sync on?
3. Did this cycle's invoices go out **from Stripe**, by hand?
4. **Were the §11 baselines captured** — days from month-end to all invoices sent, and operator time per cycle?

**Decision rule, pre-committed so this needs no further deliberation:**

| Finding | Action |
|---|---|
| Operator still hand-assembling, and it hurts | **Build Step C.** The plan's condition is met. |
| Stripe's own screens are sufficient for six customers | **Do not build Step C.** Close it as a legitimate outcome; engineering goes to the AI-assistant grant work. Record the decision here. |
| Phase 0 never happened | **Do Phase 0 first** (ops, zero code). Step C stays gated. Step A is unaffected. |
| Baselines were never captured | **Capture them before Step C.** Without them Step C's success is unmeasurable by §11 — and "we built it and it feels faster" is metrics theater. |

> **Anti-pattern — plan inertia.**
> **Symptom:** building the next phase because it is next, not because evidence says it is needed.
> **Consequence:** weeks of engineering on an invoice composer for six customers Stripe's dashboard already served — with the AI-assistant grant work displaced.
> **Fix:** answer the four questions above before writing Step C code. It is a conversation, not a project.

**This gate blocks only Step C.** Step A proceeds regardless.

---

## STEP C — Phase 2, the billing surface (gated on Step B)

Manage + cloudcode only. No Collect, no Flask.

| # | Work | Non-negotiable constraint |
|---|---|---|
| C1 | `app/services/stripe/` — the **only** module that talks to Stripe | — |
| C2 | `pages/api/…` routes for every Stripe call | **The secret key must never reach the browser.** Never a `NEXT_PUBLIC_*` var — copying this repo's `NEXT_PUBLIC_PUENTE_DATA_EXPORTER_API_URL` shape would leak it (billing §8) |
| C3 | `Invoice` **mirror** class — `stripeInvoiceId` + cached status only | **The referee rule:** payment state is mirrored, never authored. Nothing in Manage sets `paid`. Pin it with a test that fails if someone does. |
| C4 | `app/epics/Billing/` — org billing page, invoice composer, who-owes-what | Staff-only, gated server-side by `puente_staff` (from Step A) |
| C5 | Rate card → line items | Flat tier per org; **usage is evidence, never the charge basis** (billing §4) |

**Billing fields on `Organization`** (`plan`, `stripeCustomerId`, `billingEmail`)
**must not land until the class's permissions are settled** (billing §3). Until
then, keep them on a separate locked class or defer. This is the same `_Role`/CLP
verification named in the PRD §4 — one dashboard read settles both.

**Standing principle, enforced by omission:** billing state never gates data
collection. No paywall, no read-only mode, no export lock, no sync refusal. A
partner in arrears keeps collecting (billing §3).

---

## STEPS D–F — the separate clock

Not on the money path. Listed so their absence from Step C is a decision, not an oversight.

**STEP D — Phase 3, usage evidence.** Per-org, per-period: records synced, forms
in use, accounts that synced. Attachable to an invoice as justification.
Label it **"Synced," not "Collected"** — `createdAt` is sync time, not collection
time (billing §4). Reuse `app/epics/DashboardTriage/loadTriage.js`, which already
distinguishes exact counts from sampled ones.

**STEP E — Phase 4, pointer-only reads.** Concrete scope, counted 2026-08-30:
**29 `surveyingOrganization` call sites** in `app/` + `pages/`. Note not all are
query keys — `RecordInspector` and `FormManager/Table` *display* the collected
string, which is provenance and **should stay**. The query keys are the
`containedIn` sites: `DashboardTriage/loadTriage.js`, `DataCurationManager/`
(+ `CommunityAudit`), `app/modules/data-quality/`.
**Gated on 100% resolution per class**, with `Household` a permanent named
exception — 14,688 of 14,736 are unattributable (billing §7.3a). Cut over one
consumer at a time; Manage first (fast to revert).

**STEP F — Phase 5, ACLs.** Largest and riskiest; last for that reason.
Read the CLPs first. Pass A (grant only) → verify → Pass B (restrict), one class
and one org at a time, against the blocking gates in billing §7.4. **A wrong ACL
is functional data loss** — this is the Yinetza incident, recreated deliberately
and at scale. Unlocks partner-facing invoice visibility from Step C.

---

## Decisions — pre-resolved, so nothing waits on a meeting

| # | Question | **Decision** | Reversibility |
|---|---|---|---|
| **D1** | Is the `isStaff` gate a hard security boundary? | **Convenience-first.** Build now, label it convenience, verify the `_Role` CLP before calling it "secured." (PRD §4, locked 2026-08-30) | Trivial — relabel, or one CLP lock |
| **D2** | Who becomes `puente_staff`? | **SUPERSEDED 2026-08-31 — the stated rule is unsafe and returns the wrong people. See D2a.** | Easy — add/remove role members |
| **D2a** | Who becomes `puente_staff`, corrected | **Named accounts only, confirmed by a human, never derived from `_User.role`.** Seeded so far: `Fs96JuuxOO` (hopetambala@gmail.com). | Easy — add/remove role members |
| **D3** | Self-serve staff promotion? | **No, permanently.** Membership is master-key-seeded only. A "make me staff" endpoint is the entire escalation path. | n/a — a standing rule |
| **D4** | Build Step C? | **Gated on Step B**, with the decision rule pre-committed above. Not a judgment call at the time — read the table. | n/a |
| **D5** | Billing fields on `Organization` now? | **No.** Deferred until permissions are settled (billing §3). | Easy — add fields later |
| **D6** | Do Steps D–F block billing? | **No.** Explicitly off the money path. | n/a |
| **D7** | Order within Step A? | **cloudcode strictly before Manage.** The screen calls endpoints that reject every non-master call today. | n/a |
| **D8** | `organizationVerified`/`Unverified` still exact-match free text (billing §14) | **Fold into Step A3** — they inherit the same case-sensitivity bug and the resolver already exists. Small, same repo, same deploy. | Easy |

### Why D2 was superseded

D2 said to seed the accounts whose organization is Puente and whose `role` is
`administrator`. Run against production, that query returns **five Dominican
field staff with phone-number usernames — and not Hope**, whose `role` is
`contributor`.

The rule is also unsafe on its own terms. `puente_staff` is the highest
privilege in the system: it administers every organization. `_User.role` is a
free-text string that `updateUser` — which takes **no authentication** — will
set on any account by objectId. This roadmap already relies on that fact
elsewhere to argue authorization must live in Parse roles and never in
`_User.role`. D2 then derived the top privilege from exactly that field.

Deriving staff membership from a field any unauthenticated caller can write is
the escalation path D3 exists to close.

---

## Phase 0 decisions — taken 2026-08-31

Four answers that unblock Stripe configuration. Recorded here because Stripe
Products and Prices are built from them, and a price nobody wrote down becomes
a price nobody can defend to a partner.

| # | Question | **Decision** |
|---|---|---|
| **P1** | Partner tier shape | **Both models, together.** A recurring per-month subscription AND services priced per partner by negotiation. Not either/or. |
| **P2** | Rate card services | **Custom form build · Data cleanup · Training · Custom export or integration.** All four. |
| **P3** | Net terms | **Net 30.** This is what the days-overdue column counts from and what Stripe's dunning fires on. |
| **P4** | §11 baselines before Phase 0 | **Skipped, deliberately.** See below. |

**P1 changed the code.** A shared rate card cannot express a negotiated price,
so `buildDraftInvoice` now takes `organization.negotiatedRates`, which override
the catalogue per service code and are marked `negotiated` on the line. A
negotiated rate is sufficient on its own with no catalogue entry — a bespoke
engagement has no list price by definition, and requiring one would mean
inventing a fake catalogue row for every one-off piece of work.

### P4 — the baselines are being skipped, on purpose

The plan says to capture days-from-month-end-to-invoices-sent and operator hours
per cycle **before** Phase 0, or Phase 2 is unmeasurable by §11. Hope's call is
to skip them and build regardless, on the grounds that the manual process is
known to be painful enough that measuring it is not worth the delay.

Recording it so it reads as a decision rather than an oversight, and so nobody
later asks why there is no baseline:

- **What is given up:** the Phase 2 retrospective has nothing to compare
  against. "We built it and it feels faster" is the definition of metrics
  theater, and that judgement will not be available.
- **What survives:** the other two §11 metrics still work. *Invoices needing
  manual correction* and *% of org strings resolving* are both measurable after
  the fact, and the second is already at 89%.
- **Cheapest recovery if this is regretted:** time the FIRST Stripe cycle rather
  than the last manual one. It is not a true baseline — the tooling has already
  changed — but it gives the second cycle something to beat.

> **Anti-pattern — the undocumented skip.**
> **Symptom:** a plan step quietly not done, so six months later nobody can tell
> whether it was considered or forgotten.
> **Consequence:** the same argument gets had twice, with less context the
> second time.
> **Fix:** write the decision and its cost down where the step was specified.
> That is this section.

---

## What still blocks Phase 0

Everything below is Stripe configuration, and the only missing inputs are
amounts.

| # | Item | Blocked on |
|---|---|---|
| 1 | ~~Audit the real org strings~~ | **DONE 2026-08-31** — 58 organizations, 89% of accounts resolving. See `organization-delivery-status.md` §4 and `billable-roster.md`. |
| 2 | Stripe **Products** | Nothing — one subscription Product plus four service Products, named in P2 |
| 3 | Stripe **Prices** | **The amounts.** One monthly subscription price, and a list price per service. Negotiated per-partner rates do not need Stripe Prices — they ride as invoice line items. |
| 4 | Invoice branding, net terms | Nothing — terms are Net 30 (P3) |
| 5 | Automatic dunning | Nothing — follows from Net 30 |
| 6 | QuickBooks sync | Nothing — a toggle in Stripe |
| 7 | Send this cycle from Stripe | Items 2–6 |

**So Phase 0 is blocked on exactly one thing: the numbers.** A subscription
price, and four service list prices. Everything else is configuration that
follows from decisions already taken.

Which organizations are `no-charge` is a separate decision and does not block
Phase 0 — `billable-roster.md` quantifies it at 14 rows.

---

## D9 — the billing operator holds FULL `puente_staff`, accepted 2026-08-31

`billing@puente-dr.org` was created and added to `puente_staff` so `/billing` is
reachable. That role is coarse: it is the only staff role there is, so the
billing operator can do everything Puente staff can do.

**What that grants, beyond billing:**

| Endpoint | Reach |
|---|---|
| `setOrgAdmin` | make anyone an admin of any organization |
| `setUserActive` | deactivate any user in any organization |
| `createOrganization`, `editOrganizationAliases` | create partners, rewrite alias sets |
| `updateRateCard` | change every price |

**What it does NOT grant** — master key only: `seedPuenteStaff` (cannot create
more staff), `planOrgAdminSeed` / `applyOrgAdminSeed`, `mirrorInvoice` (cannot
author payment state), `addToRole`, `lockLegacyRoleAcls`.

**The decision: leave it as full staff.** Hope's call, 2026-08-31.

**The risk being accepted, stated plainly.** Nothing in the billing job needs
`setOrgAdmin` or `setUserActive`. A bookkeeper who can deactivate a promotora
mid-fieldwork, or hand admin of a partner's data to a stranger, is a different
risk from an engineer who can — and D1 accepted the coarse role back when
"staff" meant Puente engineers, not an external operator at a `billing@`
address.

**The fix if this is revisited:** a `puente_billing` role gating only
`updateRateCard`, `setOrganizationBilling`, `getOrganizationBilling`,
`listInvoices` and the composer, with `puente_staff` also satisfying that gate so
nothing existing breaks. A cloudcode change plus a route-guard tweak — small,
and it stays small as long as billing endpoints are added behind the narrower
gate rather than the broad one.

> **Anti-pattern — the role that means "trusted".**
> **Symptom:** one role gates everything privileged, so granting someone the
> narrow thing they need also grants the broad things they do not.
> **Consequence:** access decisions stop being about the job and start being
> about the person, and the only options are all or nothing.
> **Fix:** gate by capability, not by trust level. Recorded here rather than
> fixed, because it is now an accepted risk with a named owner.

---

## What genuinely cannot be done without a human

Short list, deliberately. Everything else is decided above.

| Blocker | Why no amount of engineering resolves it | Recommended default |
|---|---|---|
| **Step B's four questions** | Operational facts about Stripe/QuickBooks/the operator's month. Invisible from every repo. | Ask the operator. One conversation. Step A proceeds meanwhile. |
| **The `_Role` CLP read** | Needs Back4App dashboard or master-key schema access. The only alternative is a **write probe against production `_Role`** — a mutating change to live auth data, which must not be run to answer a question. | Read the dashboard. Until then: ship, label convenience (D1). |
| **Running the `puente_staff` seed** | Requires the master key by design (D3). | Generate the candidate list by query, confirm, run. |
| **Merging to `master`** | Ships to production via Vercel; the standing ship gate requires review then explicit approval. | Open the PR; request approval. |
| **Partner tier price / `no-charge` partners** (billing §14) | A pricing and relationship decision. Blocks **Stripe Products**, not any code in Step A or the Step C scaffolding. | Decide before the first invoice, not before the first commit. |

---

## Success metrics — the ones that drive a decision

From billing §11, reduced to what applies on this path:

| Metric | The decision it drives |
|---|---|
| Days from month-end to all invoices sent | The stated pain. **Baseline before Step C** or Step C is unmeasurable. |
| Operator time per billing cycle | Decides whether Step C was worth building — the retrospective on D4 |
| Invoices needing manual correction | If high after Step A, the alias table is still incomplete |
| % of org strings resolving, **per class** | **MEASURED 2026-08-31 — the gate is met, and the metric needed restating. See below.** |

### The per-class gate, measured — and why it was the wrong question

Run against production, exact counts, not samples:

| class | records | no organization | |
|---|---|---|---|
| `SurveyData` | 43,979 | 9 | 0.0% |
| `EvaluationMedical` | 16,319 | 0 | 0.0% |
| `Assets` | 447 | 1 | 0.2% |
| `FormResults` | 34,810 | 330 | 0.9% |
| `Vitals` | 20,587 | 3,366 | 16.4% |
| `HistoryEnvironmentalHealth` | 33,508 | 8,444 | 25.2% |
| `HistoryMedical` | 351 | 351 | **the field is absent from the schema** |
| `Household` | 14,736 | 14,688 | 99.7% — exempted, and now we know why |

Read literally, the gate fails on four classes and can never pass on
`HistoryMedical`. That reading is wrong, and the correction is the finding:

**Every unattributed record is pre-2023 legacy.** Filtered by `createdAt`, records
with no organization created since 2023: `Vitals` **0**, `HistoryEnvironmentalHealth`
**0**, `FormResults` **0**. `SurveyData` has 9 — and those are the faker test rows
in §4a, not field data.

They also cannot be repaired. A sample of 200 blank `Vitals` and 200 blank
`HistoryEnvironmentalHealth` records carries **no `parseUser` and no
`surveyingUser`** — there is nothing to attribute them from. They predate the
app stamping attribution at all.

**So the metric is restated:** *unattributed records created within the billing
period.* By that measure it is **zero**, and it was zero before this work began.

> **Anti-pattern — the unmeetable gate.**
> **Symptom:** a 100% quality bar that counts records nobody can ever fix.
> **Consequence:** either the gate is quietly ignored, or Step C waits forever on
> a backfill with no input data. Both are worse than restating it.
> **Fix:** scope the gate to the period the decision is about. A billing gate
> should count billable-period records.

**Consequence for the roadmap: data quality does not block Step C.** The gate
that was meant to hold billing back is satisfied. Step C is now gated on Step B
alone.

---

## Assumptions to validate

| # | Assumption | Owner | Risk if wrong |
|---|---|---|---|
| 1 | Phase 0's Stripe/QuickBooks setup happened | Ops — Step B | If not, Step C's gate can't even be evaluated; Phase 0 comes first |
| 2 | The §11 baselines were captured before Phase 0 | Ops — Step B | Without them, Step C's success is unprovable and the §11 metrics are theater |
| 3 | The `_Role` CLP restricts writes to the master key | Eng w/ dashboard | If open, D1's gate is a paper gate; fix is one targeted CLP lock, **not** Step F |
| 4 | Six partners is still the scale | Product | If partner count grows materially, Step B's "Stripe's screens are enough" answer flips |
| 5 | ~~No caller depends on `createOrganization` being master-key-**only**~~ **CLEARED 2026-08-30** | Eng | Verified: the integration suite's `createOrganizationUnprivileged` guard test still passes; 82/82 green |
| 7 | **`addToRole` is unauthenticated and writes under the master key** — pre-existing, now partially contained | Eng — its own change, not Step A | It could grant *any* role to *any* user. `puente_staff` is now refused by name (found and fixed in review of PR #621, demonstrated live), but the endpoint itself still needs an auth gate. Nothing calls it from Manage or Collect, so gating it is low-risk when someone picks it up. |
| 6 | The three resolvers (cloudcode/Manage/Collect) have not drifted | Eng — diff them when touching any | If they diverge, the three systems disagree about who owns a record. **The standing maintenance hazard of this whole body of work.** |

---

## Related

- [organization-admin-prd.md](organization-admin-prd.md) — Step A, buildable
- [billing-and-invoicing.md](billing-and-invoicing.md) — the reasoning behind every step
- [organization-delivery-status.md](organization-delivery-status.md) — what shipped, with production evidence
- [organization-onboarding.md](organization-onboarding.md) — the master-key process Step A replaces
- [cross-repo-impact-checklist.md](cross-repo-impact-checklist.md) — run before touching the org path
