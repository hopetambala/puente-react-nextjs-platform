import { retrieveSignOutFunction } from 'app/modules/user';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';

import styles from './AppShell.module.css';

const NAV_GROUPS = [
  {
    key: 'workspace',
    labelKey: 'nav_group_workspace',
    items: [
      { id: 'forms', labelKey: 'nav_form_manager', icon: '⊟', href: '/forms/form-manager' },
      { id: 'form-creator', labelKey: 'nav_form_creator', icon: '✦', href: '/forms/form-creator' },
      { id: 'data', labelKey: 'nav_data', icon: '⊞', href: '/data/data-curation' },
      { id: 'marketplace', labelKey: 'nav_marketplace', icon: '◇', href: '/forms/form-marketplace' },
    ],
  },
  {
    key: 'org',
    labelKey: 'nav_group_org',
    items: [
      { id: 'dashboard', labelKey: 'nav_dashboard', icon: '◧', href: '/quick-start' },
      { id: 'settings', labelKey: 'nav_settings', icon: '◌', href: '/account/management' },
    ],
  },
];

/**
 * The app's navigation. Rendered docked beside the page on wide screens, and
 * inside the AppShell's modal drawer on narrow ones, where `onClose` adds a
 * close button.
 */
export default function Sidebar({ activeRoute, orgName, onClose }) {
  const { t } = useTranslation('common');
  const router = useRouter();

  const handleLogout = () => {
    retrieveSignOutFunction().then(() => router.push('/account/login'));
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        {/* Brand mark and product name — not copy, never translated. The mark
            repeats the name beside it, so it is hidden from screen readers. */}
        <div className={styles.brandMark} aria-hidden="true">P</div>
        <div className={styles.brandText}>
          <div className={styles.brandName}>Puente</div>
          {orgName && <div className={styles.brandOrg}>{orgName}</div>}
        </div>
        {onClose && (
          <button
            type="button"
            className={styles.drawerClose}
            aria-label={t('nav_close_menu')}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

      <nav className={styles.nav} aria-label={t('nav_main_label')}>
        {NAV_GROUPS.map((group) => {
          const titleId = `nav-group-${group.key}${onClose ? '-drawer' : ''}`;
          return (
            <div key={group.key} className={styles.navGroup}>
              <p id={titleId} className={styles.navGroupTitle}>{t(group.labelKey)}</p>
              <ul className={styles.navList} aria-labelledby={titleId}>
                {group.items.map((item) => {
                  const active = activeRoute === item.id;
                  return (
                    <li key={item.id}>
                      <Link href={item.href} passHref>
                        <a
                          className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                          aria-current={active ? 'page' : undefined}
                        >
                          <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
                          <span>{t(item.labelKey)}</span>
                          {item.live && (
                            <span className={styles.navPulse} title={t('nav_surveyors_active')} />
                          )}
                        </a>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className={styles.navBottom}>
        <Link href="/account/management" passHref>
          <a className={styles.navItem}>
            <span className={styles.navIcon} aria-hidden="true">◉</span>
            <span>{t('nav_account')}</span>
          </a>
        </Link>
        <button
          type="button"
          className={`${styles.navItem} ${styles.navDanger}`}
          onClick={handleLogout}
        >
          <span className={styles.navIcon} aria-hidden="true">→</span>
          <span>{t('nav_logout')}</span>
        </button>
      </div>
    </aside>
  );
}

Sidebar.defaultProps = {
  onClose: null,
  orgName: null,
};

Sidebar.propTypes = {
  activeRoute: PropTypes.string.isRequired,
  /** Set when the sidebar is shown in the drawer: renders a close button. */
  onClose: PropTypes.func,
  orgName: PropTypes.string,
};
