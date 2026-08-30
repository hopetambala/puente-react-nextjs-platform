# PRD — `puente_staff` role + `OrganizationAdmin` screen

> **What this is.** The buildable spec for the piece
> [organization-delivery-status.md](organization-delivery-status.md) names as
> *"the only real blocker"* (§Next.1). The **reasoning** lives in
> [billing-and-invoicing.md](billing-and-invoicing.md) — §5 Phase 1 (the admin
> surface), §7.1 (the tenancy-only role axis), §8 (critical files). This doc does
> not re-argue those; it is the authority on *how to build this one feature*.
> **Scope discipline:** minimal tenancy role only — explicitly **not** the §7
> ACL/CLP migration, which is the riskiest phase in the plan and goes last.

**Repos touched:** `puente-node-cloudcode` (fast train) → `puente-react-nextjs-platform` (ships on merge). **No Collect. No Flask.** One repo pair in flight — respects the small-team constraint.

---

## 1. Recommendation, up front

**Build a staff-only `OrganizationAdmin` screen in Manage that drives new
`isStaff`-gated Cloud Code endpoints, and seed `puente_staff` membership by
master-key script — no self-serve promotion.**

The outcome that justifies it, in one sentence:

> **A Puente ops/program staffer — not an engineer, without the master key — can
> create a partner organization, fix its aliases, and see who failed to resolve,
> from inside Manage.**

Today that requires a developer running a console script under the master key
(see [organization-onboarding.md](organization-onboarding.md) §Step 1). Since the
registration picker landed, **this is the only way a new partner can exist** — so
the gap is a live operational blocker on every new partner, not a nicety.

**Decision, locked 2026-08-30 — §4:** ship **convenience-first**. The screen and
the `isStaff` gate get built now; they remove the master key from the routine
onboarding loop, which is the outcome that justifies the work. The gate is
**labelled a convenience boundary, not a hard one**, until the `_Role` CLP is
verified in production — that verification is a **named gate before the feature
is called "secured," not a blocker on building it.** This matches the 2026-08-29
posture that §7-class holes "become real when §7 ships." Full rationale in §4.

---

## 2. Problem, persona, job-to-be-done

**Proto-persona — "the onboarder."** Puente internal ops/program staff. Lives in
email and QuickBooks, not a terminal. Trusted with partner relationships; *not*
given the Back4App master key, and shouldn't be. Onboards a new partner a handful
of times a year and fixes a misspelled org string more often than that.

**JTBD:** *When a new partner signs on (or an existing partner's records stop
showing up), I want to register/repair that organization myself, so a developer
isn't a required step in a routine ops task.*

**Why Manage, not the Back4App console** (from billing §5, confirmed in code):
the same screen is the worklist the §6 backfill and §7 ACL migration will both
need for their unresolved buckets. **One surface, three future consumers** — build
it once, here.

> **Anti-pattern — the developer-in-the-loop tax.**
> **Symptom:** a routine business task (onboard a partner) requires an engineer
> with a production master key.
> **Consequence:** onboarding stalls on eng availability; the master key gets
> handed around or pasted into scripts; the alias table only gets fixed when
> someone escalates.
> **Fix:** a staff-gated screen that removes the master key from the routine loop
> while keeping it as the root of trust for *who is staff*.

---

## 3. Scope — MoSCoW

| Priority | Item | Rationale |
|---|---|---|
| **Must** | `puente_staff` role (cloudcode) + `isStaff()` helper + flip `createOrganization` to `request.master \|\| isStaff` | The hard blocker: a new partner cannot exist without the master key today. |
| **Must** | **Create-organization** form in Manage, driving the gated endpoint | The one thing that unblocks partner onboarding. |
| **Should** | **Edit-aliases** on an existing org (new staff-gated endpoint + UI) | Aliases are how records find their org; "add every spelling you've seen" is a *recurring* need, not a one-off. |
| **Should** | **Unresolved-accounts queue** (render only — loader already computes it) | Read side is done in `loadOrganizationAdmin.js`; rendering it is nearly free and makes the screen useful between onboardings. |
| **Could** | Toggle `active`, edit canonical `name` | Cheap once the edit endpoint exists; low urgency. |
| **Won't (this phase)** | §7 ACL/CLP record migration; partner-facing views; `plan`/`stripeCustomerId`/`billingEmail` fields; `updateUser` auth fix; Collect signup picker | Each is its own train with its own risk. Billing fields must not land on a possibly-world-writable class (billing §3). |

