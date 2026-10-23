# PRD + EDD — Vision clinic research readiness (November 2026)

> **What this is.** The single plan for making Puente's tech ready for the
> Rayjon Eyes vision clinics in Constanza and Sosúa and the McMaster University
> study that uses their data. **Part A (PRD)** says what has to be true and why.
> **Part B (EDD)** says how each piece is built and tested.
>
> **Status, 2026-10-23:** W1–W3 built and verified locally, not merged or
> deployed. W4 scripted, waiting on sign-off and a community list. W5 waits on
> deploy. **Part C** is the build log: what was built, what was measured, and
> what is left.
> **Owner:** Hope (engineering). **Programme lead:** Puente coordinator.

**Repos touched:** `puente-flask-rest-aggregator`, `puente-react-nextjs-platform`,
`puente-dr.github.io`, plus two master-key scripts in `puente-node-cloudcode/scripts/`
(run by hand, not deployed). **No Collect release. No Cloud Code change.**

---

# Part A — PRD

## A1. Recommendation, up front

**Ship four things before the clinic: lock down the export service, add a
one-click de-identified Research export, publish a Research section of the
guides, and have the Puente team run a full dry run using only those guides.**

The outcome that justifies all of it:

> **The clinic runs, the data reaches the researchers safely, and Hope is not
> needed for any of it.**

Hope being reachable is the fallback, not the plan. Every workstream below is
judged by one question: *could the coordinator do this without asking Hope?*

## A2. Context

- **Rayjon Eyes** returns to Constanza in November 2026 (first clinic with
  Puente: 2023). Patients get eye exams and donated prescription glasses.
- **The study.** Two McMaster students want to measure how much vision improves
  depending on how closely the donated glasses match the patient's actual
  prescription. They need age, community, vision test results, and the
  prescriptions of the glasses given. Data comes from clinics in **Constanza and
  Sosúa**. Bob coordinates the mission.
- **The proposal.** Collect the data in Puente Collect during the clinic, then
  share what the researchers need while protecting patient privacy.

## A3. What works today

| Need | Today | Evidence |
|---|---|---|
| Build the exam form | Manage's form builder: number, text, side-label, single-select, multi-select, header, geolocation | `app/epics/FormCreator/index.js` `COLLECTION` |
| Form reaches phones without a release | Custom forms are served from the backend | — |
| Collect without signal | Offline save, queue, retry, partial-sync handling (15.7.1+), Android restart fix (15.7.5) | guide: *Collecting without a signal* |
| Link exam to patient | Custom-form records join to the resident | `dicts/supplementary.py:152` |
| Get a file out | One CSV per form, one row per submission | guide: *Getting your data out* |

## A4. Gaps

| # | Gap | Why it matters | Workstream |
|---|---|---|---|
| **G0** | **Parse answers patient-record queries made with only the public JavaScript key and no sign-in.** Measured 2026-10-23: a count query on `SurveyData` with Manage's browser key returned 44,027, every organization's records. Only the count was read. This is the known §7 "records have no ACL" finding in `billing-and-invoicing.md`, now measured. | The real privacy boundary today is nobody looking. W1 closes the export service, not Parse itself. Any Manage account, researchers' included, can read identified records. | Outside this plan: §7 ACL/CLP work. See C4. |
| G1 | **Export service has no authentication.** The `before_request` hook named `basic_authentication` (`application.py:23`) only answers `OPTIONS`. The base URL ships in Manage's public JS bundle. Short codes are readable slugs. | Anyone who guesses a short code can download an organization's identified records. An ethics board will ask who can access the data. | W1 |
| G2 | **Export carries full patient identity.** Every custom-form row includes name, nickname, phone, cédula, DOB, insurance, GPS, photo URL. | Sending it to McMaster sends patients' personal data. | W2 |
| G3 | **Nothing warns that an export must stay inside Puente.** | Most dangerous gap, because nothing stops it. | W2, W3 |
| G4 | **Age is current year minus birth year** (`calculate_age` measures against `date.today()`). | Off by up to a year, and drifts each time the file is re-downloaded. | W2 |
| G5 | **Community is free text.** 3,196 spellings for ~1,949 communities in production (`community-name-fragmentation.md`). Custom-form exports also strip accents. | The study groups patients by community. | W4 |
| G6 | **No clinic-day guide.** Before/during/evening/when-it-breaks steps are spread across four guides or only known to Hope. | The coordinator can't run the clinic hands-off. | W3 |
| G7 | **No guidance on designing a research form.** | Typed prescriptions mean typos; a missing consent question can block the study. | W3, W4 |
| G8 | **Resident search matches only the start of one field.** A full name finds nobody. | Patients get registered twice under clinic pressure. | W3 (training) |
| G9 | **Form-builder inspector once showed a Number block with a `geolocation_…` key.** Not diagnosed (`building-a-form/README.md`). | Columns could come out wrong. | W5 catches it |

