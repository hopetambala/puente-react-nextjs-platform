import classNames from 'classnames';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './css/language-switcher.module.css';

/**
 * The three languages Puente supports.
 *
 * `endonym` — each language written in ITS OWN language, never translated.
 * Someone who cannot read the current UI language must still recognise their
 * own; rendering "Spanish" in English fails exactly the person this control
 * exists for. No flags either: flags are countries, not languages, and for a
 * Haitian person in the DR any flag choice for Creole carries meaning we have
 * no business asserting.
 *
 * `locale` — Manage's ISO 639-2/T code, matching next-i18next.config.js.
 * `bcp47`  — what the HTML `lang` attribute requires, which is the SHORTEST
 *            available ISO 639 code. "spa"/"hat" are invalid there because
 *            "es"/"ht" exist, and a screen reader given an invalid tag will
 *            not switch pronunciation for the option.
 *
 * This list is duplicated from next-i18next.config.js rather than imported:
 * that config `require`s Node's `path`, so importing it into a client
 * component would pull it into the browser bundle. The duplication is held
 * honest by a test asserting this list equals `i18n.locales`.
 */
const LANGUAGES = [
  { locale: 'eng', bcp47: 'en', endonym: 'English' },
  { locale: 'spa', bcp47: 'es', endonym: 'Español' },
  { locale: 'hat', bcp47: 'ht', endonym: 'Kreyòl Ayisyen' },
];

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const LanguageSwitcher = ({ className }) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { asPath, locale: activeLocale } = router;

  const chooseLanguage = (locale) => {
    // Next.js reads NEXT_LOCALE ahead of the Accept-Language header. Without
    // it the choice survives exactly one navigation before locale detection
    // sends the user back to their browser's language — which, on a shared
    // field-office machine configured in English, is the whole problem.
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    // Safe while every route is static. If a dynamic route is ever added,
    // this needs `router.push({ pathname, query }, asPath, { locale })` —
    // asPath carries resolved params and would not match the route pattern.
    router.push(asPath, asPath, { locale });
  };

  return (
    <div className={classNames(styles.root, className)}>
      {/* Visual label only. The group below carries the accessible name, so
          screen readers announce it once rather than twice. */}
      <span className={styles.label} aria-hidden="true">
        {t('language')}
      </span>
      {/* aria-label, not aria-labelledby: this renders on more than one page
          and React 17 has no useId, so a hardcoded id could collide. */}
      <div className={styles.options} role="group" aria-label={t('language')}>
        {LANGUAGES.map(({ locale, bcp47, endonym }) => {
          const isActive = locale === activeLocale;
          return (
            <button
              key={locale}
              type="button"
              lang={bcp47}
              data-locale={locale}
              className={classNames(styles.option, { [styles.optionActive]: isActive })}
              // aria-current, not colour alone — the active choice has to be
              // announced, and legible without colour.
              aria-current={isActive ? 'true' : undefined}
              onClick={() => chooseLanguage(locale)}
            >
              {endonym}
            </button>
          );
        })}
      </div>
    </div>
  );
};

LanguageSwitcher.defaultProps = {
  className: undefined,
};

LanguageSwitcher.propTypes = {
  className: PropTypes.string,
};

export default LanguageSwitcher;