The **Must** line ships one real fix on its own: partner onboarding no longer
needs a developer.

---

## 4. The security-boundary decision (the fork from §1)

`isStaff` becomes a privilege boundary the moment it gates `createOrganization`.
That boundary is only as strong as **who can join `puente_staff`**.

> **Verified 2026-08-30 — the legacy role pattern is publicly writable.**
> `createAdminRole` in `cloud/src/services/roles/roles.js` sets
> `acl.setPublicWriteAccess(true)` **on the `admin` `_Role` object itself**, with
> `createManagerRole` / `createContributorRole` setting public *read*. So role
> membership is writable by anyone holding the shipped JavaScript key —
> independent of the `_Role` CLP. This is the paper-gate risk, confirmed in code
> rather than inferred from the schema snapshot.
>
> **Three consequences, binding on this build:**
> 1. **`puente_staff` must NOT be created by the legacy pattern.** Its ACL sets
>    **no public write and no public read** — master-key only. Follow the newer
>    `createOrganization` precedent (`organization.definer.js`), which already
>    sets public read + no public write and comments that it beats the class
>    default.
> 2. **`isStaff` runs server-side under the master key.** With the role
>    unreadable publicly, a browser cannot evaluate membership by querying
>    `_Role` — which is correct. Manage gets a small Cloud Code endpoint
>    (`isStaff` / `whoAmI`) that returns the boolean; the client never reads
>    `_Role`.
> 3. **Do not "fix" the legacy roles here.** They are inert (billing §7.1) and
>    changing their ACLs touches the signup grant. Out of scope — but the finding
>    belongs in the §7 record, and it strengthens the case for the `_Role` CLP
>    lock below.

> **Found and fixed in review, 2026-08-30 — `addToRole` was a live escalation
> path.** `addToRole` (`roles.definer.js`) takes **no authentication** and does
> every write under the master key. Any unauthenticated caller holding the app
> id can name a role and join it. That was survivable while the only roles were
> the three inert legacy ones — it stopped being survivable the moment
> `puente_staff` gated `createOrganization`:
>
> ```js
> Parse.Cloud.run('addToRole', { userID: '<own id>', roleName: 'puente_staff' })
> ```
>
> The role's locked ACL does **not** prevent this, because `addToRole` writes
> with the master key. **This was demonstrated against a live Parse server, not
> theorised** — the regression test's failure took its neighbour down with it,
> reporting role `puente_staff` where `manager` was expected, because the
> escalation actually succeeded.
>
> **Fixed** in cloudcode by refusing the staff role by name, before any
> mutation. Scoped narrowly on purpose: no app calls `addToRole` (zero call
> sites in Manage and Collect), so legacy behaviour is preserved exactly.
>
> **Still open, deliberately:** `addToRole` is unauthenticated *at all*. That is
> pre-existing, has its own blast radius, and belongs in its own change — see
> the roadmap's Step F notes. It is now recorded rather than assumed harmless.
>
> **The lesson worth keeping:** the danger of a new privilege is not only how it
> is *checked*, it is every existing path that can *grant* it. A locked ACL and
> a server-side gate are both defeated by one unauthenticated endpoint that
> writes with the master key.

**Two things must both hold for the gate to be a *hard* boundary:**

1. **Staff membership is master-key-only.** This phase assigns `puente_staff` via
   a documented master-key script (§5 step 1c) — **no UI, no self-serve
   promotion.** A "make me staff" endpoint would be the whole escalation path.
2. **`_Role` is not publicly writable in production.** Billing §7.1 records that
   the `schema/schema.json` snapshot shows **every class, including `_Role`**, as
   `"create/update/delete": {"*": true}` — but that snapshot is *unverified
   against production*. If it holds, a client with the shipped JS key could add
   itself to `puente_staff` directly via the SDK, and the server gate is theater.

