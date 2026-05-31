# Puente Manage — Redesign Handoff

Branch: `redesign` · Stack: Next.js 12 Pages Router, Parse SDK, CSS Modules, Jest + React Testing Library

## Design reference

All specs live in `_design_handoff_puente_manage_redesign/designs/`.
Open `02 Manage Redesign.html` in a browser to navigate the five target screens.
`redesign.jsx` is the React source for every screen — use it as ground truth for
component structure, class names, and copy.

---

## What is already done — do not re-implement

| Area | Status |
|---|---|
| Landing page (`pages/index.js`) | ✅ |
| AppShell — Sidebar, TopBar, PageHeader (`app/impacto-design-system/AppShell/`) | ✅ |
| All 7 authenticated pages migrated to AppShell | ✅ |
| Operational dashboard (`pages/quick-start/index.tsx`) | ✅ |
| Login redesign — two-column layout, labels fixed (audit F-03) | ✅ |
| Design system components: Badge, SegmentedControl, RadioGroup, EmptyState, Panel | ✅ |
| i18n via next-i18next; all new keys in `public/locales/*/common.json` | ✅ |
| Yellow pulse dot on Surveyors nav item (audit F-07) | ✅ |
| `--font-family` set to Plus Jakarta Sans app-wide (audit F-08) | ✅ |
| RadioGroup replaces card-clicks in data-visualization (audit F-11) | ✅ |
| FormManager filter strip — search + view toggle unified | ✅ |
| Form Creator Inspector panel (right panel, toggles, options, hint box) | ✅ |
| Form Manager RecordsTable drill-in (pagination, status chips, Back button) | ✅ |
| Dashboard Records Today stat wired to Parse (`SurveyData` count) | ✅ |
| Forms panel queries `FormSpecificationsV2` (not stale `Form` class) | ✅ |
| `/data/data-visualization` permanently redirects to `/data/data-curation` | ✅ |
| `/data/data-curation` page created (blank placeholder, replaced in Phase 4) | ✅ |
| 230 tests · 26 suites · `yarn build` clean | ✅ |

---

## What remains — 9-phase completion plan

> **TDD rule (non-negotiable):** Write the failing test **first**, confirm RED,
> implement, confirm GREEN. Never write source code before the test exists.

### Progress tracker

| Phase | Title | Status |
|---|---|---|
| 1 | Navigation Fixes | ⬜ not started |
| 2 | Dashboard: Org-Scoped Real Stats | ⬜ not started |
| 3 | TopBar Avatar Navigation | ⬜ not started |
| 4 | Data Curation Epic (new feature) | ⬜ not started |
| 5 | Form Creator: Remove Material-UI | ⬜ not started |
| 6 | i18n Cleanup (all 6 locales) | ⬜ not started |
| 7 | Inspector i18n | ⬜ not started |
| 8 | Auth Pages Redesign (Register / Reset / Verify) | ⬜ not started |
| 9 | NativeApplicationDrawer: Remove MUI | ⬜ not started |

Update status to `🔄 in progress` or `✅ done` as each phase is completed.

---

### User decisions (confirmed May 30 2026)

- Dead nav links (Surveyors, Households, Consent, Members) → **remove from sidebar entirely** until built
- Data nav → **Build Data Curation for real** (quality metrics + record editing); stays at `/data/data-curation`
- Form Creator discoverability → **both**: sidebar nav entry + `+ Create form` CTA inside Form Manager catalog
- Active Surveyors stat → distinct `surveyingUser` values in SurveyData for logged-in org, last 7 days
- Households stat → SurveyData total count as proxy, org-scoped
- All dashboard stats → scoped to `surveyingOrganization == user.get('organization')`
- TopBar avatar click → navigate to `/account/management`
- Auth pages (Register, Reset, Verify) → apply redesigned Login two-column layout
- i18n → purge boilerplate scaffold keys AND add all missing keys across all 6 locale files
- Form Creator MUI layout → fix everything (Grid → CSS Modules, `<Text h1>` → `<PageHeader>`)

---

### Key schema facts

| Item | Value |
|---|---|
| Org filter field on SurveyData | `surveyingOrganization` (String) |
| Org field on `_User` | `organization` — `user.get('organization')` |
| Active surveyors query | `.equalTo('surveyingOrganization', org).greaterThanOrEqualTo('createdAt', sevenDaysAgo).distinct('surveyingUser')` → `.length` |
| `retrieveCurrentUserAsyncFunction()` | Synchronous — no `await` |
| Completeness key fields (Data Curation) | `fname`, `lname`, `householdId`, `surveyingUser`, `communityname` |
| Design system exports | `AppShell`, `PageHeader`, `Badge`, `Button`, `EmptyState`, `Modal`, `Panel`, `Toast`, `Spinner`, `Table`, `SegmentedControl`, `RadioGroup`, `FormInput` |

---

### Phase 1 — Navigation Fixes

**Goal:** Every sidebar item either works or is gone. Form Creator becomes discoverable.

