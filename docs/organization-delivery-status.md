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

### 1. Seed `puente_staff` — DONE 2026-08-31

Seeded and verified. `puente_staff` is role `jJJ8TET4rj`; Hope's account
(`Fs96JuuxOO`, `hopetambala@gmail.com`) is in it, confirmed by reading the role
back with the user constraint applied — **not** by calling `isStaff` with the
master key, which is an override and answers yes for everyone.

Two facts worth keeping:

- **There is no `hope@puente-dr.org` account.** The git author address is not
  the Parse username. The real account is `hopetambala@gmail.com`; the other
  match, `GYckWMYNCx`, is a `test@test.com` account under `testOrg`.
- The role's ACL reads `{}`. That is correct — `setPublicReadAccess(false)`
  serialises to an empty ACL, so nothing is publicly readable.

### 2. Seed the per-organization admins — DONE 2026-08-31

**29 organizations have an admin.** Plus `zephyr-verification-group`, which
already had one: 30 `org_<shortCode>_admin` roles now exist, verified by reading
`_Role` back.

**`applyOrgAdminSeed` was deliberately NOT used.** It is all-or-nothing — no
subset parameter — and six of its 35 proposals are test accounts. Running it
would have handed a partner's data to accounts called `TestAyuda` and
`TestBlueMissionsHope`. Grants were made individually with `setOrgAdmin`
instead, which derives the organization from the target's own record.

**Six organizations were skipped and still need a real person appointed** — do
it through the admin screen, which is what it was built for:

| organization | proposed | why skipped |
|---|---|---|
| `everett-rotary-club` | `7777777777` | placeholder phone number |
| `ryans-well` | `TestRyansWell` | test account |
| `blue-missions` | `TestBlueMissionsHope` | test account, name "Test Test1" |
| `ayuda` | `TestAyuda` | test account |
| `georgia-state-university` | `GSUPuente@gmail.com` | firstname is literally "Test Account" |
| `internal-test` | `basyukliliya` | the junk bucket, not a partner |

Two organizations have **no members at all** and so cannot have an admin:
`holy-family-mission`, `divine-agency-for-integrated-development`.

**A screening note worth keeping.** The first pass flagged test accounts by
username and missed `georgia-state-university`, whose proposed admin has the
literal firstname "Test Account". Screen BOTH the username and the name fields;
a test account is not obliged to announce itself in the field you happen to
check.

Grants are reversible: `setOrgAdmin` with `isAdmin: false`. The last-admin guard
refuses to orphan an organization, but master and staff override it.

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

### 4. The organization audit — done 2026-08-31, and it changes the plan

Run against production with the master key. The headline: **there is no record
scoping problem, and the "123 unresolved accounts" was never a backfill.**

**Records — the number that matters, and it is COMPLETE, not sampled.** All
43,979 `SurveyData` rows were paged (44 requests, `surveyingOrganization` only).
**43,970 resolve. Nine do not, and all nine are blank.** Every survey record in
production reaches an organization. No funder CSV is missing rows because of
this.

**Accounts.** 796 accounts, 38 organizations, 168 distinct organization strings:

| | strings | accounts |
|---|---|---|
| resolve exactly | 53 | 646 |
| resolve only after normalising | 8 | 25 |
| resolve to nothing | 107 | 125 |

The middle row needs **no** backfill: `"Puente "` with a trailing space already
resolves, because the resolver normalises before matching. Rewriting those rows
would be cosmetic.

**Six organizations gained aliases** (`editOrganizationAliases`), recovering 10
accounts and taking resolution from 671 to **681 of 796 (85%)**: Everett Rotary
Club (`Everette`), Solea Water (`Soleawater`, `Solea water`), Michigan
(`University of Michigan`, `Umich`), Constanza Medical Mission (its Spanish
name), Zephyr Verification Group (doubled letter), Plan de Desarrollo (Spanish
variant).

**Aliases, not row rewrites.** For a typo the fix is one write to the
organization, not many to `_User` — reversible, and it fixes historical records
too. Note `editOrganizationAliases` **replaces** the list; always resend the
existing aliases.

**Why the rest cannot be automated.** A fuzzy matcher over the remaining strings
produced three wrong answers out of nine: `UMSI`→`MSI` (it is Michigan's School
of Information), `Tech`→`TECHO` (TECHO is a real NGO), `Accenture`→`internal-test`
(it matched the junk-bucket alias `accentute`). Edit distance 1 is not identity.
This is the same reasoning behind `findSimilarOrganization` refusing near
matches at signup rather than joining them.