> **Anti-pattern — the paper gate.**
> **Symptom:** a server-side role check that guards a sensitive action, while the
> role itself is publicly writable.
> **Consequence:** the check reads as security in review and in the code, but any
> client can grant itself the role — worse than no gate, because it's *trusted*.
> **Fix:** verify the `_Role` CLP; if open, lock `_Role` create/update/delete to
> the master key. That is a single-class CLP change — it takes nothing away from
> record reads, so it is **not** the deferred §7 record-ACL migration.

**Decision (locked 2026-08-30): ship convenience-first.** Build the screen and
the `isStaff` gate now, labelled a **convenience** boundary. It removes the
master key from the routine onboarding loop and stops casual misuse — ordinary
users can't call `createOrganization` at all today — and that is the outcome
that justifies the work. Do **not** advertise the feature as "secured" until the
`_Role` CLP is confirmed closed.

**The verification is a gate, and it is assigned, not skipped.** Before the
feature is called secured, someone with Back4App dashboard / master-key access
reads the `_Role` CLP (§10 assumption 1):
- **If `_Role` is already master-key-only:** the gate was a hard boundary all
  along — relabel from convenience to secured, no code change.
- **If `_Role` is open:** lock `_Role` create/update/delete to the master key —
  a single-class CLP change, **not** the deferred §7 record-ACL migration —
  after confirming no legitimate client path writes `_Role` directly (the Cloud
  Code role functions run server-side; verify nothing else does).

**Why this wasn't closed when the decision was locked:** reading a CLP cleanly
needs the Parse schema endpoint under the **master key**, which the authoring
session did not have; the only alternative is a *write probe against production
`_Role`*, a mutating change to live auth data that must not be run to answer a
question. So the check is owned by dashboard access, by design — recording it
here is what keeps it from being silently inherited.

This matches the 2026-08-29 stance (delivery-status §4: `updateUser`'s no-auth
hole "becomes real when §7 ships") — the choice is now explicit, not accidental.

---

## 5. Cross-repo sequencing

**cloudcode strictly precedes Manage.** The Manage create button calls an endpoint
that today rejects every non-master call — so until cloudcode ships the `isStaff`
path, the screen has nothing that works. Fast train first, then Manage on merge.

### Step 1 — cloudcode (deploys independently)

- **1a.** New `puente_staff` role in `cloud/src/definer/roles.definer.js`.
  **Do not reuse `addToRole`** — it sets `adminVerified: true` as a side effect
  (verified, `roles.definer.js:23`). Add a clean staff-assignment path that
  touches the `_Role` relation only. Leave the inert legacy roles
  (`admin`/`manager`/`contributor`) untouched and unextended (billing §7.1).
- **1b.** `isStaff(user)` helper (role-membership check). Flip
  `createOrganization` (`organization.definer.js:47`) from `if (!request.master)`
  to `request.master || isStaff(request.user)` — the extension the code comment
  already names.
- **1c.** New staff-gated endpoints the screen needs:
  `editOrganizationAliases` (add/remove an alias, preserving the existing
  cross-org uniqueness refusal), and optionally `updateOrganization` (name,
  `active`). Same `request.master || isStaff` gate. Preserve the collision guard —
  an alias that belongs to another org must still throw, not overwrite.
- **1d.** **Runbook (ops, once):** seed `puente_staff` with the Puente-internal
  accounts by master-key script. Which accounts is a human decision — capture the
  list. This is the trust seed; it is deliberately not a UI.
- **1e.** Deploy and canary: confirm a staff session token can create an org and a
  non-staff token gets rejected server-side.

### Step 2 — Manage (ships on merge, after 1e)

- **2a.** `isStaff(currentUser)` read in `app/modules/user/helpers.js` — for nav
  visibility and the route guard **only**. Manage has no role concept today; this
  is new. Client gate is UX; the server gate from step 1 is the enforcement.
- **2b.** `app/modules/cloud-code/` wrappers for `createOrganization`,
  `editOrganizationAliases`, `updateOrganization`.
