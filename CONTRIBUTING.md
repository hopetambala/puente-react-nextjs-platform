# Contributing to Puente Manage

Hey! Thanks for wanting to contribute. This is a real platform for real humanitarian work, so let's keep things simple, intentional, and high-quality.

## Quick Setup

```bash
git clone https://github.com/hopetambala/puente-react-nextjs-platform.git
cd puente-react-nextjs-platform
yarn install
yarn dev  # runs on http://localhost:3000
```

Need to run tests? `yarn test`. Need to build? `yarn build`. That's it.

## The Rule: TDD First

**Non-negotiable:** Write the failing test **before** you write any implementation code. Every single time.

1. Write a failing test (RED) — confirm it fails for the right reason
2. Write minimum code to make it pass (GREEN)
3. Improve it while keeping tests green (REFACTOR)

This applies to features, bug fixes, components, hooks — everything. A change that lands without a test that was seen failing first is not done. Period.

Why? Because it keeps the codebase reliable and prevents regressions in a collaborative environment.

## Branching & Commits

Fork, create a branch, work on your thing. Use conventional commits so the changelog stays useful:

```
feat: add avatar navigation to TopBar
fix: footer links now point to real URLs
test: add coverage for DataCurationManager
```

When you fix or close an issue, reference it:

```
Fixes #123
```

## Code Quality

### CSS & Styling

**Use dlite design tokens.** No magic hex colors, no inline `style={{}}`, no random px spacing.

```css
/* ✅ do this */
color: var(--tk-dlite-semantic-color-text-primary);
background: var(--tk-dlite-primitive-color-yellow-200);

/* ❌ don't do this */
color: #1e1d1a;
background: rgb(240, 200, 100);
```

Use CSS Modules (`*.module.scss`). That's it.

### Imports

Simple rule: external imports first (alphabetical), then relative imports.

```js
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { useEffect } from 'react';

import styles from './index.module.scss';
```

Run `npx eslint --fix <file>` if you're unsure — the auto-fixer is the source of truth.

### Headings

No raw `<h1>` or `<h2>` tags outside of the `<PageHeader>` component. Use `<PageHeader title="..." />` for page-level headings. Use Panel titles or `.sectionLabel` for sections. This keeps heading hierarchy consistent.

### Testing

Put tests in `__tests__/<source path>.test.js` — same structure as the source. Mock all external dependencies. That's the contract.

## Before You Push

```bash
yarn test    # all tests pass
yarn build   # zero errors, no warnings
```

If it doesn't build clean, don't push it.

## Pull Request

- Describe what changed and why
- Reference the issue it fixes: `Fixes #123`
- Make sure your branch is up to date with `redesign`
- Be ready to discuss feedback

That's it. Merge happens when we're all happy.

## The Stack

- **Framework:** Next.js 12 (Pages Router)
- **Database:** Parse
- **Components:** Design system exported from `app/impacto-design-system/index.js`
- **Styling:** CSS Modules + dlite design tokens (no Material-UI in new code)
- **Testing:** Jest + React Testing Library
- **i18n:** next-i18next across 6 locales

## Project Structure

```
app/epics/                    # Feature-level UI (FormCreator, FormManager, etc.)
app/impacto-design-system/    # Reusable design components
pages/                        # Routes
__tests__/                    # Tests (mirrors pages/ + app/)
public/locales/               # Translations (6 languages)
```

## One More Thing

If you're adding text the user will see, add it to all 6 locale files: `public/locales/{eng,ara,deu,ind,prt,zho}/common.json`. Use the `useTranslation('common')` hook. No hardcoded English strings.

---

Questions? Check the [README](README.md) or open an issue. Thanks for contributing.

