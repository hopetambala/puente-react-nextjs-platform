# Organization — delivery status

Where the `Organization` work actually got to, so the next session starts from
facts rather than re-deriving them. Companion to
[billing-and-invoicing.md](billing-and-invoicing.md), whose phase plan is now
partly stale — this file is the authority on what is *done*.

**Last updated 2026-08-30.** Everything below was verified against production
(`vBdTHqQU31…`), not inferred. Testing against production is pre-authorised;
credentials for read queries are `APP_ID` + `REST_API_KEY` in the flask repo's
`secretz.py`. Assert the app id before trusting any result.

---

## Shipped and live

| Repo | PR | What |
|---|---|---|
| cloudcode | #619 | resolve and stamp the canonical `Organization` |
| cloudcode | #620 | `signup` resolves the organization; no unauthenticated admin self-grant; `createOrganization` is master-key only. **Also** carries the canonical-name-is-an-implicit-alias fix (Copilot's finding) and names participating in uniqueness both ways — this was previously listed here as "#621", which never existed; that number is now the `puente_staff` PR |
| Manage | #86 | registration picker over the `Organization` class |
| Manage | #88 | register page i18n; phone field no longer says "Password is required" |
| Manage | #89 | `containedIn` scoping across dashboard, curation, community audit, source selector, data-quality |
| Manage | #90 | CSV export via the aggregator's `short-code` paths |
| Manage | #92 | a blank organization no longer inherits the `internal-test` bucket |
| Manage | #93 | account settings organization is read-only, not free text |
| aggregator | #123, #124 | `short-code` export paths, including the custom-form one |
| Collect | #613 | alias-set scoping for records, custom forms, assets, home stats |
| Collect | #614, #615 | EAS build: Apple credentials + Node 22 |

### Self-service organizations — the second wave (2026-08-30)

| Repo | PR | What |
|---|---|---|
| cloudcode | #624 | `addToRole` closed to unprivileged callers. It wrote every change under the master key, so any caller could name a role and join it — demonstrated live against a running Parse server before it was closed |
| cloudcode | #626 | `puente_staff` role, `isStaff`, and the authorization gate on `createOrganization` |
| cloudcode | #627 | self-service creation in `signup`, with the fuzzy-match guard against tenant forking |
| cloudcode | #628 | `createAdminRole` no longer grants public write; `lockLegacyRoleAcls` written for the role already in production |
| cloudcode | #629 | org-admin Parse roles, `setOrgAdmin`, member listing, real deactivation (sign-in refusal **and** session destruction) |
| cloudcode | #630 | members matched through the alias resolver, not the canonical name. The seed had been matching on `"DR Missions"` and finding **0 of 31** accounts, all of which store `"DRMT"` |
| cloudcode | #631 | `signin` no longer crashes the Parse process on a failed login — the handler used the legacy `(request, response)` signature |
| cloudcode | #632 | `seedPuenteStaff`, so the role can be created and populated in one master-key call |
| Collect | #616–#620 | organization picker sourced from the `Organization` class and working pre-login; release tooling completed |
| Manage | #95 | the org-admin PRD and the billing roadmap |
| Manage | #98 | Review moved from Workspace to the Org section |
| Manage | #101 | the self-service organizations spec — 13 decisions |
| Manage | #102 | the `OrganizationAdmin` screen, scoped to the viewer |
| Manage | #103 | staff can reach any organization's people, loaded on demand |
| Collect | #621 | the organization dropdown is selectable — a list component whose identity changed every render was unmounting the row mid-press |

**The cloudcode and Manage halves are deployed but not reachable.** See step 1
below — the role it all hangs from has not been seeded. Collect's half is merged
but ships only with a store release; it has no OTA.

**Collect 15.6.1 (build 15.6.2) is on TestFlight**, tagged `v15.6.1`, carrying
#613.

### Evidence, not claims