## A5. Personas

- **The coordinator.** Puente staff in the DR. Builds forms, runs exports, is the
  contact for Bob and the researchers. Works in spreadsheets, not code.
- **The surveyor.** Volunteer or staff member with a phone at the clinic table.
  Needs to know what to tap, not how sync works.
- **The researcher.** McMaster student. Receives a file; never logs into
  Puente.

## A6. Workstreams

| | Workstream | Done means |
|---|---|---|
| **W1** | Authenticate the export service | No export route returns data without a valid Manage session from that organization |
| **W2** | Research export | A coordinator downloads a de-identified file with one click, and can't accidentally make it identified |
| **W3** | Research guides section | `puente-dr.github.io/guides/research/` with three guides, bilingual, linked from the index |
| **W4** | Build the vision exam form | Form exists in production for the clinic organization, research export enabled, columns signed off by researchers |
| **W5** | Dry run | Puente team runs the whole flow from the guides alone; questions they had to ask Hope become fixes |
| **W6** | Support model | A named on-site tech lead; Hope only for problems that stop the clinic |

## A7. Requirements

**W1 — Export authentication**
- R1.1 Every export route requires a Parse session token.
- R1.2 The token's user must belong to the requested organization.
- R1.3 `/` and `/health` stay open.

**W2 — Research export**
- R2.1 A separate route returns one CSV row per submission of one form, built
  from an **allow-list** of columns (B3.3).
- R2.2 `study_id` is a stable pseudonym per person. Puente can re-link it; the
  researcher can't.
- R2.3 `age_at_visit` is completed years at the submission date.
- R2.4 A per-form setting, **Allow research export**, off by default. Without it
  the route refuses.
- R2.5 A **Research export** button beside Export in Form Manager, only for forms
  with the setting on. Confirmation text names what the file leaves out.
- R2.6 Each research download is logged: user, form, time, row count.

**W3 — Research guides** (each in English and Spanish, in the existing guides'
style and rules: app strings quoted exactly, screenshots of invented data
captured by script)
- R3.1 `guides/research/` landing page: what research use means at Puente, the
  one rule (only Research export files leave Puente), links to the three guides.
- R3.2 **Running a clinic day.** Checklist for the coordinator and on-site tech
  lead.
- R3.3 **Designing a form for research.** Pick lists over typed numbers, one
  form per visit, consent question, controlled community list, test export
  before launch.
- R3.4 **Sharing data with researchers.** Normal Export vs Research export, what
  the research file contains, how to answer "which patient is P-…?", what to
  agree with the research team first.
- R3.5 The main guides index gets a "Research" group linking to R3.1. The
  existing *Getting your data out* guide gets a warning linking to R3.4.

**W4 — Vision exam form** — spec in B5.

**W5 — Dry run**
- R5.1 Run by the coordinator and a surveyor, not Hope, using only the guides.
- R5.2 At least two phones, at least one Android and one iOS, at least one
  fully offline until evening sync.
- R5.3 ≥10 invented patients, including one registered twice deliberately and
  one with an unparseable DOB.
- R5.4 Research export sent to the McMaster students; they confirm the columns.
- R5.5 Every question asked of Hope during the run is logged and becomes a guide
  fix or a bug.

**W6 — Support model**
- R6.1 A named on-site tech lead for each clinic, who has done the dry run.
- R6.2 Written escalation rule (in the clinic-day guide): Hope is contacted only
  when data can't be saved on any phone, or a sync loses records. Anything else
  waits until after the clinic.

## A8. Success measures

