# Self-service organizations, org admins, and Puente super-admins

**Status: specified 2026-08-30, not yet built.** Decisions below were taken by
Hope in a scoping session; each is recorded with the reasoning so nobody has to
re-litigate it. This supersedes two things it contradicts — see §1.

**Scope: four repos and a store release.** cloudcode, Manage, Collect, and the
docs. This is deliberately *not* the fast-train-only version.

---

## 1. What this reverses, and why that is allowed now

Two recorded positions change here. Both were right when written; both were
premised on a guard this spec replaces.

**`billing-and-invoicing.md` §10 said: "Self-serve organization creation —
Puente staff create orgs by hand."** The reasoning was that six partners do not
justify a self-serve flow, and *a human confirming each one is what makes the
alias table trustworthy enough to bill from*. That reasoning is sound. The human
was the guard against tenant forking.

**cloudcode #620 deleted first-user-becomes-administrator** because it fired on
*any* string nobody had used before, unauthenticated, with no human involved —
typing `puente` where records said `Puente` was enough to mint an administrator.

> **What makes the reversal safe is that the human is replaced, not removed.**
> A server-side fuzzy match (§3) now refuses a name close to an existing one and
> routes it to staff. The guard moves from "a human approves every organization"
> to "a human approves only the ambiguous ones." Creation stops being a side
> effect of typing and becomes a checked operation.

If the fuzzy match is ever weakened, this reversal is no longer safe. That is
the load-bearing dependency.

---

## 2. The model

| Actor | Scope | Can do |
|---|---|---|
| **Anyone at signup** | — | Join an existing organization. Create a *clearly distinct* new one and become its admin. |
| **Org admin** | Their own organization only | Edit aliases · edit display name · approve/reject joiners · deactivate members |
| **`puente_staff`** | Every organization | Everything an org admin can, on any org · promote/demote org admins · create an org on a partner's behalf · deactivate an entire organization |

`puente_staff` already exists, is deployed, and is seeded only by master key —
there is deliberately no self-service promotion (see
[organization-admin-prd.md](organization-admin-prd.md) §4). It is the super-admin
principal. **`role: administrator` + `organization: Puente` is explicitly NOT
used for this**, because `updateUser` takes no auth and runs under the master
key, so anyone could set both fields on any account by objectId and grant
themselves super-admin.

---

## 3. The fuzzy-match guard — the load-bearing piece

Applied server-side in `signup`, against **every existing organization's name
and every alias**, on the normalized form (case- and accent-folded — the
existing `normalizeOrganizationName`).

| Test | Outcome |
|---|---|
| Normalized exact match | **Join** that organization (behaviour today) |
| Normalized substring containment, either direction | **Refuse** → route to staff |
| Levenshtein distance ≤ 2 on the normalized form | **Refuse** → route to staff |
| Otherwise | **Create**, and the signer-up becomes its admin |

**Deliberately tighter than pure edit distance.** `Puente Colorado` vs `Puente`
has a large edit distance but is caught by containment. The asymmetry is
intentional and is the whole design: a false refusal costs one email; a false
accept forks a tenant permanently and silently, and production has already shown
what that costs — DR Missions had 11 rows under its canonical name and **611**
under `DRMT`; Rayjon 185 against **1,196**.

The threshold is a named constant, changeable in one place, and covered by tests
that pin both directions.

**On refusal** the account is still created — the person becomes a contributor
with an unresolved organization, exactly as today. **A signup is never rejected
outright**: an unidentified organization is an ops problem, a person who cannot
make an account is a field problem. The refused string lands in the
organization-admin queue with the account attached, so staff can create the org
or add an alias.

---

## 4. Decisions, with the reasoning

| # | Decision | Why |
|---|---|---|
| D1 | Fuzzy-match refusal is the typo guard | Replaces the human as the anti-forking guard (§1) |
| D2 | Both Manage **and** Collect can create | Hope's call; accepts a store release to get it |
| D3 | `puente_staff` is the super-admin principal | Explicit, server-checked, not self-grantable |
| D4 | Org admin: aliases, display name, approve/reject, deactivate | All four requested |
| D5 | Existing 37 orgs: **earliest account** becomes admin | Hope's call over staff-assigns. **Applied via dry-run first** — it is a bulk privilege grant across 37 orgs; the list is produced and read before anything is written (the §6 backfill rule: the dry run is the deliverable) |
| D6 | Joining is immediate and revocable | A promotora blocked in the field is a field problem; an unwanted account is an ops problem. Mirrors "billing state never gates data collection" |
| D7 | False refusal routes to Puente staff | Keeps a human on exactly the ambiguous cases and nowhere else |
| D8 | Self-created orgs are `plan: no-charge` | Nobody is ever billed by accident. Preserves billing-and-invoicing's assumption that a *billable* org was vetted |
| D9 | Deactivation blocks sign-in **and destroys sessions** | Flag-only would be a control that does nothing. Session destruction is what makes it real on an offline-first device |
| D10 | Staff get all four override powers | Includes promote/demote, which is the recovery path when D5's seed picks a stale account |
| D11 | Collect: fix the picker **and** add create-new | Without the list a user types blind and refusals feel arbitrary. One release covers both |
| D12 | Unresolved 123: auto-resolve the ~12 plausible, queue the rest | The audit found ~12 look like real orgs (Peace Corps, Notre Dame, Timmy Global Health, DREAM Project, HANWASH); the other ~93 are junk strings |
| D13 | **Last-admin protection** | An org admin cannot deactivate or demote the last admin of their org, or a partner locks itself out and only a master key recovers it. `puente_staff` can override |