```
Export     /v3/records/organizations/DR%20Missions ->  12 CSV lines
           /v3/records/short-code/dr-missions      -> 623 CSV lines
Forms      equalTo('organizations','testORG')       -> 5 forms
           containedIn(24 aliases)                  -> 7 forms
Picker     36 options live in production (37 records minus internal-test)
Canary     resolveOrganization('Internal / test') flipped unresolved -> resolved
           on deploy, proving the new cloudcode was actually serving
```

Collect was verified on device with `.maestro/organization-scope.yaml` against
production, not just unit tests.

---

## How it works now

Three layers, and the distinction matters:

| Layer | Touches |
|---|---|
| Collect writes a record | `surveyingOrganization` **string** — unchanged, collected provenance |
| cloudcode, every write | resolves that string via aliases, stamps an `organization` **pointer** |
| Collect + Manage reads | read the **`Organization` class** for the alias set, then `containedIn` on the string |

**Nothing reads the `organization` pointer off a record yet.** It is write-only
by design — pointer-only reads are Phase 4 and are gated on 100% resolution,
because an unresolved record becomes *invisible* the moment consumers stop
reading the string.

The three resolvers (cloudcode, Manage, Collect) are deliberately identical and
each carries a comment pointing at the other two. **If they diverge, the three
systems disagree about who owns a record.** That is the main maintenance hazard
this work created.

---

## What is left, in order

> **The full remaining path — including everything past this near-term list, and
> the evidence gate before the billing surface — is
> [billing-roadmap.md](billing-roadmap.md).** This section is the near-term view;
> that file is the whole route to invoices going out.

### 1. Seed `puente_staff` — the only thing standing between here and a working admin screen

**This is a master-key action. It is the one step nobody but Hope can do, and
until it runs everything below it is unreachable.**

`puente_staff` gates `createOrganization`, `editOrganizationAliases`,
`setOrgAdmin`, the seed endpoints, and the `/organization-admin` route guard in
Manage. The role **has never been created in production**. So today the screen
exists, is fully built, and redirects every single person who opens it.