- **2c.** The screen: `app/epics/OrganizationAdmin/OrganizationAdmin.js` +
  sub-components, driven by the existing `loadOrganizationAdmin.js`. Org list →
  create form → per-org alias editor → unresolved queue (render the loader's
  `unresolved`, always with the `accountsChecked` denominator; show `unavailable`
  distinctly from "zero unresolved").
- **2d.** Route: `pages/organization-admin/index.tsx` (mirrors
  `pages/quick-start/index.tsx` mounting an epic), guarded by `isStaff`;
  non-staff get redirected, not a blank screen.
- **2e.** dlite tokens + the design ship gate + i18n keys in **all three** locales
  (`eng`/`spa`/`hat`) from the start — CI parity has no allowlist, so English-only
  strings fail the build.

No Collect step and no store review (this screen is Manage-only). No Flask step
(no new export column). Stated so their absence is a decision, not an oversight.

---

## 6. User stories & acceptance criteria

**US-1 — Create an organization (Must)**
*As the onboarder, I create a partner org so its first user can register and resolve.*
- **Given** I am `puente_staff`, **when** I submit name + shortCode (+ optional aliases), **then** the org is created via `createOrganization` on my session token — no master key — and appears in the list.
- **Given** a duplicate shortCode or an alias already owned by another org, **then** creation is refused with the offending value named, and nothing is written.
- **Given** I am **not** staff, **then** the endpoint rejects me server-side even if I reach it directly (not just a hidden button).

**US-2 — Edit aliases (Should)**
*As the onboarder, I add a newly-seen spelling so that org's records resolve.*
- **Given** an org, **when** I add an alias not owned by any other org, **then** it persists and subsequent resolution matches it.
- **Given** an alias owned by another org, **then** it is refused (the collision guard, unchanged).
- Canonical `name` remains an implicit alias — never require re-adding it.

**US-3 — See who didn't resolve (Should)**
*As the onboarder, I see the queue of unresolved accounts so I know which aliases to add.*
- **Then** the list is newest-first, each row shows the typed `organization`, and the header shows `unresolved` **of** `accountsChecked`.
- **Given** the read saturated (`truncated`/limit reached) or failed (`unavailable`), **then** that is shown distinctly — never rendered as "0 unresolved / all clear."

**US-4 — Non-staff can't reach it (Must)**
- **Given** a non-staff user, **when** they hit `/organization-admin`, **then** they are redirected; and the underlying endpoints reject them regardless of the UI.

---

## 7. Critical files

**Manage** (`puente-react-nextjs-platform`)

| Path | Change |
|---|---|
| `app/epics/OrganizationAdmin/loadOrganizationAdmin.js` | **Reuse** — read side is done |
| `app/epics/OrganizationAdmin/OrganizationAdmin.js` (+ `CreateOrganizationForm`, `AliasEditor`, `UnresolvedQueue`, `*.module.css`) | **New** — the screen |
| `pages/organization-admin/index.tsx` | **New** — staff-guarded route |
| `app/modules/cloud-code/` | **New** wrappers: create / edit-aliases / update org |
| `app/modules/user/helpers.js` | **New** `isStaff()` — calls the Cloud Code endpoint (nav + route UX). **Never queries `_Role` from the browser** — the role is deliberately not publicly readable (§4) |
| `public/locales/{eng,spa,hat}/common.json` | New keys, all three locales |

**cloudcode** (`puente-node-cloudcode`)

| Path | Change |
|---|---|
| `cloud/src/definer/roles.definer.js` | **New** `puente_staff` role + clean assignment (no `adminVerified` side effect) |
| `cloud/src/definer/organization.definer.js:47` | Flip gate to `request.master \|\| isStaff(request.user)`; add `editOrganizationAliases` / `updateOrganization`, same gate, collision guard preserved |
| `isStaff` helper (service/util) | **New** — role-membership check |
| Back4App CLP on `_Role` | **Verify**; lock to master-key if open (§4) |

---

## 8. Test plan (red-green-tdd — standing rule)

Every behavioral change: failing test first, seen failing, then minimum code.