**RED tests first** (`__tests__/app/impacto-design-system/AppShell/AppShell.test.js`):
- Surveyors/Households/Consent/Members buttons NOT in DOM
- "Form Creator" nav button exists and clicking it calls `router.push('/forms/form-creator')`
- "Form Manager" nav button exists (renamed from "Forms")

**RED tests first** (`__tests__/app/epics/FormManager/index.test.js`):
- `+ Create form` button exists in catalog view and calls `router.push('/forms/form-creator')`

**Implement:**
1. `app/impacto-design-system/AppShell/Sidebar.js` — remove `field` group; remove `consent`/`members`; rename Forms→Form Manager (`nav_form_manager`); add `{ id: 'form-creator', labelKey: 'nav_form_creator', icon: '✦', href: '/forms/form-creator' }`
2. `app/impacto-design-system/AppShell/AppShell.js` — add `if (pathname.startsWith('/forms/form-creator')) return 'form-creator';` before the `/forms` catch in `deriveActiveRoute`
3. `app/epics/FormManager/index.js` — add `+ Create form` button in catalog view using `useRouter`
4. All 6 `public/locales/*/common.json` — add `nav_form_manager`, `nav_form_creator`

---

### Phase 2 — Dashboard: Org-Scoped Real Stats

**Goal:** All 3 stat cards show real numbers scoped to `user.get('organization')`.

**RED tests first** (`__tests__/pages/quick-start/index.test.js`):
- Active Surveyors shows a number (not `–`) when `distinct` mock returns an array
- Households shows a number (not `–`) when `count` mock returns a value
- `mockQueryChain.equalTo` called with `('surveyingOrganization', 'TestOrg')`
- `mockQueryChain.distinct` called with `'surveyingUser'`

**Implement** `pages/quick-start/index.tsx`:
- Capture `user.get('organization')` → `org` state in the existing firstName useEffect
- Add `activeSurveyors` and `households` state (`number | null`)
- New `fetchStats` useEffect with `[org]` dep — queries: Records today (count + org filter), Active surveyors (distinct + org + 7-day filter), Households (count + org filter)
- Remove hardcoded `"No live data"` and `"of – in territory"` meta text
- Scope activity feed query to org

---

### Phase 3 — TopBar Avatar Navigation

**Goal:** Clicking the avatar navigates to `/account/management`.

**RED test first:** clicking `aria-label="Account settings"` calls `router.push('/account/management')`

**Implement** `app/impacto-design-system/AppShell/TopBar.js`:
- Add `useRouter`; change `<div className={styles.avatar}>` → `<button type="button" aria-label="Account settings" onClick={() => router.push('/account/management')}>`

---

### Phase 4 — Data Curation Epic

**Goal:** Replace "coming soon" with a real data quality tool.

**New files:** `app/epics/DataCurationManager/index.js`, `index.module.css`, `__tests__/app/epics/DataCurationManager/index.test.js`

**Feature spec (v1):**
- Load `SurveyData` for org (limit 200)
- `computeCompleteness(record)` — % of 5 key fields non-empty (`fname`, `lname`, `householdId`, `surveyingUser`, `communityname`)
- `detectDuplicates(records)` — same `householdId` on same calendar day → `Set<objectId>`
- `flagAnomalies(records)` — completeness < 60 → `Set<objectId>`
- Summary bar: `X records · Y% avg completeness · Z duplicates · W anomalies`
- Records table: Surveyor / Submitted / Completeness % / Flag chip
- Edit modal: row click → design system `Modal` → `FormInput` for 5 key fields → `record.set(); record.save()`

**RED tests first:** unit tests for all 3 pure functions; component tests for summary bar, table headers, modal open, save call

**Also update** `pages/data/data-curation/index.js` — replace `<EmptyState>` with `<DataCurationManager />`

---

### Phase 5 — Form Creator: Remove Material-UI

**Goal:** Zero MUI imports. `PageHeader`, CSS Modules grid, design system `Toast`.

**RED tests first:** `data-testid="page-header"` renders; no element with class `/MuiGrid/`

**Implement** `app/epics/FormCreator/index.js`:
- Remove `import { Grid, NoSsr, Snackbar } from '@material-ui/core'` and `@material-ui/lab`
- Add `Toast`, `PageHeader` to design-system import
- `<Text element="h1">` → `<PageHeader title={t('form_creator_title')} />`
- `<Grid>` wrappers → `<div className={styles.canvasGrid}>`
- `<Snackbar>` + `<Alert>` → `<Toast>`; `<NoSsr>` → remove

**Implement** `app/epics/FormCreator/index.module.scss` — add `.canvasGrid { display: grid; grid-template-columns: 280px 1fr 320px; }`

---

### Phase 6 — i18n Cleanup

**Goal:** All 6 locale files contain only app keys. No scaffold boilerplate.

**Purge from all 6:** `contact_title`, `contact_title2`, `contact_subtitle`, `form_name`, `form_email`, `form_phone`, `form_company`, `form_message`, `form_terms`, `form_privacy`, `form_send`, `notif_msg`, `saas-landing` (entire object), `title`, `subtitle`