One call does it (cloudcode #632):

```js
Parse.Cloud.run('seedPuenteStaff', { userIds: ['<objectId>', '...'] },
  { useMasterKey: true });
```

It creates the role if absent, adds the named accounts, and returns
`{ granted, notFound, roleId }`. Re-running it is safe — check `notFound` is
empty rather than assuming every id landed.

Then confirm from the browser, signed in as one of those accounts, that
`Parse.Cloud.run('isStaff')` returns `{ isStaff: true }`. **Do not verify this
with the master key** — master is an override by design (D13), so it answers
yes for everyone and proves nothing. That mistake has been made twice.

### 2. Seed the per-organization admins

Once staff exists, `/organization-admin` is reachable and the rest is UI. The
seed is deliberately two-phase:

```js
Parse.Cloud.run('planOrgAdminSeed', {}, { useMasterKey: true });   // read-only
Parse.Cloud.run('applyOrgAdminSeed', { confirm: true }, { useMasterKey: true });
```

`planOrgAdminSeed` writes nothing — read its output first. The last run proposed
**8 organizations whose only candidate is a test account**, which is why apply
requires `confirm: true` and why staff member management exists: those are
promoted to real people through the screen afterwards, not by another script.

### 3. Cut the Collect release

Everything Collect needs is on `master`. It needs a store release to reach
anyone — **Collect has no OTA** (`EXUpdatesEnabled` false on iOS,
`expo.modules.updates.ENABLED` false on Android).

**Run the Maestro harness first. Always.** The gate is in Collect's
`CLAUDE.md`; Metro must be started before the flows or every assertion fails
against a stale binary.

**The dropdown defect is fixed and merged** (Collect #621). It was two bugs, not
one, and the first was not the one anyone had guessed:

- Formik builds a new `formikProps` object every render, `handleSelect` depended
  on it, so the memoised list component changed identity and React unmounted the
  whole list — a row remounted between touch-down and touch-up can never
  complete a press. `onStartShouldSetResponderCapture` re-rendered the parent on
  touch-down, so something almost always did. That is the "nearly" in "nearly
  unclickable", and the same remount was eating keystrokes.
- The list also opened under the keyboard, because Organization is the last
  field on a nine-field form and nothing scrolled it clear.

Verified on device against production, before and after on the same binary:
tapping "Puente" left the field reading "Pu"; it now fills and closes. The
Maestro flow that could not previously even type into the field runs all ten
steps.

### 4. What was never seeded, and what never existed

Worth stating plainly, because it has been guessed wrong twice:

- **The `Organization` class was never backfilled by this work.** Its 37 records
  predate it. An early claim here that production had *zero* organizations was
  fabricated from "no repo calls `createOrganization`" — see the traps below.
  What this work did was make those 37 reachable through their aliases, which
  looks like seeding from the outside and is not.
- **No test organizations were created.** `testOrg1`, `testOrg2` and friends are
  all REFUSED at signup: normalised they contain `testorg`, which collides with
  `internal-test`'s alias `testORG`, so the near-duplicate guard routes them to
  staff. That is the guard working. Pick a name with no "test" in it when a
  create needs to succeed.
- **`applyOrgAdminSeed` has never run**, and neither has the `puente_staff`
  seed. Only `planOrgAdminSeed`, which writes nothing, has been run against
  production — that is what exposed the DRMT matching bug fixed in #630.

### 5. Stamping the canonical name on write — needs a decision, not code

Collect still stamps `surveyingOrganization` from the account's own string, so
the split keeps growing slowly. Reads handle it, so it costs nothing today.
Changing it has provenance implications (`surveyingOrganization` is what the
field actually collected) and deserves its own call.

### 6. Deliberately not urgent

- **123 of 792 accounts do not resolve** — but **every one has zero records**.
  Dormant signups, 105 mostly-junk strings. Billing hygiene, not an outage.
  About a dozen look like real orgs that never collected (Peace Corps,
  University of Notre Dame, Timmy Global Health, DREAM Project, HANWASH).
- **`updateUser` takes no auth** and runs under the master key — anyone can set
  `adminVerified`, `role`, or `organization` on any account by objectId. This is
  why authorization lives in Parse roles and never in `_User.role`. Hope said
  "don't worry about this" on 2026-08-29 and again on 2026-08-30; it becomes
  real when §7 ships.
- **The legacy `admin` role is publicly writable in production**
  (`{"*":{"read":true,"write":true}}`, created 2020-11-05). `lockLegacyRoleAcls`
  is written and tested but has not been run. Hope: "not worried about it"
  (2026-08-30). It is a one-line master-key call whenever that changes.

---

## Traps that cost time — do not re-learn these

- **Look for the harness before building anything.** Collect has `.maestro/`
  with credentials in the `yarn maestro` script. See its `CLAUDE.md`.
- **Releases are cut locally** (`yarn build-submit-ios`), not from CI. The EAS
  Build workflow had never succeeded; that says nothing about whether a release
  can go out.
- **`.easignore` overrides `.gitignore` for EAS uploads.** `environment.js`
  being gitignored is deliberate and does not break local builds.
- **Version ≠ build number.** `CFBundleShortVersionString` is the train;
  `CFBundleVersion` only distinguishes builds inside it. Apple rejected a build
  because the train was closed (`90186`) even though the build number was higher.
- **`standard-version` does not touch `ios/Collect/Info.plist` on its own** —
  the postbump hook now does, and fails loudly if the file is missing (fixed
  2026-08-30). Bump with `yarn release-minor`, never by hand.
- **`eas build` rewrites `app.json` and `Info.plist`** via `autoIncrement`.
  Commit that churn or the next build starts stale.
- **Absence of a code path is not evidence about data.** "No repo calls
  `createOrganization`" led to a fabricated claim that production had zero
  organizations. It had 37. Query the data.