- Hope receives **zero** contacts during the clinic that the guides could have
  answered.
- **100%** of exam submissions synced by the end of each clinic (queues empty on
  every phone).
- The researchers receive **only** Research export files. No identified file
  leaves Puente.
- Duplicate patients from the clinic: **≤2%** of new registrations.

## A9. Out of scope

- De-identifying the built-in Puente exports (people, vitals, env-health,
  medical). The study uses one custom form.
- Formal anonymization (k-anonymity, date shifting, small-group suppression).
  Needed before research export becomes a general feature; not for one study
  with ethics approval.
- Sending files from Manage, or researcher accounts.
- Fixing community name fragmentation across historical data. W4 avoids it for
  this study only.
- Any Collect release.

## A10. Timeline

Clinic dates are not confirmed yet (open question 1). Working backwards from
**early November**:

| By | What |
|---|---|
| Oct 27 | W1 merged to staging. W4 form spec sent to Rayjon + researchers for sign-off. |
| Oct 29 | W1 in production. W2 on staging. W3 drafts. |
| Nov 2 | W2 in production. W4 form built in production. W3 published. |
| Nov 3–4 | W5 dry run. Fixes the same week. |
| Clinic −2 days | Tech lead does the "Before" checklist on every phone. |

**If W2 slips:** collection does not depend on it, only sharing does. Run the
clinic, and ship W2 before any file goes to McMaster. **W1 does not slip:** it
is a live exposure regardless of this study.

## A11. Open questions

| # | Question | Who answers |
|---|---|---|
| 1 | Exact clinic dates in Constanza and Sosúa, and which Puente organization the data belongs to | Coordinator / Bob |
| 2 | McMaster ethics approval: consent wording, data-sharing agreement, retention period | Researchers via Bob |
| 3 | Do patients need linking across both clinics? If not, `study_id` can be per submission, which is safer | Researchers |
| 4 | Which exam measurements and which notation Rayjon uses (B5) | Rayjon via Bob |
| 5 | Phones: Puente's, volunteers' own, or both? Who installs and logs in | Coordinator |
| 6 | Who is the on-site tech lead at each clinic | Coordinator |

---

# Part B — EDD

## B1. Current architecture (export path)

```
Manage (browser) ──fetch, no credentials──▶ Flask on Elastic Beanstalk ──▶ Parse / MongoDB
  app/services/flask-api                     application.py routes
  NEXT_PUBLIC_PUENTE_DATA_EXPORTER_API_URL   /v2/<type>/short-code/<code>/<formid>
                                             supplementary.retrieveRecords
                                               └─ left-join person record
                                               └─ flatten_custom_fields
```

## B2. W1 — Export authentication

**Design.**
- Manage's single `fetchData` (`app/services/flask-api`) adds
  `X-Parse-Session-Token` from the current Parse user.
- Flask's `before_request` gets a real body:
  1. Skip `OPTIONS`, `/`, `/health`.
  2. Read the token. Missing → 401.
  3. Validate with Parse `GET /users/me` (app id + REST key from env). Invalid
     → 401.
  4. Resolve the route's short code (or organization name, on legacy routes) to
     its organization with `organization_utils`, and check the user belongs to
     it. Not a member → 403. Puente staff (`isStaff`) pass for every
     organization.
  5. Cache valid token → user for 5 minutes in process memory to avoid a Parse
     round trip per download.
- The all-organizations routes (`/v2/records/`, `/v2/<type>/`) become staff-only.

**Callers to check before enabling** (risk B8.1): Manage, the Lambda exporter in
`serverless/puente-data-exporter`, any scheduled jobs, and the regression tests.
Search all repos for the base URL and for the route prefixes.

**Rollout.**
- Ship behind `EXPORT_AUTH_MODE`: `off`, then `log` (validate and log failures,
  but serve), then `enforce`.
- Run in `log` on staging, then production, for at least one day. Switch to
  `enforce` only after the logs show no legitimate unauthenticated callers.

**Rollback.** Set `EXPORT_AUTH_MODE=log`. No deploy needed.

## B3. W2 — Research export

### B3.1 Route

`GET /v2/research/short-code/<short_code>/<formid>` →
`ResearchSpecificRecordsByShortCode` in `resources.py`, registered in
`application.py` beside the existing short-code routes.

