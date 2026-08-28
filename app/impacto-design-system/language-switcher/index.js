import classNames from 'classnames';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './css/language-switcher.module.css';

/**
 * The three languages Puente supports. Each is written in ITS OWN language and
 * is never translated — someone who cannot read the current UI language must
 * still recognise their own. Rendering "Spanish" in English fails exactly the
 * person this control exists for.
 *
 * No flags: flags are countries, not languages. Spanish here is the Dominican
 * Republic, not Spain, and for a Haitian person in the DR any flag choice for
 * Creole carries meaning we have no business asserting.
 *
 * Codes are Manage's ISO 639-2/T set and must match next-i18next.config.js.
 * Collect uses en/es/hk for the same three languages.
 */
const LANGUAGES = [
  { locale: 'eng', endonym: 'English' },
  { locale: 'spa', endonym: 'Español' },
  { locale: 'hat', endonym: 'Kreyòl Ayisyen' },
];

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function LanguageSwitcher({ className }) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { asPath, locale: activeLocale } = router;

  const chooseLanguage = (locale) => {
    // Next.js reads NEXT_LOCALE ahead of the Accept-Language header. Without
    // it the choice survives exactly one navigation before locale detection
    // sends the user back to their browser's language — which, on a shared
    // field-office machine configured in English, is the whole problem.
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    router.push(asPath, asPath, { locale });
  };

  return (
    <div className={classNames(styles.root, className)}>
      <span className={styles.label} id="language-switcher-label">
        {t('language')}
      </span>
      <div className={styles.options} role="group" aria-labelledby="language-switcher-label">
        {LANGUAGES.map(({ locale, endonym }) => {
          const isActive = locale === activeLocale;
          return (
            <button
              key={locale}
              type="button"
              lang={locale}
              className={classNames(styles.option, { [styles.optionActive]: isActive })}
              // aria-current, not colour alone — the active choice has to be
              // announced to a screen reader and legible without colour.
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
}

LanguageSwitcher.defaultProps = {
  className: undefined,
};

LanguageSwitcher.propTypes = {
  className: PropTypes.string,
};

export default LanguageSwitcher;