**What the remaining 115 accounts actually are.** Not partner organizations.
Employers people typed into a free-text box (`Apple`, `IBM`, `Intuit`,
`Mayo Clinic`, `Accenture`), self-descriptions (`Self-Employed`, `Retired`,
`just a guy`), placeholders (`n/a`, `None`, 11 blanks) and junk (`Hshshh`,
`vsjzv`, `40`). There is no correct canonical value to backfill them to.

**Real NGOs with no `Organization` record**, if you want them registered:
Peace Corps (5 accounts, four spellings), University of Notre Dame (5, four
spellings), Timmy Global Health, DREAM Project, HANWASH, Healing Waters
International, Clinica Verde, Bridge of Life, Mission of Hope, Hope for
Haitians. Creating one is a statement that they are a partner — do it through
the admin screen, which is now reachable.

### 4b. Registering the institutions that were never in the registry — 2026-08-31

**21 organizations created**, taking account resolution from 681 to **712 of 796
(89%)** and unresolved strings from 107 to 71. The registry is now 58
organizations.

**Created `active: false`, deliberately.** Every one of these has **zero
records** — they are dormant by evidence, not by assumption. Inactive means the
signup picker does not offer them, while `resolve()` still resolves their names,
so the accounts scope correctly. Staff flip one to active in the admin screen
the moment it is really a partner. Adding 21 never-used options to a picker a
promotora uses one-handed in sunlight is a real cost.

Created: Peace Corps, University of Notre Dame, Timmy Global Health, DREAM
Project, HANWASH, Healing Waters International, Clinica Verde, Bridge of Life,
Mission of Hope, Hope for Haitians, Hopeworks, Proyecto Corazones, Mision El
Faro, ACOES, Rotary eClub of WASH, Operación Sonrisa, Mmanze Centre For Rural
Development And Training, University of Missouri-Kansas City, William and Mary,
Université de Kinshasa, Agape School Complex.

**Aliases were added only for genuinely different strings** — `Peace Corpa`,
`Notre Dame`, `Rotart eClub of WASH`. Case and whitespace variants need no
alias; the resolver normalises before matching, so listing them is noise.

**Six were deliberately NOT folded in**, because each is an inference of exactly
the kind that produced `UMSI`→`MSI`: `PCDR` (Peace Corps Dominican Republic?),
`UMSI` (Michigan's School of Information?), `Djusd`, `ASSAN`, `Ciudad de dios`,
`Medical Service Trip`. Someone who knows the partners should decide these.

**A shortCode trap, hit and fixed.** Deriving a shortCode by slugifying the raw
name produces `operaci-n-sonrisa` and `universit-de-kinshasa` — the accented
letter becomes a hyphen. `deriveShortCode` in `auth.definer.js` gets this right
by calling `normalizeOrganizationName` (which strips accents) BEFORE slugifying.
Anything generating a shortCode must do the same: it ends up in export URLs
(`/v3/records/short-code/<shortCode>`) and in role names
(`org_<shortCode>_admin`), so a mangled one is not cosmetic.

### 4c. Community names cannot identify the remaining accounts

Triangulating an unknown organization from the communities its records were
collected in is what identified Holy Family Mission (community `cevicos`) and
pointed at Divine Agency (surveyor `Deleo Moses Ocen`, whose account says `Ryans
Well`).

It cannot do more, and this is settled rather than assumed: of the 104 accounts
whose organization did not resolve, **exactly one has ever collected a record** —
`ACOES` (Scott Coppa), whose 3 records say `United Way SB`, and who is already
United Way SB's admin. The other 103 have no records at all, so there is nothing
to triangulate from.

### 4a. Nine faker records in production `SurveyData`

The nine unresolved rows are test data, not survey data: names straight out of
faker.js (`Hadley Dicki`, `Dayna Aufderhar`, `Herman Jaskolski`), created in
three batches of three on 2026-03-09 and 2026-03-20. Each batch points at a
`_User` that does not exist, via a 24-character **MongoDB** ObjectId rather than
a 10-character Parse objectId — so they were not written by the app.

They carry `fname`, `lname`, `dob`, `sex` and a photo, and no organization, so
they are invisible to every export. Harmless to reads; they inflate the record
count by nine. Deleting them is a destructive production write and has not been
done.

### 5. What was never seeded, and what never existed

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

### 6. Stamping the canonical name on write — needs a decision, not code

Collect still stamps `surveyingOrganization` from the account's own string, so
the split keeps growing slowly. Reads handle it, so it costs nothing today.
Changing it has provenance implications (`surveyingOrganization` is what the
field actually collected) and deserves its own call.

### 7. Deliberately not urgent

- **115 of 796 accounts do not resolve** — see §4, which supersedes the earlier
  estimate. Proven, not inferred: every `SurveyData` row but nine resolves.
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