- Reuses `organization_utils.alias_values`; unknown organization →
  `_empty_csv()`.
- Form without `allowResearchExport` → 403.
- Separate route, not a `?research=1` flag. A forgotten flag silently returns
  the identified file; a separate route has no identified mode.

### B3.2 Pipeline

New `api/data_aggregation_v2/dicts/research.py`:

```
df = supplementary.retrieveRecords(type, query)       # existing, identified
df = research_frame(df, field_specs, secret)           # new
     ├─ study_id      = "P-" + hmac_sha256(secret, person objectId)[:10]
     ├─ submission_id = "S-" + hmac_sha256(secret, submission objectId)[:10]
     ├─ visit_date    = createdAt (date only)
     ├─ age_at_visit  = completed years, dob → createdAt
     └─ SELECT allow-list columns + the form's own question columns
```

- **Select, don't drop.** The output is built from the allow-list. A new person
  column can never appear in research files by accident.
- `RESEARCH_ID_SECRET` comes from the Elastic Beanstalk environment. If missing,
  the route returns 500 with a clear message. **It never falls back to raw
  IDs.**
- The form's own question columns are identified from `field_specs` (the
  `formikKey`/label pairs `flatten_custom_fields` already uses). **Geolocation
  questions in the form are excluded.**
- `age_at_visit` reuses `calculate_age`'s date parsing, with a reference date
  parameter instead of `date.today()`. Unparseable DOB → blank, row kept.

### B3.3 Allow-list

| Column | Source |
|---|---|
| `study_id` | HMAC of person `objectId` |
| `submission_id` | HMAC of submission `objectId` |
| `visit_date` | `createdAt`, date only |
| `age_at_visit` | `dob` + `createdAt`. Collect writes `MM/DD/YYYY` (`IdentificationForm/index.js:195`); day-first is read only when the first part can't be a month |
| `age_as_reported` | person `age`: what a surveyor typed when the birth date was unknown (stored as `00/00/0000`) |
| `age_reported_date` | person `createdAt`, the date that typed age was recorded |
| `sex` | person |
| `communityname` | person |
| `city`, `province` | person |
| `surveyingOrganization` | person |
| *the form's questions, except geolocation* | `flatten_custom_fields` |

**Never included:** `fname`, `lname`, `nickname`, `relationship`, `dob`,
`telephoneNumber`, `cedulaNumber`, `insuranceNumber`, `insuranceProvider`,
`clinicProvider`, `educationLevel`, `occupation`, `subcounty`, `region`,
`latitude`, `longitude`, `picture.url`, `surveyingUser`, raw `objectId`s.

`subcounty` and `region` narrow a small community to a few households.
`educationLevel` and `occupation` aren't used by the study. Adding any of them
is a deliberate one-line change.

### B3.4 Re-linking

To answer "which patient is P-3fa9c01b2e?", an engineer recomputes the HMAC over
the organization's person IDs with the same secret. **Losing or rotating the
secret breaks re-linking for every file already sent.** Store it in the password
manager as well as in Elastic Beanstalk.

### B3.5 Audit log

One line per research download to the existing CloudWatch log: user ID,
organization, form ID, row count, timestamp. No record contents.

### B3.6 Manage

- `ENDPOINTS.Research` and `getResearchRecordsByShortCode` in
  `app/modules/data-export/_types.ts`.
Design, as built (interaction-designer consult; verified on rendered screens
in English and Spanish, not just in jsdom):

- **One row, two named files.** On a form with `allowResearchExport` and a short
  code, `CSVButton` renders **Export research file** (primary) and relabels the
  identified button **Export full records**. Every other row keeps a single
  **Export**, unchanged. *Rejected:* a fifth equal-weight button (equal weight
  implies equal risk) and a choice dialog (the existing `Modal` holds one action
  and opens at a random position).
- **What each file contains is written in the open** in the expanded row, not
  in a tooltip. The `Tooltip` component opens on hover after a second, which
  keyboard and touch users never trigger.
- **"Research export on" badge under the form name, not in Status.** In Status,
  the Spanish badge widened the compact column and pushed the actions past the
  table edge. The name column wraps.