**cloudcode**
- `isStaff`: true for a role member, false for a non-member, false for `undefined` user.
- `createOrganization`: rejects non-staff non-master; accepts staff token; accepts master key; still refuses duplicate shortCode and cross-org alias collision.
- `editOrganizationAliases`: rejects non-staff; adds a free alias; refuses a colliding alias without overwriting.
- Staff assignment does **not** set `adminVerified` (guards the §7.1 coupling).

**Manage**
- `loadOrganizationAdmin` contract is already testable (Parse injected) — extend for the screen's states: populated, empty-but-checked, `unavailable`, saturated.
- Create form: valid submit calls the wrapper once with the right params; duplicate/collision surfaces the server error; invalid input never calls the endpoint.
- Route guard: non-staff redirected; staff renders.
- Unresolved queue renders `unresolved` with the `accountsChecked` denominator and never renders `unavailable` as all-clear.

UI goes through dlite tokens, the design ship gate, and i18n keys — not English strings to translate later.

---

## 9. Out of scope — explicitly

- **The §7 record ACL/CLP migration** — this is tenancy-role-only. The single
  exception considered is the `_Role` CLP lock (§4), and only if verification
  shows it's needed.
- **Self-serve staff promotion** — membership is master-key-seeded (§4).
- **Partner-facing views** — an org seeing its own data/invoices needs §7 to be
  safe (billing §2 Phase 2 note); not here.
- **`plan` / `stripeCustomerId` / `billingEmail` on `Organization`** — must wait
  for the class's permissions to be settled (billing §3).
- **The `updateUser` no-auth hole** — real, deferred to §7 by decision
  (delivery-status §4).
- **Collect signup picker** — separate, needs a store release
  (delivery-status §Next.2).

---

## 10. Assumptions to validate

| # | Assumption | Owner | Risk if wrong |
|---|---|---|---|
| 1 | The `_Role` CLP in **production** restricts create/update/delete to the master key | Eng w/ dashboard access — read it **before the feature is called "secured"** (gate, not a build blocker — §4) | If open, the `isStaff` gate is a paper gate; the fix is one targeted `_Role` CLP lock, not the §7 record migration |
| 2 | The set of Puente-internal accounts to seed into `puente_staff` is known and small | Ops/leadership — step 1d | A wrong seed either locks out staff or over-grants; it's the trust root |
| 3 | Reading role membership client-side (`isStaff`) is cheap and doesn't need a new round-trip pattern | Eng | If it needs a Cloud Code call per render, the route guard needs caching |
| 4 | `editOrganizationAliases` doesn't need to also fix historical records immediately | Eng | Reads already match the whole alias set (`containedIn`), so a new alias resolves existing records on next read — confirm no cache pins the old set |
| 5 | No other caller depends on `createOrganization` being master-key-*only* | Eng — grep cloudcode + integration tests | Loosening the gate must not break the integration tests that call it with `useMasterKey` |

---

## 11. Verification

1. `yarn test` (Manage) and the cloudcode suite — both green, including the gate and coupling tests.
2. cloudcode deployed; with a **staff** session token, `createOrganization` succeeds; with a **non-staff** token it's rejected **server-side** (verify by direct `Parse.Cloud.run`, not just the hidden button).
3. In Manage as a staff user: create an org → it appears in the picker at `/account/register`; add an alias → an account on that spelling resolves on next dashboard load.
4. As a **non-staff** user: `/organization-admin` redirects; the wrapper endpoints reject a direct call.
5. Unresolved queue shows `N of accountsChecked`, newest-first; force the loader's `unavailable`/saturated path and confirm it does **not** read as all-clear.
6. Confirm a seeded staff account's `adminVerified` was **not** flipped by the assignment (the §7.1 coupling stayed untangled).
7. §4 decision recorded: the `_Role` CLP state is written down, and the feature is labelled convenience-vs-secured accordingly.

---

## Related

- [billing-and-invoicing.md](billing-and-invoicing.md) — reasoning (§5 Phase 1, §7.1, §8)
- [organization-delivery-status.md](organization-delivery-status.md) — what shipped; this is §Next.1
- [organization-onboarding.md](organization-onboarding.md) — the master-key process this replaces
- [cross-repo-impact-checklist.md](cross-repo-impact-checklist.md) — run before touching the org path
