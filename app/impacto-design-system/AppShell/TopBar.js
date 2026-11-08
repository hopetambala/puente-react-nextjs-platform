import { retrieveCurrentUserAsyncFunction } from 'app/modules/user';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import styles from './AppShell.module.css';

/** The id of the AppShell's nav drawer, which the menu button controls. */
export const NAV_DRAWER_ID = 'app-nav-drawer';

function initials(user) {
  if (!user) return '?';
  const first = user.get ? user.get('firstname') : user.firstname;
  const last = user.get ? user.get('lastname') : user.lastname;
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first[0].toUpperCase();
  return '?';
}

export default function TopBar({
  breadcrumb, topBarActions, navOpen, onOpenNav,
}) {
  const { t } = useTranslation('common');
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const currentUser = retrieveCurrentUserAsyncFunction();
    if (currentUser) setUser(currentUser);
  }, []);

  return (
    <header className={styles.topbar}>
      {onOpenNav && (
        <button
          type="button"
          className={styles.menuButton}
          aria-label={t('nav_open_menu')}
          aria-expanded={navOpen}
          aria-controls={NAV_DRAWER_ID}
          onClick={onOpenNav}
        >
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className={styles.menuIcon}>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
      <nav className={styles.breadcrumb} aria-label={t('breadcrumb_label')}>
        <ol className={styles.crumbs}>
          {breadcrumb.map((crumb, i) => {
            const current = i === breadcrumb.length - 1;
            return (
              <li
                key={`${i}-${crumb}`}
                className={current ? styles.crumbCurrent : undefined}
                aria-current={current ? 'page' : undefined}
              >
                {crumb}
              </li>
            );
          })}
        </ol>
      </nav>
      <div className={styles.topbarActions}>
        {topBarActions}
        {/* The name is the visible initials plus the hidden purpose ("AE
            Account settings"), so what's on screen is part of what a voice
            user says to press it (WCAG 2.5.3, label in name). */}
        <button
          type="button"
          className={styles.avatar}
          onClick={() => router.push('/account/management')}
        >
          <span>{initials(user)}</span>
          <span className="sr-only">{` ${t('topbar_account_settings')}`}</span>
        </button>
      </div>
    </header>
  );
}

TopBar.defaultProps = {
  navOpen: false,
  onOpenNav: null,
  topBarActions: null,
};

TopBar.propTypes = {
  breadcrumb: PropTypes.arrayOf(PropTypes.string).isRequired,
  /** Whether the nav drawer this bar's menu button controls is open. */
  navOpen: PropTypes.bool,
  /** Opens the nav drawer. Without it there is no menu button. */
  onOpenNav: PropTypes.func,
  topBarActions: PropTypes.node,
};
