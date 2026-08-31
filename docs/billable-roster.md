# The billable roster — who is actually a customer

Measured against production 2026-08-31. This is the input Phase 0 consumes: the
list of Stripe Customers to create, and the decision about who is charged.

**It exists because the roadmap assumed "six customers" and the data does not
agree.** Sizing the roster wrong makes the Step B question — is Stripe's own
dashboard enough — unanswerable, because the answer depends entirely on whether
this is 6 rows or 30.

---

## Current billing state: empty

| Field on `Organization` | Set on |
|---|---|
| `plan` | **2 of 58** (both `no-charge`, set by self-service signup) |
| `billingEmail` | **0 of 58** |
| `stripeCustomerId` | **0 of 58** |

Consistent with **D5** — billing fields deferred until the class's permissions
are settled. Nothing here proposes adding them yet.

---

## The roster, by `SurveyData` volume

58 organizations exist; 21 are dormant (`active: false`, registered so their
accounts resolve — see `organization-delivery-status.md` §4b). Of the 37 active:

### Puente-internal — never invoice

| shortCode | records |
|---|---|
| `puente` | 17,013 |
| `internal-test` | 343 |

`puente` is the largest single collector in the database. Any usage report that
does not exclude it will show Puente as its own biggest customer.

### Established partners — 11 organizations

| shortCode | records |
|---|---|
| `constanza-medical-mission` | 9,455 |
| `one-world-surgery` | 4,785 |
| `wof` | 3,647 |
| `cevicos` | 2,020 |
| `rayjon` | 1,384 |
| `plan-de-desarrollo-social-cultural-para-los` | 1,044 |
| `solea-water` | 916 |
| `dr-missions` | 622 |
| `dbc` | 417 |
| `everett-rotary-club` | 383 |
| `ryans-well` | 370 |

### Light users — 9 organizations, 24–217 records

`asociacion-para-el-impacto-de-desarrollo` 217 · `mayanza` 177 ·
`georgia-state-university` 85 · `comunidad-connect` 75 · `techo` 60 ·
`operation-ux` 33 · `wefta` 32 · `loyola-university-chicago` 26 ·
`blue-missions` 24

### Effectively dormant — 15 organizations, 0–4 records

`bold-hope` 4 · `health-outreach-organization` 4 · `united-way-sb` 3 ·
`ayuda` 3 · `msi` 1 · `heart-care-dominicana` 1 · `unlocking-communities` 1 ·
`divine-agency-for-integrated-development` 1 · `acn` 1 · `team-getwitit` 1 ·
`kennesaw-state-university` 1 · `rex-org` 1 · `kb-group-of-companies` 1 ·
`michigan` 0 · `zephyr-verification-group` 0

---

## What this changes

**The plan's "six customers" is low.** Fifteen organizations have sustained
usage. That is still small enough that Stripe's own dashboard may serve —
fifteen invoices is still not a composer's worth of work — but it is 2.5x the
number the Step B reasoning assumed, and the Step B answer should be given
against 15, not 6.

**Volume is not the charge basis, and this table must not become one.** Billing
§4 is explicit: flat tier per organization, usage is evidence only. This roster
is sorted by volume to show who is *real*, not to price them. A per-record
charge would bill a health program for surveying more households, which is the
behaviour the product exists to encourage.

**The long tail is a pricing question, not an engineering one.** Fourteen
organizations have six records or fewer. Charging a flat tier to an
organization that collected one record is a relationship problem; excluding
them needs a `no-charge` decision per organization. This is the
"partner tier / `no-charge` partners" blocker the roadmap already names as
needing a human — it is now quantified: **14 rows**.

> **Anti-pattern — the roster that prices itself.**
> **Symptom:** a usage table sorted by volume becomes the invoice basis because
> it is the only number available.
> **Consequence:** partners are penalised for collecting data, which inverts the
> product's purpose.
> **Fix:** decide the tier first, then use this table only to decide *who* is on
> a tier at all.

---

## Assumptions to validate

| # | Assumption | Owner | Risk if wrong |
|---|---|---|---|
| 1 | Every "established partner" is a paying relationship, not a grant-funded or in-kind one | Hope | Invoicing a partner who was never going to be billed |
| 2 | `puente` and `internal-test` are the only internal collectors | Hope | An internal program invoiced as a customer |
| 3 | The 15 dormant organizations should be `no-charge`, not invoiced | Hope | Either lost revenue or fifteen awkward conversations |
| 4 | ~~`SurveyData` volume is a fair proxy~~ | — | **CLOSED 2026-08-31 — tested and BROKEN.** See the correction above; the table now counts three classes. |

Assumption 4 was the weakest, was cheap to close, and broke. `HistoryMedical`
and `HistoryEnvironmentalHealth` remain uncounted — the former has no
`surveyingOrganization` field at all, the latter is 25% unattributed legacy.
Neither changes the ranking materially, but a partner whose work is
overwhelmingly environmental-health would still be undercounted here.

---

## Related

- `billing-roadmap.md` — Step B, and the pre-committed decision rule
- `organization-delivery-status.md` — how the registry got to 58 organizations
