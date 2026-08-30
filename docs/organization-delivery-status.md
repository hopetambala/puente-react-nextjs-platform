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
| cloudcode | #620 | `signup` resolves the organization; no unauthenticated admin self-grant; `createOrganization` is master-key only |
| cloudcode | #621 | canonical name is an implicit alias (Copilot's finding); names participate in uniqueness both ways |
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

### 1. `puente_staff` role + `OrganizationAdmin` screen — the only real blocker

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

### 2. Collect's signup is still free text

Its suggestion list has never worked — `cacheAutofillData` in
`modules/cached-resources/read.js` returns the enclosing function instead of the
array (`f5adb8b6`, Feb 2023), and it only populates after login. #620 makes this
*safe* (no admin self-grant, server-side resolution), so it is UX, not security.
Needs a store release.

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