**Add to all 6:**
`nav_form_manager`, `nav_form_creator`, `nav_data_curation`, `data_curation_sub`, `data_curation_empty`, `inspector_editing`, `inspector_block_props`, `inspector_label`, `inspector_formik_key`, `inspector_required`, `inspector_allow_other`, `inspector_multi_select`, `inspector_options`, `inspector_schema_hint`, `form_creator_title`, `form_creator_save`, `form_creator_publish`, `data_curation_records`, `data_curation_avg`, `data_curation_dups`, `data_curation_anomalies`, `data_curation_edit`, `data_curation_save`, `stat_active_surveyors_meta`, `stat_households_meta`

**Verify:** `yarn build` — zero missing-key warnings

---

### Phase 7 — Inspector i18n

**Goal:** Inspector uses `t()` for every visible string. Zero hardcoded English.

**RED tests first:** `"inspector_editing"` appears in DOM (not `"EDITING"`); `"inspector_block_props"` appears (not `"Block properties"`)

**Implement** `app/epics/FormCreator/Inspector/index.js` — add `useTranslation('common')`, replace all 20+ hardcoded strings with `t('key')`

---

### Phase 8 — Auth Pages Redesign

**Goal:** Register, Reset, Verify match the Login two-column layout.

**Security fix:** `pages/account/reset/index.js` calls `window.localStorage.clear()` on mount — **remove it**.

**Design reference (read-only):** `pages/account/login/index.js` + `pages/account/login/index.module.scss`

**RED tests first** (create test files for all 3 pages):
- `data-testid="auth-brand"` renders; `data-testid="auth-form"` renders
- Reset: `localStorage.clear` NOT called on mount

**Implement:** Replace `<Page>` wrapper with two-column structure; remove `localStorage.clear()` from reset; add real Parse verification to verify page

---

### Phase 9 — NativeApplicationDrawer: Remove MUI

**Goal:** No `@material-ui/core` imports.

**RED tests first:** renders `data-testid="native-drawer"`; no class matching `/Mui/`

**Implement** `app/epics/NativeApplcationDrawer/index.js`:
- Remove all MUI imports; remove `withStyles`
- Replace `Drawer` → `<div data-testid="native-drawer" className={styles.drawer}>`
- Replace MUI `Button` → design system `Button`
- New `index.module.css`: `.drawer { position: fixed; right: 0; transform: translateX(100%); transition: transform .25s ease; }` / `.drawerOpen { transform: translateX(0); }`

---

### Out of scope

- Building Surveyors, Households, Consent, Members features (removed from nav)
- Restoring Quick Insights (`/data/data-visualization` permanently redirects)
- DataAnalyticsManager Django ETL refactor
- Non-English translations (English fallback acceptable)

---

## Mandatory conventions

### TDD — non-negotiable
Write the failing test **first**, confirm it is RED, implement, confirm GREEN.
Never write implementation before the test exists.

### Test file layout
```
__tests__/<source path>.test.js   ← mirrors the source tree exactly
```
Mock all external deps (`next/router`, `next-i18next`, `parse`, `app/services/parse`, `app/modules/user`).

### CSS tokens — never raw hex
```css
/* ✅ correct */
color: var(--tk-dlite-semantic-color-text-primary);
background: var(--tk-dlite-primitive-color-yellow-200);

/* ❌ wrong */
color: #1e1d1a;
```

### Import order (`simple-import-sort`)
```js
// Group 1 — all non-relative imports, alphabetical
//   note: next/ sorts before next-i18next  (/ < - in codepoint order)
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { useEffect } from 'react';

// Group 2 — relative imports
import styles from './index.module.scss';
```
Run `npx eslint --fix <file>` if unsure — the auto-fixer is authoritative.

### Heading hierarchy
No raw `<h1>` or `<h2>` outside of `<PageHeader>`.
Use `<PageHeader title="..." eyebrow="..." sub="..." />` for page-level headings.
Use Panel `title` prop or a `.sectionLabel` class for section headings.

### Typography
- **Plus Jakarta Sans** — all in-app UI (body, labels, headings)
- **Source Serif 4** — marketing landing (`pages/index.module.scss`) and login editorial quote (`pages/account/login/index.module.scss`) **only**
- **Source Code Pro** — record IDs, formikKeys, mono values

### Build gate
`yarn build` must pass with **zero errors** before any PR.
Pre-existing `react-hooks/exhaustive-deps` warnings in legacy auth pages are acceptable (warnings, not errors).

---

## Key file map

| What | Where |
|---|---|
| Design system root | `app/impacto-design-system/index.js` |
| AppShell components | `app/impacto-design-system/AppShell/` |
| CSS variables + tokens | `app/impacto-design-system/_css/variables.css` |
| Form Creator epic | `app/epics/FormCreator/index.js` |
| Form Manager epic | `app/epics/FormManager/index.js` |
| i18n locale files | `public/locales/*/common.json` |
| Parse type declaration | `parse.d.ts` (project root) |
| Design spec (React) | `_design_handoff_puente_manage_redesign/designs/redesign.jsx` |
| Design spec (HTML) | `_design_handoff_puente_manage_redesign/designs/02 Manage Redesign.html` |
