# Puente Manage

A humanitarian data management platform for real-time form creation, data quality monitoring, and record management. Built with Next.js, React, Parse, and the dlite design system.

**Status:** Actively redesigned (Branch: `redesign`). Landing page live. Authenticated pages migrated to new AppShell architecture. 230+ tests passing.

## Quick Start

```bash
yarn install
yarn dev          # http://localhost:3000
yarn test         # Run test suite
yarn build        # Production build
```

## What Is This?

Puente Manage is built for:
- **Organizations** collecting humanitarian data (surveys, household data, community info)
- **Field staff** submitting data on mobile and web
- **Data managers** reviewing, editing, and exporting results
- **Multi-language** operations (6 locales: English, Arabic, German, Indonesian, Portuguese, Chinese)

### Core Features

- **Form Creator** — Build custom forms with conditional logic, loops, and data validation
- **Form Manager** — View, filter, and drill into submitted records with pagination
- **Operational Dashboard** — Real-time stats: records today, active surveyors, household count
- **Data Curation** — Quality metrics (completeness %), duplicate detection, anomaly flags, inline editing
- **Account Management** — User roles, organization setup, profile settings

## Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | Next.js 12 (Pages Router), React 17, TypeScript |
| **Styling** | CSS Modules + dlite design tokens (no Material-UI) |
| **Components** | Custom design system (`app/impacto-design-system/`) |
| **Data** | Parse SDK, Apollo Client (GraphQL) |
| **Forms** | react-hook-form, yup |
| **State** | React Context |
| **i18n** | next-i18next (6 languages) |
| **Testing** | Jest, React Testing Library (230+ tests, 26 suites) |

## Project Structure

```
pages/
  index.js                          # Landing page (public)
  account/login, register, reset    # Auth pages
  account/management                # User settings
  quick-start/                      # Post-login dashboard
  data/data-curation/               # Data quality & record editing
  forms/
    form-creator/                   # Build forms
    form-manager/                   # Manage submissions
    form-marketplace/               # Browse & import forms

app/
  impacto-design-system/            # Design system components
    AppShell/                       # Main nav, layout, sidebar
    button, badge, panel, modal, table, toast, spinner, etc.
    _css/                           # dlite tokens, variables
  
  epics/                            # Feature modules
    FormCreator/                    # Form builder UI
    FormManager/                    # Records table & drill-in
    DataCurationManager/            # Quality metrics & editing
    NativeApplicationDrawer/        # Mobile nav
  
  modules/
    hooks/                          # Custom React hooks
    user/                           # Auth helpers
    theme/                          # Design token exports
  
  services/
    parse/                          # Database queries
    messaging-api/                  # Notifications
    flask-api/                      # Backend integration

__tests__/                          # Jest tests (mirrors source tree)
public/locales/                     # i18n translations (6 languages)
```

## Design System (dlite)

All UI uses the dlite design system with design tokens. No hardcoded colors, no magic spacing.

```scss
/* ✅ correct */
color: var(--tk-dlite-semantic-color-text-primary);
background: var(--tk-dlite-primitive-color-yellow-200);
padding: var(--tk-dlite-semantic-spacing-md);

/* ❌ wrong */
color: #1e1d1a;
background: rgb(240, 200, 100);
padding: 16px;
```

**Exported components:**
- `AppShell` (layout + sidebar + topbar)
- `PageHeader` (page-level headings)
- `Badge`, `Button`, `Card`, `Panel`, `Modal`, `Toast`, `Table`, `Spinner`
- `FormInput`, `SegmentedControl`, `RadioGroup`
- Plus 15+ more

See [app/impacto-design-system/index.js](app/impacto-design-system/index.js) for the full list.

## Database Schema

**Parse classes:**
- `_User` — User accounts with `organization` field
- `FormSpecificationsV2` — Form definitions
- `SurveyData` — Form submissions with `surveyingOrganization`, `surveyingUser`, `createdAt`
- `SurveyDataActivity` — Audit log of changes

**Key queries:**
- Active surveyors (last 7 days): `.distinct('surveyingUser')` filtered by org & date
- Household count: `SurveyData.count()` by org
- Record completeness: % of 5 required fields filled (`fname`, `lname`, `householdId`, `surveyingUser`, `communityname`)

## i18n (Internationalization)

All user-facing text is translated. Use the `useTranslation('common')` hook:

```jsx
const { t } = useTranslation('common');
return <button>{t('button_save')}</button>;
```

Translations live in: `public/locales/{eng,ara,deu,ind,prt,zho}/common.json`

**When you add a new string, add it to all 6 locale files.**

## Testing

**Rule:** Write the failing test first (RED), then implement (GREEN), then refactor (REFACTOR). Every time.

```bash
yarn test                 # Run all tests
yarn test --watch        # Watch mode
yarn test FormCreator    # Single file
```

Tests mirror the source structure:
```
__tests__/
  pages/quick-start/index.test.js
  app/epics/FormManager/index.test.js
  app/impacto-design-system/AppShell/AppShell.test.js
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- TDD workflow (non-negotiable)
- Code quality standards (dlite tokens, CSS Modules, heading hierarchy)
- Pull request process
- Design system usage

**tl;dr:** Fork, create a branch, write a failing test first, implement, ensure `yarn build` passes, open a PR.

## Build & Deploy

```bash
yarn build     # Production build (must pass with zero errors)
yarn start     # Start production server
```

Build artifacts go to `.next/`. The `redesign` branch is the active branch.

## License

[Business Source License 1.1 (BUSL-1.1)](LICENSE) — Copyright (c) 2026 Puente
