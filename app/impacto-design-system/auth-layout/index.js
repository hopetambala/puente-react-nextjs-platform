import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';

import styles from './auth-layout.module.css';

/**
 * The frame every signed-out page shares: login, register, reset, reset-login,
 * verify and verify/redirect. It replaces four copies of the same two-column
 * markup and the bare Page wrapper.
 *
 * From dlite's md breakpoint up, the dark brand column sits beside the form;
 * below it, the brand shrinks to a bar above the form so the form gets the
 * phone's full width (the 1fr 1fr grid left it ~150px at 375). Every width
 * has a skip link, a <main> and the page's own <title> (WCAG 2.4.1, 2.4.2).
 */
export default function AuthLayout({
  title, tagline, footer, children,
}) {
  const { t } = useTranslation('common');

  return (
    <div className={styles.layout}>
      <Head>
        <title>{`${title} · Puente`}</title>
      </Head>
      <a href="#main" className={styles.skipLink}>{t('skip_to_content')}</a>

      <aside className={styles.brand} data-testid="auth-brand">
        {/* Brand mark and product name: not copy, never translated. The mark
            repeats the name, so it is hidden from screen readers. */}
        <div className={styles.brandRow}>
          <div className={styles.brandMark} aria-hidden="true">P</div>
          <span className={styles.brandName}>Puente</span>
        </div>
        {tagline && <p className={styles.tagline}>{tagline}</p>}
        {footer && <div className={styles.brandFooter}>{footer}</div>}
      </aside>

      <main id="main" className={styles.main} data-testid="auth-form">
        <div className={styles.card}>{children}</div>
      </main>
    </div>
  );
}

AuthLayout.propTypes = {
  /** The form card: the page's h1 and its content. */
  children: PropTypes.node.isRequired,
  /** Small print at the foot of the brand column (version, licence). */
  footer: PropTypes.node,
  /** One line of product copy for the brand column, already translated. */
  tagline: PropTypes.string,
  /** The document title, before " · Puente". */
  title: PropTypes.string.isRequired,
};

AuthLayout.defaultProps = {
  footer: null,
  tagline: null,
};
