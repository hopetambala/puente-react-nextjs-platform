<!-- Tracker: https://claude.ai/artifact/VkMu3RXmunRPod4gceCGb7 (private Artifact; work items, owners, PRs, handoff log) -->

> **Working on this?** Before you start, read the tracker linked above and this doc. Then claim your work item on the tracker by setting its status, session and branch. Before your session ends, update the row (status, PR URL, allowlist count, gallery link) and add a handoff entry to the `log` collection. The tracker splits PR 1 into **1a (test tooling and gate)**, which can start right away, and **1b (foundation)**, which waits for dlite 0.4.0 to publish.

# Manage overhaul: responsive layouts + WCAG 2.2 AA, built on style-dictionary-dlite

## Context

Manage (`puente-react-nextjs-platform`) is unusable on phones and inconsistent across breakpoints, and it fails WCAG 2.2 AA throughout. An audit of every route and every design-system component found:

- **No responsive system at all.** AppShell is `264px 1fr` with no media queries, so at 375px the content is 111px. The only width-based media query in the app is `quick-start`'s `900px`, which measures the window rather than the content. The auth pages, FormCreator, the side panels and the landing page are all fixed multi-column layouts. `html,body{overflow-x:hidden}` plus `body{width:100vw;height:100vh}` hide the overflow, which also makes the one e2e overflow check unable to fail.
- **Three breakpoint scales:** the MUI theme, the `--breakpoint-*` fallbacks, and the 900px literal. The dlite breakpoint tokens exist but are emitted only as custom properties, and those can't be used in `@media`.
- **Contrast failures come from the tokens.** Puente `action-primary` #3d80fc is 3.4–3.7:1. It is used for buttons, links, the active nav, the MUI primary and the brand mark (54 uses). `text-tertiary` #a5a5a5 is 2.3:1. The focus "ring" is a 50%-alpha glow at 1.85:1, and about 8 components set `outline:none`.
- **Manage is on dlite 0.2.7; the latest is 0.3.10.** The upgrade drops `duration-fast` and `duration-normal`, which Manage uses. Seven more tokens Manage references don't exist in any version (FormManager, FormCreator, Billing), and nor do `--radius-m`, `--radius-s` and every `--color-toast-*`.
- **Semantics:**
  - no `<main>` landmark, no skip link, and one `<title>` ("Puente") for every page
  - fake controls: table cells are `div role=button` firing on any key; RadioGroup and SegmentedControl expose no state
  - Modal is 400px wide with dangling `aria-labelledby`; Tooltip never closes on blur
  - side panels aren't dialogs; FormCreator is drag-only (2.5.7)
  - placeholder-only labels; no `autocomplete` anywhere; async errors aren't announced
- **No a11y tooling:** no axe, no jest-axe, and e2e runs only at 1440px.

The goal is one responsive and accessible foundation, owned by the token package and the design system, that every route is rebuilt on. A test gate should then make regressions fail CI instead of shipping.

Decisions made with Hope:
- The token contrast gate enforces **Puente only**. Other brands are untouched.
- **Delete** the design-system code nobody uses.
- Land the work as **stacked PRs by phase**.
- **One design system.** dlite tokens + Impacto components only. Material-UI v4 (`core`, `icons`, `lab`, `pickers`), `@date-io`, `react-toastify` and `react-select` are removed. So are the dead UI dependencies (`@nivo/*`, `google-maps-react`, `react-slick`, `react-countup`, `react-anchor-link-smooth-scroll`, `animate.css`). The only third-party UI code left is behavior: `@popperjs/core` for positioning and `react-beautiful-dnd` for drag. Neither brings its own styling.
- **All a11y tooling, in CI:** token contrast test, jest-axe, Playwright + axe responsive sweep, `jsx-a11y` strict, stylelint a11y rules, and Storybook `addon-a11y` + test-runner. Nothing is left as optional (see "A11y tooling stack").
- **Screenshots drive UI polish and production readiness.** Every PR gets a screenshot matrix and an outside design critique before it's called done (see "Screenshot review loop").

---

## Phase 0: style-dictionary-dlite (`~/Documents/development/hobby/style-dictionary-dlite`, branch `feat/a11y-layout-tokens`)

