# Spanish and Haitian Creole in Manage

## What shipped

Manage now ships **English (`eng`), Spanish (`spa`), and Haitian Creole
(`hat`)** — 162 keys each, at enforced parity.

The previous locale set (`ara`, `deu`, `ind`, `prt`, `zho`) was retired on
2026-08-28. It came from a Next.js template, had no Dominican Republic
relevance, had been 47 keys stale since June 2026, and — because there is no
explicit `fallbackLng` — was silently rendering English to anyone who reached
it. Nobody noticed, because a missing key looks exactly like a translated one.

Collect (`puente-reactnative-collect`), the mobile app field staff actually
work in, has shipped English, Spanish, and Haitian Creole at 601-key parity for
some time, with a language picker in Settings and its own CI gate. Manage was
the outlier. It no longer is.

## Provenance, and what still needs a human

**These translations were produced by Claude, not by a native speaker.** That
is a deliberate exception to Puente's usual rule, made explicitly by the
maintainer. It is recorded here so nobody later mistakes them for
translator-reviewed copy.

The confidence is **not uniform**, and the difference matters:

| Locale | Status |
| --- | --- |
| **Spanish** | High confidence. Reviewable by any DR-based coordinator. Most likely corrections are regional idiom, not meaning. |
| **Haitian Creole** | **Needs native review before it reaches Haitian staff.** Anchored to Collect's existing human `hk.json` for vocabulary and register, but not authored by a Creole speaker. |

Reviewing shortcut that did **not** work: lifting the strings wholesale from
Collect. Only 19 of 162 (11%) of Manage's English strings appear in Collect's
601-key corpus. Collect's vocabulary is field data entry — forms, vitals,
households, offline sync. Manage's is dashboards, triage, curation, export. The
overlap is greetings and buttons.

## Reviewing

[`review-worksheet.csv`](./review-worksheet.csv) — 162 rows, English alongside
both translations, with a `reviewed_by` column and a `notes` column flagging
the 19 strings where Collect already has a human translation of the same
English.

Corrections go directly into `public/locales/<locale>/<namespace>.json`. Keys
must not be renamed — the parity gate will reject a renamed key as both a
missing key and an unexpected one.

### Choices a reviewer should check first

- **`nav_households` → "Hogares"** (not Collect's "Casa"). `hogar` is the
  standard survey term and this audience is administrative, but it is a
  deliberate divergence from Collect and worth a second opinion.
- **"synced" is never "collected".** `sync_ribbon_*`, `context_*`, and
  `coverage_*` say *sincronizado* / *senkronize*. Parse stamps `createdAt` and
  `surveyingUser` when a phone syncs, not when fieldwork happened — sometimes
  days apart, and on a shared phone under whoever was signed in. Translating
  these as "recolectado" / "kolekte" would assert something the data does not
  support. Please preserve the distinction.
- **Accents are correct and intentional** (`á é í ó ú ñ ¿ ¡`, `è ò`). The
  Flask export service strips accents from CSV columns and cell values, so
  `Sí` exports as `Si`. That is a data-fidelity bug in
  `puente-flask-rest-aggregator` with its own release train. Do **not**
  pre-strip accents in these UI files to compensate.
- **Interpolation placeholders** (`{{count}}`, `{{name}}`) are verified
  identical to English by the install script. Keep them exactly as-is.
- `saas-landing` is generic SaaS marketing boilerplate inherited with the
  template ("Amazing company deserve amazing software", `$24/user/month`). It
  was translated faithfully, but the underlying English is not Puente's voice
  and arguably should be rewritten or deleted rather than translated.

## The parity gate

[`__tests__/locales/translations.test.js`](../../__tests__/locales/translations.test.js)
fails the build when any locale in `next-i18next.config.js` is missing any key
the default locale defines, in any namespace. **There is no allowlist.** A
locale ships complete or it does not ship.

This is what stops the next 47-key drift: adding a key to
`public/locales/eng/common.json` without adding it to `spa` and `hat` turns CI
red in the same commit, naming every missing key per locale.

## Known follow-up: there is no language switcher

Manage has no UI for changing language. Locale is reachable only by URL path
(`/spa/quick-start`) or browser auto-detect, so a program manager cannot choose
Spanish from inside the app. Collect solves this with a `LanguagePicker` in
Settings; Manage needs an equivalent. That is a UI surface requiring the design
gate, tracked separately from this work.
