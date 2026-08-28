# Languages in Puente

## Supported languages — the canonical list

**Puente supports exactly three languages: English, Spanish, and Haitian
Creole.** Nothing else. This is a product decision driven by where the work
happens — the field operation is in the Dominican Republic, serving Dominican
and Haitian communities.

| Language | Manage (this repo) | Collect (mobile) |
| --- | --- | --- |
| English *(default)* | `eng` | `en` |
| Spanish | `spa` | `es` |
| Haitian Creole | `hat` | `hk` |

The two apps use different code schemes for the same three languages — Manage
uses ISO 639-2/T three-letter codes, Collect uses two-letter. That is a
historical difference, not a meaningful one; do not "fix" either to match the
other without checking every consumer.

**English is `defaultLocale`.** It is the source catalog every other locale is
compared against by the parity gate, and it is not removable.

**Adding or removing a language is a deliberate change to both repos and to
this file** — not a one-line edit to `next-i18next.config.js`. Two tests
enforce that:

- `Supported languages` in `__tests__/locales/translations.test.js` asserts the
  set is exactly `eng`/`spa`/`hat`, in the config *and* on disk. A locale added
  back by accident fails the build even if fully translated.
- `Locale parity` in the same file asserts every shipped locale defines every
  key English defines. No allowlist.

### Why this is written down twice

Manage previously shipped `ara`, `deu`, `ind`, `prt`, `zho` — Next.js template
leftovers nobody supported. They sat 47 keys behind English from June to August
2026 and nobody noticed, because with no `fallbackLng` a missing key renders
the English string rather than a raw key name. The failure was invisible by
construction. Prose alone did not prevent it; the test is what makes it
unforgettable, and this section is what explains the test.

## What shipped

Manage now ships **English (`eng`), Spanish (`spa`), and Haitian Creole
(`hat`)** — 166 keys each, at enforced parity.

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
Collect. Only 19 of 166 (11%) of Manage's English strings appear in Collect's
601-key corpus. Collect's vocabulary is field data entry — forms, vitals,
households, offline sync. Manage's is dashboards, triage, curation, export. The
overlap is greetings and buttons.

## Reviewing

[`review-worksheet.csv`](./review-worksheet.csv) — 166 rows, English alongside
both translations, with a `reviewed_by` column and a `notes` column flagging
the 19 strings where Collect already has a human translation of the same
English.

Corrections go directly into `public/locales/<locale>/<namespace>.json`. Change
values, never keys: renaming a key makes it *missing* as far as the gate is
concerned, and the build fails naming it. (The gate checks only for keys the
default locale defines. A leftover key that English no longer has is **not**
detected — see the open item at the end of this file.)

Interpolation placeholders (`{{count}}`, `{{name}}`) are enforced: a
translation that drops or renames one fails the build even though the key
exists, because i18next would otherwise render a sentence with the number
missing, or the literal text `{{nombre}}`.

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

## The language switcher

Manage now has one, in two places:

- **The login page**, beneath the sign-in card. This is the one that matters.
  Settings sits behind *both* authentication and English, so someone who cannot
  read the login screen cannot navigate to Settings to change it. Collect does
  not have this problem — `expo-localization` reads the device locale, making
  its picker a correction rather than the entry path. Manage's only equivalent
  signal is `Accept-Language`, and on a shared field-office machine configured
  in English that is simply wrong, with no recovery.
- **Settings** (`/account/management`), the durable home, matching Collect's
  mental model. It sits outside the profile form on purpose: that form is
  yup-validated, submits, re-authenticates and redirects, and language is not a
  `_User` field.

Deliberately **not** in the TopBar. It is a set-once control, so permanent
chrome directly above the data table is the wrong trade — and being inside
`AppShell` it is behind authentication anyway, so it would not have solved the
problem it exists for.

The choice persists in the `NEXT_LOCALE` cookie, which Next.js reads ahead of
`Accept-Language`. Without it the choice survives exactly one navigation.

## Open items

- **No unexpected-key detection.** The gate finds keys English defines that a
  locale lacks. It does not find the reverse: a key left behind in a locale
  after English dropped it. The retired `deu` catalog had exactly this — a
  `zurück` key holding a translation nothing could read. Collect's checker has
  an `--orphans` mode; Manage's does not yet.
- **No RTL locale ships.** `ara` was the only one and it was retired, so the
  right-to-left path is now unexercised. Keep using logical properties
  (`margin-inline-start`, `text-align: start`) as cheap insurance.
