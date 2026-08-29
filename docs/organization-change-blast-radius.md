# Organization change — blast radius

What the 2026-08-29 organization work can and cannot do to every feature, with
the field constraint as the first question: **can any of it stop a promotora
saving or syncing a survey?**

Short answer: **no.** The proof is below, and it is structural rather than
incidental — the write path swallows organization failures by construction.

The field is active: **31 SurveyData rows synced in the last 7 days, 130 in 30**.
So this is not a theoretical audit.

---

## 1. Data collection cannot be blocked

Every organization write-path touch is inside a `try/catch` that returns
normally. There are four call sites and all four are guarded twice:

| Where | Guard |
|---|---|
| `crud.definer.js:162`, `:255` (`postObjectsToClass`, `…WithRelation`) | `stampOrganization` own try/catch |
| `crud.definer.js:452` (clinical children) | `findAll().catch(() => null)` **plus** the above |
| `services/post/post.js:44`, `:106` (the sync path) | list passed in pre-caught |
| `services/offline/offline.js:33`, `:72`, `:113` (batches) | `findAll().catch(() => null)` |

`stampOrganization` ends with:

```js
} catch (error) {
  logError(`stampOrganization: ${String(error)}`);
}
```

It never rethrows. **An unresolvable organization, an ambiguous alias, or a
total Parse outage on the Organization class all produce a saved record with no
pointer** — never a rejected sync.

Ordering is also right: `mergeMetadataAsFallback` runs at `offline.js:36`,
stamping afterwards, so collection-time organization wins over whoever pressed
sync.

**Cost:** one extra `Organization` query per sync *batch* (not per record), 37
rows. On the offline path the list is fetched once and passed down explicitly
for this reason.

### Which Cloud functions Collect actually calls

`signup`, `postObjectsToClass`, `postObjectsToClassWithRelation`,
`postOfflineForms`, `uploadOfflineForms`, plus unchanged ones (`signin`,
`hello`, `countService`, `geoQuery`, `forgotPassword`, `deleteUser`,
`addUserPushToken`).

Every changed one is in the table above. Roles `admin` and `contributor` both
exist in production, so `signup`'s role assignment cannot throw on a missing
role.

**Unrelated pre-existing finding:** Collect calls `aggregateStats` and
`aggregateStatsItems` via `Cloud.run` in `services/parse/crud/index.js`, and
**neither function exists** in cloudcode — production returns
`Invalid function`. The home screen does not use that path (it uses the
client-side `statsService`), so nothing visibly breaks, but the code is dead.

---

## 2. What DID change for people, by feature

Ordered by who is affected, not by how interesting it is.

| Feature | Surface | Status |
|---|---|---|
| Saving / syncing a survey | Collect | **Unaffected.** Cannot fail (§1) |
| Custom form list | Collect | **Degraded — worst item.** See §3 |
| Find Records | Collect | Degraded — see §3 |
| Home screen stats | Collect | Degraded — see §3 |
| Assets | Collect | Degraded — see §3 |
| Registration | Collect | Free text still; no longer self-grants admin |
| Registration | Manage | Picker over 37 organizations, live |
| **Account settings** | Manage | **Still free text — open hole, see §4** |
| Dashboard, curation, community audit | Manage | **Fixed** — alias-set scoping |
| CSV export | Manage + aggregator | **Fixed** — short-code paths |
| Form Creator | Manage | Unchanged; tags new forms with the creator's string |
| Login, verification, push tokens | both | Unchanged |
| `organizationVerified` / `Unverified` | cloudcode | Unchanged; zero callers anywhere |
| Django ETL, Gatsby site | — | Not on this dataset |

---

## 3. The Collect degradations — measured, not estimated

These are **pre-existing**, caused by `equalTo` on a single organization
string. They are fixed in `puente-reactnative-collect` #613, which needs a store
release — Collect has no OTA path.

**Custom forms is the severe one, because a surveyor cannot fill in a form they
cannot see. It blocks collection in a way the sync path does not.**

```
puente         157 accounts hold 'Puente'             -> see 29 of 33 forms
                17 accounts hold 'Puente ' (space)    -> see  3 of 33 forms
rayjon          15 accounts hold 'Rayjon'             -> see  6 of 12 forms
                15 accounts hold 'Rayjon Eye Clinic'  -> see  6 of 12 forms
blue-missions    4 accounts                           -> see  4 of  8 forms
dr-missions     33 accounts                           -> see  1 of  2 forms
```

Records, same cause:

```
rayjon          15 accounts hold 'Rayjon'             -> see  185 of 1569 (11%)
                15 accounts hold 'Rayjon Eye Clinic'  -> see 1196 of 1569 (76%)
dr-missions     31 accounts hold 'DRMT'               -> see  611 of  633 (96%)
                 2 accounts hold 'Dominican Republic Mission Team' -> see 0
```

### The one thing the change made worse, and its true size

`signup` now stores the **canonical** name, so on the current mobile build a new
account's visibility follows the canonical string rather than what they typed:

| Typed | Stored now | Old build sees | Before |
|---|---|---:|---:|
| `DRMT` | `DR Missions` | 11 | 611 |
| `Rayjon Eye Clinic` | `Rayjon` | 185 | 1196 |
| `Puente ` | `Puente` | 17011 | 813 |

It redistributes rather than uniformly regresses — the largest organization
gains. **Size: 1 new account in the last 30 days, 2 in 90, 23 in a year**, and
only 2 of 37 organizations are on the losing side. Not worth a mitigation of its
own; it disappears when #613 ships.

---

## 4. Open hole: account settings is still free text

`pages/account/management/index.js:46` writes `organization: data.Organization`
from a free-text field, straight through `updateUser` — which takes **no auth**
and runs under the master key.

So the registration picker closed one door and this one is still open: any
signed-in person can set their organization to any string, and land themselves
outside every alias set. It is also where the 17 `'Puente '` (trailing space)
accounts most plausibly came from.

Its validation message is wrong too — `Organization` fails with
`"Username or Phone Number is Required"`, the same copy-paste class as the phone
field fixed in platform #88.

**Recommendation:** replace with the same picker component the register page
uses, plus the "my organization isn't listed" route. Manage-only, ships on
merge, no mobile dependency.

---

## 5. What must be true before the mobile build goes to TestFlight

1. **#613 merged** — the alias-set scoping, including custom forms and assets.
2. **`Info.plist` bumped by hand.** It reads `15.5.9` / `15.5.10` while
   `app.json` says `15.6.0`. This is a bare workflow with
   `appVersionSource: "local"`, and `scripts/update-version/versionNumber.js`
   writes `app.json` only — it never touches `Info.plist`. `yarn release-*` will
   not fix this.
3. **The blank-organization guard** (in #613, and platform #92 for Manage).
   `internal-test` carries an empty string among its aliases, so a blank
   account organization folded to `''` and matched it — handing 11 accounts a
   bucket that is not theirs.

Not required for the release: Collect still stamps `surveyingOrganization` from
the account's own string, so the split keeps growing slowly. Reads handle it, and
changing the stamp has provenance implications that deserve their own decision.
