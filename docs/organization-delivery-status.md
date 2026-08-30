# Organization — delivery status

Where the `Organization` work actually got to, so the next session starts from
facts rather than re-deriving them. Companion to
[billing-and-invoicing.md](billing-and-invoicing.md), whose phase plan is now
partly stale — this file is the authority on what is *done*.

**Last updated 2026-08-29.** Everything below was verified against production
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

## Next, in order

> **The full remaining path — including everything past this near-term list, and
> the evidence gate before the billing surface — is
> [billing-roadmap.md](billing-roadmap.md).** This section is the near-term view;
> that file is the whole route to invoices going out.

### 1. `puente_staff` role + `OrganizationAdmin` screen — the only real blocker

**Spec:** [organization-admin-prd.md](organization-admin-prd.md) — the buildable
PRD (scope, cross-repo sequencing, stories, tests). Read it before starting.

Creating a partner organization needs the master key and a console. There is no
UI, and since the picker landed **this is the only way a new partner can
exist** — a person can no longer create one by typing a novel name.

- The data loader already exists:
  `app/epics/OrganizationAdmin/loadOrganizationAdmin.js` (reports
  `accountsChecked` alongside `unresolved`, newest-first, `truncated` when a read
  saturates). No screen.
- `createOrganization` is master-key only, so a browser cannot call it. The
  TODO in `cloud/src/definer/organization.definer.js` names the extension:
  `request.master || isStaff(request.user)`.
- Scope this as the *minimal* tenancy role only — create the role, put staff in
  it, check it on that one endpoint. **Not** the full §7 ACL migration, which is
  the riskiest phase in the plan and goes last.

### 2. Collect's signup is still free text — and it is not a one-line fix

Investigated and corrected 2026-08-30. The earlier entry here was wrong in two
places; both corrections are load-bearing.

**It is not a text field.** `domains/Auth/SignUp/index.js:225` renders an
`Autofill` autocomplete. That component **falls back to a bare
`react-native-paper` TextInput when its value list is empty**
(`PaperInputPicker/AutoFill/index.js:123-138`), which is what a user sees. The
picker is already there; it never turns on.

**Why it never turns on.** `cacheAutofillData`
(`modules/cached-resources/read.js:45`) builds `orgResults` correctly and then
returns `orgs` — the enclosing arrow function — instead of it. `storeData`
JSON-stringifies, and `JSON.stringify` **drops function-valued properties**, so
the `organization` key never reaches storage. On read, `data[parameter].sort()`
runs on `undefined`, throws, and the throw is swallowed by the catch at
`AutoFill/index.js:63`. The list stays null and the field degrades to free text,
with one `console.error` as the only trace.

**Correction — the origin commit.** Previously attributed to `f5adb8b6`,
Feb 2023. That commit is `chore: add prettier` and only re-indented the line.
`git log -S "return orgs"` returns exactly one commit: **`dfc4cb6`,
2022-01-18, "feat: unique communities"**, whose diff deletes
`autofillData.organization = orgResults;` and adds `return orgs`. The bug is
**four years and seven months old**, not three and a half.

**Correction — Collect does query the `Organization` class.**
`modules/organization/index.js:91` runs `new Parse.Query("Organization")`. What
it does *not* do is use it here: the signup autofill sources from
`customQueryService(0, 500, 'User', 'adminVerified', true)` and
`user.get('organization')` (`read.js:26-32`) — the raw free-text user strings,
which are exactly the junk the `Organization` class exists to replace.

**So matching Manage is a rewrite of the data source, not a bug fix**, and it
has two independent blockers:

1. Fixing line 45 alone is not enough. `cacheAutofillData` runs only inside
   `populateCache`, which is called post-login. **A fresh install has no cache at
   all on the signup screen** — the exact moment the feature exists for.
2. The source must move from `User.organization` strings to the curated
   `Organization` class, read pre-authentication.

**Why it survived four years: no test covers it.** No test file references
`autofill_information`, `AutoFill`, or `Autofill`, and `.maestro/` has ten flows,
none covering registration. A red test on `cacheAutofillData`'s return shape
would have caught it on day one.

cloudcode #620 makes this *safe* — no admin self-grant, server-side resolution —
so it is UX, not security. **Needs a store release; Collect has no OTA**
(`EXUpdatesEnabled` false on iOS, `expo.modules.updates.ENABLED` false on
Android).

### 3. Stamping the canonical name on write — needs a decision, not code

Collect still stamps `surveyingOrganization` from the account's own string, so
the split keeps growing slowly. Reads handle it, so it costs nothing today.
Changing it has provenance implications (`surveyingOrganization` is what the
field actually collected) and deserves its own call.

### 4. Deliberately not urgent

- **123 of 792 accounts do not resolve** — but **every one has zero records**.
  Dormant signups, 105 mostly-junk strings. Billing hygiene, not an outage.
  About a dozen look like real orgs that never collected (Peace Corps,
  University of Notre Dame, Timmy Global Health, DREAM Project, HANWASH).
- **`updateUser` takes no auth** and runs under the master key — anyone can set
  `adminVerified`, `role`, or `organization` on any account by objectId. Hope
  said "don't worry about this" on 2026-08-29; it becomes real when §7 ships.

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
- **`standard-version` never touches `ios/Collect/Info.plist`**, which is the
  file EAS reads. Sync it by hand.
- **`eas build` rewrites `app.json` and `Info.plist`** via `autoIncrement`.
  Commit that churn or the next build starts stale.
- **Absence of a code path is not evidence about data.** "No repo calls
  `createOrganization`" led to a fabricated claim that production had zero
  organizations. It had 37. Query the data.