---

## 5. Cross-repo sequencing — deploy order is forced

Run `cross-repo-impact-checklist.md`. Merging deploys in three of these four.

| # | Repo | Work | Merging does |
|---|---|---|---|
| 1 | **cloudcode** | Fuzzy match in `signup`; org creation + first-user-admin; `orgAdmin` role per org; deactivation in `signin` + session destruction; staff/org-admin gated endpoints; D5 seed script | **Auto-deploys to production Back4App** |
| 2 | **Manage** | organization-admin gains the org-admin view (own org) and the staff view (all orgs); member approve/deactivate; promote/demote | **Auto-deploys via Vercel** |
| 3 | **Collect** | Repoint autofill from `User.organization` strings to the `Organization` class, make it work **pre-login**, add create-new | EAS build → **store review, days–weeks, manual iOS submit** |
| 4 | docs | Record the §1 reversal in `billing-and-invoicing.md` §10 and `organization-onboarding.md` | — |

**cloudcode first and alone.** Both apps' signups already call cloudcode's
`signup`, so the server-side half works for **every Collect build in the field,
including years-old ones**, the moment it deploys. That is what keeps the
feature from being gated on store review.

**The long tail is real.** Between cloudcode deploying and the Collect release
landing, mobile users get the new server behaviour with the old screen: they can
join and create organizations, but see no picker. That is strictly better than
today and must not be treated as a regression.

---

## 6. Test plan

Every behaviour goes through `red-green-tdd` — test written and seen failing
first. The two areas carrying the risk:

**The fuzzy match.** Exact normalized match joins, not creates. `Puentte` is
refused. `Puente Colorado` is refused by containment. A genuinely distinct name
creates. Case and accent variants join rather than fork. Distance exactly at the
threshold, and one either side. An alias match counts, not only the canonical
name. A refusal still creates the account and still records the string.

**Deactivation.** A deactivated user cannot sign in. Their existing session
tokens are destroyed. Reactivation restores access. An org admin cannot
deactivate the last admin (D13); `puente_staff` can.

**Authorization, per endpoint.** Org admin succeeds on own org, is refused on
another org, `puente_staff` succeeds on both, an anonymous caller is refused —
asserted server-side by direct `Parse.Cloud.run`, never merely by a hidden
button.

**E2E, at the end, before the milestone merge:** sign up with a novel org in
Manage → become its admin → see it in the registration picker → sign up a second
account into it → approve, then deactivate, and confirm the deactivated account
cannot sign in. Repeat the join path on Collect against the deployed cloudcode.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Fuzzy match too loose → tenant forking, silently | Containment + distance ≤ 2, tests both directions, constant in one place |
| Fuzzy match too tight → partners cannot onboard | Refusal routes to staff with the string attached; no dead end |
| D5 seed promotes a stale or test account | Dry run read before applying; staff can demote (D10) |
| Deactivation looks real but isn't | D9 destroys sessions; test asserts it |
| `updateUser` is still unauthenticated | Pre-existing. It cannot grant `puente_staff` (role membership, not a user field), but it **can** set `role`/`organization`. Tracked in billing-roadmap assumption 7; this spec deliberately does not depend on those fields for authorization |
| Collect release slips | Server half is live regardless; mobile degrades to today's behaviour, not worse |

---

## Related

- [organization-admin-prd.md](organization-admin-prd.md) — the screen this extends; §4 has the `puente_staff` security decision
- [billing-roadmap.md](billing-roadmap.md) — Step A is complete; this is new scope beyond it
- [billing-and-invoicing.md](billing-and-invoicing.md) — §10 self-serve exclusion, reversed here (§1)
- [organization-onboarding.md](organization-onboarding.md) — the staff-only process this replaces
- [cross-repo-impact-checklist.md](cross-repo-impact-checklist.md) — run before touching this path