- **Actions stack on research rows only**: edit actions on one line, the two
  exports stacked below. Side by side, the Spanish export labels were wider than
  every other row and clipped the whole table at 1440px. Found by
  photographing the Spanish screen; unit tests could not see it.
- File name `<form name> - research - <YYYY-MM-DD>.csv`.
- **Allow research export** is a checkbox in Form Creator's settings, off by
  default, with its consequence written beside it (`aria-describedby`), saved on
  `FormSpecificationsV2.allowResearchExport`. Puente-form edits don't show it.
- Strings: `export_research_button`, `export_full_records_button`,
  `form_manager_research_badge`, `form_manager_research_file_contents`,
  `form_manager_full_records_contents`, `form_creator_allow_research_export`(`_hint`)
  in `eng`, `spa`, `hat` and the review worksheet.
- Capture script: `e2e/capture-research-export-docs.mjs` (never logs in;
  stubbed backend). It produces the guide's screenshots.

## B4. W3 — Research guides on puente-dr.github.io

**Structure** (the site is static HTML on GitHub Pages; nothing to build):

```
guides/
  index.html                        + "Research" group linking to research/
  getting-your-data-out/            + warning box linking to research/sharing-data/
  research/
    index.html                      landing page (R3.1)
    README.md                       how the section is maintained
    running-a-clinic-day/           R3.2
    designing-a-form-for-research/  R3.3
    sharing-data-with-researchers/  R3.4
```

Each guide follows the existing conventions: `index.html` with the
English/Español toggle (`?lang=es`, saved in `localStorage`), a `README.md`
recording what was verified and how, screenshots in `assets/img/` and
`assets/img/es/` captured by script on invented data, and app wording quoted
from Collect's and Manage's translation files.

### B4.1 Running a clinic day — outline

1. **Who does what:** coordinator, tech lead, surveyors.
2. **Two days before:**
   - Every phone on Collect 15.7.5 or later.
   - Log in on each phone **with a connection**, on the clinic organization.
   - Open the exam form once while online so it's on the phone.
   - Airplane-mode test: submit an invented patient, sync it, discard it.
   - Chargers and power banks.
3. **During:**
   - Search by surname or cédula before registering. A full name finds nobody.
   - One exam form per patient.
   - Never log out. Never clear app data.
   - Watch for the offline banner; it is normal.
4. **Each evening:** on wifi, open the queue on every phone, send, and confirm
   "all caught up." The tech lead records each phone as done.
5. **When something breaks:**
   - Form stuck in the queue.
   - Partial sync.
   - Phone died: charge and reopen; don't reinstall.
   - Someone logged out with forms waiting.
   - App crashed.
6. **When to contact Hope:** only if data can't be saved on any phone, or a sync
   lost records. Everything else waits.
7. **After the clinic:** final sync, coordinator checks record counts against
   the paper sign-in sheet.

Sections 2–5 link to the existing guides for detail instead of repeating them.

### B4.2 Designing a form for research — outline

- Decide the columns with the researchers **before** building.
- One form per patient visit, holding everything measured at that visit.
- Pick lists over typed numbers for anything with standard values.
- A controlled community list, not free text.
- A consent question, first, using the wording the ethics board approved.
- No names or contact details in the form's own questions.
- Turn on **Allow research export**.
- Do a test export, check the column headings, and send a sample to the
  researchers before the clinic.

### B4.3 Sharing data with researchers — outline

- **The one rule:** only Research export files leave Puente.
- What's in the file and what isn't (the B3.3 table in plain language).
- What `study_id` is, and how to ask engineering to re-link one.
- What to agree first: ethics approval, data-sharing agreement, retention, who
  at the institution receives the file.
- How to send: shared drive with named access, not email attachments.

## B5. W4 — Vision exam form spec (draft for Rayjon + researcher sign-off)

One form per patient visit. Rayjon to confirm measurements and notation (open
question 4).