1. **Breakpoints usable in CSS and JS.** Add two global (not per-brand) web outputs, wired in `build/index.ts` after the brand loop:
   - `dist/web/custom-media.css`: `@custom-media --tk-dlite-bp-sm-up (min-width: 640px)`, and `-md-up`, `-lg-up`, `-xl-up`, plus `--tk-dlite-bp-*-down (max-width: …)` using `-0.02px`. Generated from `semantic.breakpoint`.
   - `dist/web/breakpoints.json`: `{ sm: 640, md: 768, lg: 1024, xl: 1280 }`, for the MUI theme and JS.

   Add new formats in `build/formats/` and export them from `build/formats/index.ts`. The `./web/*` export already covers both paths.
2. **New global semantic tokens** in `tokens/globals/semantic.tokens.json`, emitted to variables.css:
   - `color-focus-ring` (blue-700), `focus-ring-width` 2px, `focus-ring-offset` 2px
   - `sizing-target-min` 24px, `sizing-target-comfortable` 44px
   - `color-text-link` (defaults to `action-primary`)
   - `color-border-control`: the 3:1 boundary for inputs, checkboxes and radios. Decorative `border` stays.
3. **Contrast fixes upstream, in the shared semantic layer** (`tokens/globals/semantic.tokens.json`), not as a Puente override.
   - Kooky, Sneaks and Survivor already override `action-primary`, `action-primary-active`, `text-on-primary` and `text-tertiary` in their own brand files. So these edits change only Puente's output for existing tokens, and other brands just gain the new tokens.
   - Dist snapshot diffs must show exactly that.

   | Token | Light now → proposed | Dark now → proposed |
   |---|---|---|
   | `action-primary` | blue-500 #3d80fc (white 3.69:1) → **blue-600 #1b5fdb** (white 5.67:1) | blue-400, unchanged |
   | `text-on-primary` | white, unchanged | white (2.56:1 on blue-400) → **neutral-900** (7.06:1) |
   | `action-primary-hover` (new) | blue-700 | blue-300 |
   | `action-primary-active` | blue-700 → **blue-800** | blue-300, unchanged |
   | `text-tertiary` | neutral-500 (2.30:1) → **neutral-600** (4.76:1) | neutral-500 (7.35:1), unchanged |
   | `text-link` (new) | alias of `action-primary` (5.29:1 on background) | alias (7.06:1) |
   | `border-control` (new) | neutral-600 (5.10:1; today's `border` is 1.48:1) | neutral-600 (3.55:1) |
   | `focus-ring-color` (new) | alias of `action-primary` (5.29:1) | blue-300 (10.15:1) |
   | `focus-ring-width` / `-offset` (new) | 2px / 2px | same |
   | `sizing-target-min` / `-comfortable` (new) | 24px / 44px | same |

   These are the values in the before/after visual shown in chat.
3b. **A permanent comparison page in the token repo's preview app** (`preview/`, deployed by `pages.yml`). It shows every brand × mode's text, link, button, control-border and focus pairs as rendered swatches, with live contrast ratios and AA/AAA badges, computed from the built `dist/web/*/variables*.css`. The PR description links a before/after of that page, built from `main` and from the branch. It also gets published as a private Artifact so Hope can compare before approving the release.
4. **Contrast gate:** `__tests__/contrast.test.ts` (vitest) reads `dist/web/puente/default/variables{,.dark}.css`. It asserts text pairs (text-primary/secondary/tertiary/link, text-on-primary on action-primary, feedback colors) are ≥4.5:1 on `background`/`surface-*`, and `border-control`, `focus-ring` and `action-primary` are ≥3:1. Reuse the luminance math prototyped in the scratchpad `contrast.mjs`.
5. Update dist snapshots (`__tests__/dist-snapshots.test.ts`, `npm run test:update`). Document breakpoints, focus and target tokens in `README.md` and `build/platform/web/README.md`.
6. Commit as `feat!:`. That makes commit-and-tag-version cut **0.4.0**, so the website (`^0.3.10`) and Collect (`^0.2.7`) don't pick up the color change silently.

**Pause for Hope's approval before merging to `main`.** The `publish.yml` workflow publishes to npm on every push to main.

## Cross-session tracking (so the work doesn't depend on this session)

1. **Tracker Artifact, created first.**
   - A private claude.ai Artifact, "Manage a11y overhaul", backed by the artifact `db` capability. Load the `artifact-capabilities` skill before writing it.
   - One row per work item: Phase 0, PRs 1–7, and the token-repo release. Each row records:
     - status: not started / in progress / in review / merged
     - dependencies
     - which session owns it (title and id)
     - branch and worktree path
     - PR URL
     - known-failures allowlist count
     - before/after screenshot gallery link
     - critique status
     - a dated handoff log (what's done, what's next, open questions)
   - The page shows the dependency order and flags what can be started now.
   - Updates go through `ArtifactData`, not republishing.
2. **The plan travels with the code.** The first commit in the Manage worktree adds this plan as `docs/responsive-a11y-overhaul.md`, and the token-repo branch gets the Phase 0 section as `docs/a11y-tokens.md`. Every session reads the same source, and both link the tracker URL.
3. **Session protocol.** Each work item runs in its own session, started from here or from the tracker. Each session:
   - reads the tracker and the plan doc first
   - marks its row in progress with its session id
   - works in its own worktree on the stacked branch
   - before ending, writes a handoff entry and updates status, PR URL and allowlist count

   Any later session can pick up from the tracker alone.
4. **Parallelism, following the dependency graph:**
   - Phase 0 and PR 1's test tooling (axe, stylelint, Storybook a11y, the e2e sweep and capture matrix) can start at the same time.
   - PR 1's token bump waits for 0.4.0 to publish.
   - PRs 2 and 3 are sequential.
   - PRs 4, 5 and 6 run in parallel sessions after PR 3.
   - PR 7 runs last.

## A11y tooling stack (all of it, all in CI; set up in PR 1, extended by each later PR)

| Layer | Tool | What it enforces | Where |
|---|---|---|---|
| Tokens | vitest `contrast.test.ts` (Phase 0) | Puente text ≥4.5:1, UI/focus/control boundary ≥3:1, light and dark | token repo CI (`ci.yml` runs `npm test`) |
| Lint, JSX | `eslint-plugin-jsx-a11y` raised from the partial config in `.eslintrc.json` to `plugin:jsx-a11y/strict`. Existing violations are fixed, not suppressed. | labels, roles, interactive-element rules, no `onClick` on non-interactive elements | `yarn lint` (already in CI) |
| Lint, CSS | new `stylelint` + `stylelint-config-standard-scss`. Custom rules: no `outline: none`/`0` outside the global focus file; no `px` `font-size`; no `!important`; no raw hex/rgba colors outside `_css/variables.css`; no `z-index` literals; no `100vh` (use `dvh`); no `:focus` without `-visible` | the systemic CSS failures, prevented at write time | new `yarn lint:css` CI step |
| Tokens used | `__tests__/tokens/undefined-tokens.test.js` | every `var(--…)` resolves to a real token | `yarn test` |
| Unit | `jest-axe` (`toHaveNoViolations` in `jest.setup`) | each design-system primitive and each epic's main component renders with zero axe violations in every state (open, error, loading, disabled) | `yarn test` |
| Component | `@storybook/addon-a11y` + `@storybook/test-runner` with `axe-playwright`. **A story for every primitive and state**: only Card and Button have stories today. Viewport addon presets at sm, md, lg and xl from `breakpoints.json`. | axe on every story at every breakpoint | new `yarn test-storybook` CI job |
| Page | `@axe-core/playwright` in `e2e/suites/responsive-a11y.mjs` (detailed in PR 1) | every route × 320/375/768/1024/1440 × eng/spa: axe, overflow, target size, text spacing, focus visibility, keyboard reachability | added to the e2e job in `ci.yml` |
| Behavior | RTL + `userEvent` tests | focus trap and return, Esc, `aria-expanded`/`pressed`/`current`, live-region announcements | `yarn test` |

## Screenshot review loop (UI polish and production readiness, every PR)

1. **Capture.**
   - Extend `e2e/screenshot.mjs`/`capture-lib.mjs` into a `capture-matrix` that shoots every route the PR touches at 375, 768 and 1440 × eng/spa, plus key states: drawer open, dialog/sheet open, empty, error, loading, 200% text.
   - It also shoots the **before** state from `master`.
   - Output goes to `.e2e-artifacts/<pr>/`.
2. **Review against outside design skills.**
   - Run the Anthropic **Design** plugin's `design:design-critique` and `design:accessibility-review` on the screenshots, along with `frontend-design` for implementation polish. I've offered the install card. If they aren't installed, an independent reviewer subagent critiques the screenshots without seeing my reasoning.
   - The review covers visual hierarchy, spacing rhythm on the token scale, alignment, density at each breakpoint, truncation, touch ergonomics, Spanish/Creole text length, and consistency with other screens.
3. **Fix and re-shoot** until the critique has no major issues.
4. **Publish** a private before/after gallery as an Artifact per PR, with the critique's findings and their resolutions. Link it from the PR description.
5. **Production-readiness checklist** in each PR:
   - all gates green (unit, lint, stylelint, Storybook a11y, responsive sweep)
   - no allowlist growth
   - screenshots reviewed at all three widths in both languages
   - slow-network check (Playwright throttling) for loading and empty states
   - no console errors
   - `yarn build` passes

## Manage work: stacked PRs off `master`

Work happens in a new worktree, `.worktrees/manage-responsive-a11y`. The main checkout has uncommitted, unrelated changes, which stay untouched. Add a `manage-responsive-a11y-worktree` entry to the workspace-root `.claude/launch.json` (port 3000), as the existing worktree entries do.

### PR 1: Foundation and test gate
- **Tokens:**
  - Bump `style-dictionary-dlite-tokens` to `^0.4.0`.
  - Replace `duration-fast`/`duration-normal` with `motion-duration-quick`/`-base`.
  - Fix every undefined token: the 7 listed above, `--radius-m`, `--radius-s` and the toast colors. Map them to real dlite tokens.
  - Add `__tests__/tokens/undefined-tokens.test.js`. It scans `app/**` and `pages/**` CSS/SCSS/JS for `var(--tk-dlite-…)` and legacy `var(--…)` and fails on any name not defined in the installed dist or `_css/variables.css`.
- **Breakpoints:**
  - Add `postcss.config.js`. It restates Next 12's defaults (`postcss-flexbugs-fixes`, `postcss-preset-env` with autoprefixer, stage 3, `custom-properties: false`) and adds `@csstools/postcss-global-data` (loading `style-dictionary-dlite-tokens/web/custom-media.css`) and `postcss-custom-media`.
  - Feed `breakpoints.json` into `createMuiTheme({ breakpoints: { values } })` in `app/modules/theme/index.js`. That leaves one scale.
  - `_css/variables.css` `--breakpoint-*` becomes plain aliases or is deleted.
- **Global CSS** (`app/impacto-design-system/_css/root.css`, `input.css`, `controls.css`):
  - Remove `body{width:100vw;height:100vh}` and `overflow-x:hidden`.
  - Add a global `:focus-visible` ring from the new tokens, and delete per-component `outline:none`/`--focus-glow`.
  - Add a global `prefers-reduced-motion` rule and an `.sr-only` utility.
  - Underline links in body text.
  - Make input font-size ≥16px on touch.
  - Fix the invalid `format('ttf')`.
- **Remove MUI from the app root:**
  - Delete `CssBaseline`/`ThemeProvider` from `pages/_app.js`. dlite `reset.css` is already imported and replaces the baseline.
  - Delete `ServerStyleSheets` from `pages/_document.js`.
  - Delete `app/modules/theme/*`; the JS breakpoint consumer becomes `breakpoints.json` directly.
  - Delete the unused form-controls `checkbox`, `radio`, `select`, `datepicker` and `_styles` (zero consumers).
  - Remove the dead UI dependencies listed under Decisions.

  MUI stays installed until PR 3/6 remove its last imports, then it is dropped from `package.json`.
- **Test tooling:**
  - Add `jest-axe` with a `toHaveNoViolations` setup.
  - Add `@axe-core/playwright` and a new e2e suite, `e2e/suites/responsive-a11y.mjs`. It covers every route × widths `[320, 375, 768, 1024, 1440]` × `[eng, spa]`, using the existing localStorage-user stubs from `e2e/capture-lib.mjs`/`capture-org-docs.mjs`. For each combination it asserts:
    - (a) axe `wcag2a, wcag2aa, wcag21aa, wcag22aa`: zero violations
    - (b) no element's bounding box extends past `innerWidth`
    - (c) visible interactive targets ≥24×24 CSS px or spaced per 2.5.8
    - (d) WCAG 1.4.12 text-spacing CSS injected, with no clipped text containers (`scrollHeight > clientHeight` with `overflow:hidden`)
    - (e) Tab reaches the skip link and nav, and each focused element has a non-zero outline
  - The gate starts with a checked-in **known-failures allowlist** keyed by route. Each later PR must shrink it, and PR 7 empties it.
  - Replace the vacuous 860px check in `e2e/suites/dashboard.mjs`.
  - Add `e2e/lib/harness.mjs` support for viewport and locale parameters.

### PR 2: AppShell, page structure, titles (`app/impacto-design-system/AppShell/*`)
- This PR introduces the shared native-`<dialog>` base (focus return, labelled-by wiring, scrim, reduced-motion transitions), which PR 3 builds Dialog and Sheet on.
- Below `--tk-dlite-bp-lg-down` the shell is a single column. The sidebar becomes an off-canvas drawer on that base, opened by a menu button (`aria-expanded`, `aria-controls`) in `TopBar`. The drawer:
  - is modal on small screens: focus moves into it, Esc closes it, and focus returns to the menu button
  - animates with `translate` and respects reduced motion
  - has a backdrop using the `surface-scrim` token
- `height:100dvh`. The page area becomes `<main id="main">` with `container-type: inline-size` and a skip link. Padding is tokenized and smaller below sm.
- Nav semantics:
  - Sidebar: `<nav aria-label>`, `aria-current="page"`, glyph icons `aria-hidden`, group titles through `t()`
  - TopBar breadcrumb: `<nav aria-label><ol>`, with `aria-current` on the last crumb
- Breadcrumb, actions and PageHeader wrap. Title sizes use `clamp()` over the type tokens.
- New `title` prop on AppShell (and the auth layout) renders `<Head><title>{title} · Puente</title>`. That gives every route a unique 2.4.2 title.
- Tests: extend `__tests__/app/impacto-design-system/AppShell` with drawer open/close, focus return, Esc, `aria-current` and jest-axe.

### PR 3: Design-system primitives (`app/impacto-design-system/**`)
Fix each primitive once, to the systemic patterns, so routes inherit the fixes:
- **Button:**
  - `min-height` = target token; labels wrap; `aria-disabled` blocks activation for `href` buttons; `aria-busy` while loading
  - `gap` replaces `.button + .button`
  - the icon button gets a real focus ring
- **Card / CardAlt:** no `<button>` wrapping headings and no buttons nested in `<a>`. Use the stretched-link pattern instead. Add a `headingLevel` prop. Fix the `to` → `href` bug.
- **Modal → Dialog on native `<dialog>` + `showModal()`, replacing MUI Modal.**
  - The native element gives top-layer rendering, inert background, Esc and the `dialog` role.
  - We add: focus return to the trigger, `aria-labelledby`/`describedby` on real ids, a visible close button, and a deterministic centred layout at `width: min(var(--tk-dlite-semantic-sizing-modal-width-normal), 100vw - 2*spacing)`.
  - Below sm it is full-screen. `::backdrop` uses the `surface-scrim` token.
  - Replace the MUI mock in `__tests__/app/impacto-design-system/modal`. jsdom lacks `showModal`, so add a small polyfill in the jest setup.
- **New `Sheet` primitive on the same `<dialog>` base.** It is a side panel on lg and up, and a bottom or full sheet below that. FormCreator Inspector, `NativeApplcationDrawer`, `RecordInspector` and the AppShell nav drawer (PR 2) will use it.
- **Icon:** replace the 170-import MUI icon registry (`icon/icon-components.js`) with a small in-house SVG set covering only the names in use (for example `arrowDropDown`, `arrowDropUp`, `info`, `close`, `menu`, `dragIndicator`). The SVGs are `aria-hidden` by default, sized by the `sizing-icon-*` tokens and colored with `currentColor`.
- **Combobox:** an in-house APG combobox (input + listbox, `aria-activedescendant`, typeahead, visible focused option) replaces `react-select` in `select-autocomplete`. It is used by `/account/register` and `SourceSelector`. Where the option list is short, use a native `<select>` instead.
- **Toast:** drop `react-toastify` for the Impacto Toast + live-region primitive. It is rendered by a small `ToastProvider` in `_app.js`, and `toast()` calls in `CSVButton`, login, register and reset-login move to it.
- **Tooltip motion:** drop `react-spring` for CSS transitions on the `motion-duration-*` tokens. `@popperjs/core` stays for positioning.
- **Tooltip:** closes on blur and Esc; hovering onto the tooltip doesn't close it; `role="tooltip"` + `aria-describedby`; portalled; no 1s delay on focus; reduced motion.
- **Table:**
  - drop `role="cell"` on `<th>`; plain cells; a real `<button>` only when `onClick` is set
  - add a caption, and give the scroll region `tabIndex=0 role="region" aria-label`
  - **stacked-card mode below md** via container query
  - empty state through `EmptyState`
- **Form controls:**
  - Input sets `aria-invalid`/`aria-describedby` when it has an error, and accepts an `autocomplete` prop; fix the required-label class
  - select-autocomplete shows the focused option and links its error text
  - RadioGroup uses native radios in a `fieldset`/`legend`
  - SegmentedControl uses `aria-pressed`, or a radiogroup when it is single-select
- **Toast → live-region primitive:**
  - `role="status"` for info/success, `role="alert"` for errors
  - in `_app.js`, errors don't auto-close and the rest have a pause-on-focus/hover policy (2.2.1)
  - a shared `announce()` helper for async results
- **Spinner, Panel, Badge, EmptyState, LanguageSwitcher:**
  - Spinner: translated accessible name
  - Panel: a heading-level prop
  - all: tokenized font sizes
  - LanguageSwitcher: label contrast
- **Delete:** CardGroup, the visualizations BarChart, Portal, the template-page drawer `Header`, and the unused MUI form wrappers. Confirm each has zero imports with grep before deleting.
- Tests: a jest-axe test and an RTL behavior test per primitive, using `userEvent.tab()` for focus. This adds tests for Table, Tooltip, Card, Sheet and Dialog, which have none today.

### PR 4: Auth and onboarding routes
- One shared `AuthLayout`: brand column above `--tk-dlite-bp-md-up`, hidden or condensed below. It has `<main>`, an h1 and a `title`.
- Routes: `/account/login`, `register`, `reset`, `login/reset-login`, `verify`, `verify/redirect`, and `/account/management`.
- Real `<form onSubmit>` so Enter submits.
- `autocomplete` (username, current-password, new-password, email, tel, given-name, family-name).
- Reuse the `fieldId()` label wiring from `pages/account/management/index.js` on `reset`, where every label currently points at nothing. Password inputs get `type="password"`.
- Translated Yup messages, `role="alert"` on errors, `role="status"` on verify and redirect, and `aria-pressed` or a radiogroup on the reset-login toggle.

### PR 5: Daily coordinator routes
- **`/quick-start`:**
  - add an h1 via PageHeader or `.sr-only`
  - the 900px media query becomes `@container`
  - NeedsAttention tags wrap under the label in narrow containers
  - explicit focus outline on rows
  - polite live summary when data lands
  - fixed-px skeleton widths become relative
  - remove the unexplained `eslint-disable`
- **`/data/data-curation`:**
  - RecordsTable: overflow → stacked cards, a real button or link to open a record, completeness as `role="meter"` with visible %
  - FilterBar: labels, wrapping, a focus ring
  - SourceSelector: a real `<label>`
  - RecordInspector on `Sheet`
  - DuplicateResolver: stacks, and marks differences with text/icon as well as color
  - summary counts live
  - delete and save errors announced
- **`/forms/form-manager`:**
  - labelled search with a focus ring that wraps
  - forms Table → cards below sm
  - `aria-expanded` on expand rows
  - RecordsTable becomes a real `<table>` with the narrow layout
  - Prev/Next keep their visible names (2.5.3)
  - remove the dead "⋯" and the dead SCSS files

### PR 6: Authoring and admin routes
- **`/forms/form-creator`:**
  - the canvas is full width below lg; palette and Inspector move into `Sheet`
  - an **"Add" button on every palette block** (tap and keyboard) alongside drag-and-drop (2.5.7)
  - "Move up/down" buttons as the non-drag reorder path
  - visible labels and unique ids on question and option inputs
  - corrected heading levels
  - Inspector switch focus ring
  - publish errors as persistent alerts
  - **remove the last MUI imports**:
    - `FormBlocks` (IconButton, Tooltip, InfoOutlined) → Impacto icon Button + Tooltip
    - `ActiveInput` → Impacto Checkbox/Switch
    - the NativeApp preview (`NativeApp/index.js`, `PaperInputPicker/**` using Box, TextField, Button, FormControl and so on) → Impacto + tokens, keeping its job of previewing the Collect form, `maxWidth:100%`, with the extra h1 removed
  - then drop all `@material-ui/*` and `@date-io/moment` from `package.json`, and add a CI check that fails if `@material-ui` reappears
- **`/forms/form-marketplace`:** error and retry state, a status spinner, translated strings.
- **`/billing`, `/organization-admin`, `/data/data-analysis`:**
  - an h1 on each
  - labelled inputs, live errors and statuses
  - specific button names ("Deactivate {member}")
  - a translated first column header

  `/organization-admin`'s CSS is the in-repo reference for wrapping rows and focus outlines.

### PR 7: Landing page `/` and closing the gate
- Landing page:
  - `pages/index.module.scss` (955 lines, no media queries): its 6 grids stack at md, and the nav collapses into a menu below sm
  - `<main>`, footer heading levels
  - mock UIs `aria-hidden`
  - real URLs or no `href="#"` links
  - `yellow-700` text → a passing token
- Empty the known-failures allowlist. From here the responsive-a11y suite must pass with zero exceptions at every width and locale.

## Execution notes
- First steps, in this session:
  - create the tracker Artifact
  - create the worktree and commit the plan doc
  - then start Phase 0 and PR 1's tooling half as separate sessions, each pointed at the tracker
- TDD per PR: the failing jest-axe, behavior or e2e assertion comes first, then the fix.
- Each PR is verified in the in-app browser at 375, 768 and 1440, with screenshots in the PR.
- After PR 3 lands, PRs 4, 5 and 6 touch disjoint files. They can run as parallel sessions in their own worktrees, each stacked on PR 3.
- Lint each changed file with `yarn eslint`, which includes `jsx-a11y`. No new suppressions.
- Memory: `yarn build` breaks a running dev server, so restart the server before Playwright runs.

## Verification
0. **Every PR:** the screenshot review loop is done, its before/after gallery and critique are linked, and the production-readiness checklist is ticked.
1. **Token repo:**
   - `npm run build && npm test`: the contrast gate passes for Puente light and dark, and the snapshots show only the intended diffs.
   - `dist/web/custom-media.css` and `breakpoints.json` exist.
   - Check that the kooky, sneaks and survivor variables.css are byte-identical apart from the new global tokens.
2. **Manage checks:**
   - `yarn test` (undefined-token, jest-axe, drawer, dialog, sheet, combobox and toast behavior), `yarn lint` (jsx-a11y strict), `yarn lint:css` (stylelint) and `yarn test-storybook` (axe on every story at every breakpoint) all pass.
   - `grep -r "@material-ui\|react-toastify\|react-select" app pages package.json` returns nothing.
3. **Build:** `yarn build` succeeds, and the built CSS contains the expanded `@media` from custom media and the `@container` rules. Check that the minifier preserves them.
4. **e2e:**
   - `node e2e/run-e2e.mjs responsive-a11y` passes at 320, 375, 768, 1024 and 1440 in eng and spa: zero axe violations, no horizontal overflow, targets ≥24px, text spacing passes, visible focus.
   - The existing suites (dashboard, dashboard-features, craft, form-create, form-edit, data-export, sign-in, sign-up) still pass.
5. **Manual, in the in-app browser:**
   - Every route at 375 and 768: open and close the nav drawer and Sheets with keyboard only.
   - Add and reorder a FormCreator question without dragging.
   - Check 400% zoom (1280 → 320).
   - A VoiceOver pass on the shell, Dialog and Sheet is for Hope. I can't drive a screen reader.
