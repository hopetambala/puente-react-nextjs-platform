# Puente Platform

A web platform for managing humanitarian data collection — form creation, data analysis, and visualization — built with Next.js and the Puente design language (dlite).

## Prerequisites

- **Node.js** `20.x` (see `.nvmrc`)
- **Yarn** as the package manager

## Getting Started

```bash
# Install dependencies
yarn install

# Start the dev server
yarn dev

# Build for production
yarn build

# Start the production server
yarn start

# Lint and auto-fix
yarn lint
```

## Project Structure

```
pages/                  # Next.js pages (file-based routing)
  account/              # Login, register, verify, reset, management
  data/                 # Data analysis & visualization
  forms/                # Form creator, manager, marketplace
  quick-start/          # Post-login landing page

app/
  epics/                # Feature modules
    FormCreator/        # Build custom forms
    FormManager/        # Manage submitted form data
    FormMarketplace/    # Browse and import shared forms
    DataAnalyticsManager/ # Data analysis tools
  impacto-design-system/ # In-house component library
    button, card, card-alt, card-group, form-controls,
    icon, Link, modal, portal, spinner, stack, table,
    template-page, text, toast, tooltip, visualizations
    _css/               # Design tokens, variables, reset, utilities
  modules/              # Shared app modules
    theme/              # MUI theme aligned to dlite tokens
    user/               # User authentication helpers
    hooks/              # Custom React hooks
  services/             # External service integrations
    parse/              # Parse Server
    apollo-graphql/     # GraphQL client
    flask-api/          # Flask backend
    messaging-api/      # Messaging service
  store/                # Global state (React Context)
```

## Design Tokens

Styling is powered by [style-dictionary-dlite-tokens](https://github.com/nicholasgalante1997/style-dictionary-dlite-tokens) using the **Puente default** brand. Tokens are imported as CSS custom properties and consumed throughout the app:

- **Typography** — Plus Jakarta Sans (headings), Source Serif 4 (body)
- **Colors** — Blue `#3D80FC` (primary), Yellow `#FFE680` (accent), Neutral `#F7F7F7` (background)
- **Spacing, elevation, border-radius, breakpoints, duration** — all from dlite semantic tokens

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 12 (Pages Router) |
| UI | React 17, Material-UI 4 |
| Styling | CSS Modules, Sass, dlite design tokens, styled-components |
| Data | Apollo Client (GraphQL), Parse SDK |
| Forms | react-hook-form, yup |
| State | React Context |
| Linting | ESLint (Airbnb + Prettier) |
| Dev Tools | Storybook 7, TypeScript 5 |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on pull requests, issues, and conventions.

## License

[MIT](LICENSE) — Copyright (c) 2026 Puente