| # | Question | Block | Options / notes |
|---|---|---|---|
| 1 | Consent to use this visit's data for research | single-select | Yes / No. Wording from the ethics approval |
| 2 | Clinic | single-select | Constanza / Sosúa |
| 3 | Community | single-select | Controlled list agreed with the coordinator, plus "Other" |
| 4 | Visual acuity, right eye, **without** glasses | single-select | Snellen lines 20/20 … 20/400, CF, HM, LP, NLP |
| 5 | Visual acuity, left eye, without glasses | single-select | same |
| 6–11 | Measured prescription, each eye: sphere, cylinder, axis | sphere/cyl: single-select in 0.25 D steps over the range Rayjon uses; axis: number 0–180 |
| 12 | Reading add, if measured | single-select | 0.25 D steps |
| 13–18 | Prescription of glasses given, each eye: sphere, cylinder, axis | same as 6–11 |
| 19 | Visual acuity, right eye, **with** glasses given | single-select | as 4 |
| 20 | Visual acuity, left eye, with glasses given | single-select | as 4 |
| 21 | Glasses given? | single-select | Yes / No / Referred |

Headers group the sections.

- **No Collect release needed.** The form is built in Manage.
- Age and sex come from the patient record. Community is asked again (Q3) because
  the patient record's community is free text (G5).
- Pick lists stop sign and decimal typos (`-2.25` vs `2.25` vs `-225`). The
  number keypad (`keyboardType="numeric"`) can still produce them.
- After building, open the Inspector on every block and check its key matches
  the question (G9). The test export in W5 confirms it.

## B6. Test plan

All automated tests run on **invented records**, never production data. This is
the same rule the export guide's verification followed.

**Flask**
1. **Allow-list holds.** Given a frame containing every person column, the
   output equals the B3.3 columns plus the form's questions. Its intersection
   with the "never" list is empty. Fails if someone adds a person column
   without updating the list.
2. **Stable pseudonyms.** Same person → same `study_id` across submissions.
   Different people → different IDs. A different secret changes every ID.
3. **No secret, no file.** Without `RESEARCH_ID_SECRET` the route refuses.
4. **Age at visit.** `dob 1983-12-26`, visit `2026-11-10` → 42. Unparseable DOB
   → blank, row kept.
5. **Gates.** Form without `allowResearchExport` → 403. Unknown short code →
   empty CSV.
6. **Geolocation questions** in the form are not in the output.
7. **Auth (W1).** No token → 401. Another organization's token → 403. Staff
   token → 200. In `log` mode, failures are served and logged. The existing
   `tests/test_endpoints_regression.py` passes with a valid token.

**Manage**
8. The Research export button appears only when the setting is on, and calls
   the research route.
9. `fetchData` sends the session token.
10. Spanish strings render (the export guide found untranslated buttons before).

**End to end:** the W5 dry run.

## B7. Rollout

1. **W1** to staging in `log` → production in `log` → callers checked →
   `enforce`.
2. **W2** Flask route to staging with a staging secret. Manage button to staging.
   Test against a staging form with invented patients.
3. **W2** to production, with the production secret set **before** the deploy.
4. **W3** published when W2 is in production, so the sharing guide describes
   something real.
5. **W4** form built in production; research export turned on.
6. **W5** dry run in production on the clinic organization, with invented
   patients clearly named (`Ejemplo …`). **Delete the dry-run records
   afterwards**, so they never reach the research file.

## B8. Risks

| # | Risk | Mitigation |
|---|---|---|
| 1 | W1 breaks an unknown caller of the export service | `log` mode first; search repos for callers |
| 2 | Dry-run records end up in the research file | Invented names, delete after W5, check row count before first share |
| 3 | `RESEARCH_ID_SECRET` lost or rotated | Store in password manager; never rotate during the study |
| 4 | Free-text answers in the form contain identifiers | Form has no free-text questions; design guide says why |
| 5 | Small groups re-identifiable (e.g. one 80-year-old in a tiny community) | Accepted for this study under ethics approval; listed in A9 |
| 6 | No connectivity for days | Phones hold the queue; evening-sync checklist; tech lead tracks each phone |
| 7 | Timeline: ~10 days to clinic | W1 and W4 first; W2 can follow the clinic if needed (A10) |
| 8 | Hope is pulled in anyway | W5 surfaces the questions early; W6 escalation rule limits contacts |

---

# Part C — Build log, 2026-10-23

## C1. What was built, and where

