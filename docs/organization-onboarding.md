# Onboarding an organization, and the accounts inside it

**The process changed on 2026-08-29** with `puente-node-cloudcode` PR #620, which
is live in production. The change is small to describe and easy to trip over:

> **An `Organization` record must exist before that organization's first user
> registers.** It used to be created implicitly, by someone typing a name nobody
> had typed before.

Nothing is blocked today — 37 organizations exist. The next *new* partner is who
hits this, and the failure is quiet, which is why this file exists.

---

## What changed, and why

`signup` used to count users whose `organization` string matched exactly:

```js
userQuery.equalTo('organization', String(organization));
if (results === 0) {
  user.set('role', 'administrator');
  user.set('adminVerified', true);
}
```

So **any string nobody had used yet produced an administrator**, unauthenticated,
with no human involved. Typing `puente` where records say `Puente` was enough,
and Collect's sign-up screen is a free-text box reachable by anyone.

Now `signup` resolves the typed string through the `Organization` alias table
first. The administrator grant only fires when resolution succeeds — which proves
a human already created that organization.

**This does not block anyone from registering.** An unrecognised organization
still creates the account; it just grants nothing. An unidentified organization is
an ops problem, a person who cannot make an account is a field problem.

---

## The process now

### Step 1 — Create the `Organization` (staff, once per partner)

**Required before anyone from that partner registers.** There is no UI for this
yet; `app/epics/OrganizationAdmin/` is unbuilt (see
[billing-and-invoicing.md](billing-and-invoicing.md) §8).

`createOrganization` requires the **master key**, so it cannot be called from
Manage, Collect, or a browser. Use the Back4App dashboard's API console, or a
local script:

```js
// Same call the cloudcode integration tests make.
Parse.Cloud.run('createOrganization', {
  name: 'World Outreach Fund',   // canonical, human-facing; what gets stored on accounts
  shortCode: 'wof',              // stable, URL-safe, immutable
  aliases: ['WOF', 'W.O.F.'],    // every string seen in the wild for this org
  active: true,
}, { useMasterKey: true });
```

Notes that matter:

- **You do not need to list `name` in `aliases`.** The canonical name is always an
  implicit alias. (It was not, until #620 — that was Copilot's finding on the PR.)
- **`shortCode` and every alias must be unique across all organizations**, folded
  for case and accents. Creation refuses a collision rather than accepting one,
  because an ambiguous string makes a whole tenant's records stop resolving.
- **`aliases` is not cosmetic.** It is how historical records and old accounts
  find their way to this organization. Add every spelling you have seen.

### Step 2 — People register themselves

| App | Where | Organization field |
|---|---|---|
| **Manage** | `/account/register` | Picker, once PR #86 lands. Free text until then. |
| **Collect** | Sign Up screen | **Free text**, and its suggestion list has never worked — see below |

Either way the server resolves what was submitted and stores the **canonical
name**, so `Puentes` and `Puente` stop becoming two organizations.

### Step 3 — Roles are assigned automatically

- **First member of a recognised organization** → `role: administrator`,
  `adminVerified: true`.
- **Everyone after** → `role: contributor`, `adminVerified: false`.
- **Unrecognised organization** → `contributor`, `adminVerified: false`, and the
  account is still created.

---

## What "unrecognised" looks like from the outside

This is the part worth knowing, because there is no error message anywhere:

- The person registers successfully.
- They land as a `contributor`, not an administrator.
- Their `organization` is stored as whatever they typed.
- In Manage they see an empty app, because record queries filter on
  `surveyingOrganization` and nothing matches their string.
- In Collect they can still collect and sync — nothing there gates on
  `adminVerified` or `role`.

Server logs carry `signup could not resolve organization "<string>"`. That is the
only signal.

**If someone reports "I signed up and there's nothing there," check whether their
organization resolves before checking anything else.**

---

## Known gaps

- **No admin UI.** Step 1 needs the master key and a console. `OrganizationAdmin`
  is planned but unbuilt.
- **No queue of unresolved accounts.** Nobody is notified when a signup fails to
  resolve; you have to go looking in the logs.
- **Collect's organization suggestions have never worked.**
  `modules/cached-resources/read.js` returns the enclosing function instead of the
  accumulated list (`f5adb8b6`, Feb 2023), and the cache only populates after
  login — so a fresh install always renders a bare text box. Fixing it needs a
  store release; Collect has no OTA path (`EXUpdatesEnabled` is `false` on iOS,
  `expo.modules.updates.ENABLED` is `false` on Android).
- **Nobody approves accounts.** `adminVerified` is flipped by a link emailed to
  the registrant themselves, and nothing in either app gates on it. Treat it as
  metadata, not as access control, until §7 of the billing plan lands.

---

## Related

- [billing-and-invoicing.md](billing-and-invoicing.md) — the delivery scope this
  came out of; §3 for the `Organization` model, §7 for access control
- [cross-repo-impact-checklist.md](cross-repo-impact-checklist.md) — run it before
  changing anything on this path; it touches four repos
- `puente-node-cloudcode` PR #620 — the change described here