| Workstream | Repo · branch | What |
|---|---|---|
| W1 | `puente-flask-rest-aggregator` · `feat/export-auth` | `api/auth.py`: session-token check on every export route, behind `EXPORT_AUTH_MODE` (`off` / `log` / `enforce`, **default `log`**). `/`, `/health`, `/versions` stay open. Unscoped and by-id routes are staff only. |
| W1 | `puente-react-nextjs-platform` · `feat/export-session-token` | `app/services/flask-api`: sends `X-Parse-Session-Token`; no header when signed out. |
| W2 | Flask, same branch | `dicts/research.py` + `GET /v2/research/short-code/<code>/<formid>`. The allow-list (B3.3), HMAC pseudonyms, age at visit plus reported age, geolocation questions dropped, refused without `RESEARCH_ID_SECRET` or `allowResearchExport`, one audit line per download (`research_export` logger, own handler so INFO reaches EB logs). `supplementary.parseCall` split into `fetchRecords` + `cleanRecords` so both exports share the fetch. |
| W2 | Manage, same branch | B3.6 as built. |
| W3 | `puente-dr.github.io` · `research-guides` | `guides/research/` landing page plus three guides, bilingual, with screenshots. *Getting your data out* gets a warning linking to the sharing guide. `check-guides.py` now recurses (it skipped nested guides). |
| W4 | `puente-node-cloudcode/scripts/` (untracked) | `create-mcmaster-org.js` (org `McMaster`, short code `mcmaster`, first user Test McMaster) and `create-vision-exam-form.js` (26 fields, research export on). **Run by Hope with the master key.** The form script refuses to run until `COMMUNITIES` is filled in; `--print` shows the form without writing. |

## C2. Verification

**W1, pre and post download of the largest organizations' exports.** The four
largest organizations by record count (Puente, Constanza Medical Mission, One
World Surgery, WOF): people, env-health, vitals, medical evaluation, and each
one's two largest custom forms, plus Rayjon on the legacy by-name route. 24
exports, up to 16,867 rows each.

| Run | Result |
|---|---|
| production vs production, twice | 22/24 byte-identical. **The other two (Constanza's and WOF's largest custom forms) return the same rows in a different order on every download**: `order: -updatedAt` ties. Existing behavior, not caused by this change. |
| production vs new code, `log` mode, after W1 | **24/24 byte-identical**; all 24 tokenless downloads logged |
| production vs new code, `log` mode, after W1 + W2 refactor | **24/24 byte-identical** |
| new code, `enforce` mode, no token and forged token | 48/48 refused with 401; forged token rejected by real Parse; `/health` open |

The before snapshot also confirmed G1 live: all 24 production exports
downloaded with no credentials.

**Not yet verified: `enforce` with a real signed-in session.** That needs a
production session token, and Claude does not sign in to production. It's part
of W5.

**W2 on real data.** The research builder was run over the seven largest
production custom forms (up to 10,907 rows), reading only column names and
counts:

- no identifying column in any of them;
- the first version left `age_at_visit` blank for 60–95% of rows: it read
  `MM/DD/YYYY` as day-first, and many patients have no birth date
  (`00/00/0000`) and a typed age instead. After the fix plus `age_as_reported`,
  **1–10% of rows have no age of either kind**.

**Tests.** Flask 142 passed (25 research, 21 auth). Manage 932 passed in full,
`next lint` clean, `yarn build` clean, locale parity green. Guides:
`check-guides.py` 10/10.

**Rendered checks.** Form Manager and Form Creator captured in English and
Spanish with every backend answer stubbed. Two layout defects found this way
and fixed (B3.6).

## C3. Decisions made today

- **McMaster is a real organization researchers will sign in to** (Hope,
  2026-10-23). TestMcMaster is a test account in it, created by Hope on
  production with `create-mcmaster-org.js`. Parse usernames are email or phone,
  so "TestMcMaster" is the display name. **Consequence: see C4.**
- **Testing happens in a duplicated form**, not the real one, so test patients
  never reach the research export. This replaces B7 step 6's "delete the
  dry-run records".
- **Consent rows are removed by hand** before sending. The research file
  contains every submission. The sharing guide says so.

## C4. Open risk the code cannot close before November

Researchers with McMaster accounts can see identified records **in Manage's
screens** (record tables, inspector, curation) and, because of G0, **directly
from Parse**. The research export only controls what a download contains, not
what an account can see. Three ways forward, Hope's call:

1. **Researchers don't sign in.** The coordinator runs Export research file and
   shares the file. Zero code, and the only option that is actually private
   before November. *Recommended.*
2. **A researcher role in Manage** that hides identified screens and allows
   only the research route. Days of work. A *convenience* boundary only, the
   same label D1 uses, until §7 ships.
3. **§7 ACL/CLP work.** The real fix, and the riskiest phase in the billing
   plan. Not before November.

## C5. Left to do

| # | What | Who |
|---|---|---|
| 1 | Review and merge the Flask, Manage and guides branches. Merging Flask to `main` deploys to production in `log` mode, which serves exactly as today. | Hope |
| 2 | Set `RESEARCH_ID_SECRET` in the `flask-api-40-env` Elastic Beanstalk environment, and keep a copy in the password manager. | Hope |
| 3 | After a day in `log` mode, read the `export_auth` lines for legitimate callers that fail, then set `EXPORT_AUTH_MODE=enforce`. | Hope |
| 4 | Run `create-mcmaster-org.js`, then fill in `COMMUNITIES` and run `create-vision-exam-form.js` once Rayjon and McMaster sign off on B5. | Hope / coordinator |
| 5 | Decide C4. | Hope |
| 6 | W5 end to end, after 1–4: Hope signs in as TestMcMaster in the browser, Claude drives the session (C6). | Hope + Claude |
| 7 | Follow-ups, not blocking: research export drops rows where a designated consent question isn't "yes"; a deterministic row order for the identified exports; native review of the new Spanish and Kreyòl strings. | — |

## C6. W5 end-to-end script (after deploy)

1. In a duplicate of the vision form, on one iPhone and one Android, in
   airplane mode: register two invented patients (one with a birth date, one
   with only a typed age) and fill the form, consent Yes for one and No for the
   other. Sync on wifi; queues empty.
2. Manage, signed in as TestMcMaster: Form Manager shows the badge and both
   buttons. **Export research file:** two rows, the B3.3 columns, both ages
   filled, no identifying column, file named `… - research - <date>.csv`.
   **Export full records:** names present.
3. In the EB logs: one `research_export` line naming the form and 2 rows; no
   `export_auth` failure for these downloads.
4. With `enforce` on: the same downloads still work signed in. A tokenless
   `curl` to the same URL gets 401. A signed-in user of another organization
   gets 403.
5. Rerun the 24-export pre/post comparison against production with `enforce`
   on and a staff token: 24/24 match a pre-enforce snapshot (allowing for the
   two known row-order cases).
6. Delete the duplicate form.

## C7. Deploy log, 2026-10-23

| Step | State |
|---|---|
| Flask hopetambala/puente-flask-rest-aggregator#129 | **Merged (`199457f`) and live** on `flask-api-40-env`, Ready/Green. |
| EB environment | `EXPORT_AUTH_MODE=log`, `RESEARCH_ID_SECRET` set. The secret's backup copy is in SSM Parameter Store, `/puente/flask-api/RESEARCH_ID_SECRET` (SecureString, us-east-1). It was never printed. |
| Production pre/post | The 24 exports snapshotted from production just before the merge and again after the new version went live: **24/24 byte-identical**. |
| New code live | `/v2/research/...` answers its own 403 ("not turned on for this form"). The EB log shows `export_auth: missing, mode: log` for tokenless downloads, and serves them. |
| Manage hopetambala/puente-react-nextjs-platform#130 | All checks green: the e2e stability gate flagged a login-page 404 as flaky once, and the rerun passed. **Waiting on a human review and merge.** |
| Guides puente-dr/puente-dr.github.io#7 | Open. Merge after Manage, so the guides never describe buttons production doesn't have yet. |
| Scripts hopetambala/puente-node-cloudcode#641 | Open; CI green. |
| Test form | `PRUEBA - Examen de la vista (Vision exam)` created for McMaster (`RpblSpOpvj`), research export on, one invented community. Delete it after W5. |
| McMaster org + TestMcMaster | Waiting on Hope: `create-mcmaster-org.js` creates both in one `signup` call. Claude does not create production accounts. |
| `enforce` | After Manage is merged and W5 shows signed-in downloads pass in `log` mode. |
