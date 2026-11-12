import { retrieveSignOutFunction } from 'app/modules/user';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';

import styles from './AppShell.module.css';

// Each item is labelled with its destination page's own title key, so the nav,
// the breadcrumb and the page's h1 always say the same thing (design review X6:
// "Review" led to "Dashboard", "Clean" to "Data Curation"...).
const NAV_GROUPS = [
  {
    key: 'workspace',
    labelKey: 'nav_group_workspace',
    items: [
      { id: 'forms', labelKey: 'page_form_manager_title', icon: '⊟', href: '/forms/form-manager' },
      { id: 'form-creator', labelKey: 'form_creator_title', icon: '✦', href: '/forms/form-creator' },
      { id: 'data', labelKey: 'nav_data_curation', icon: '⊞', href: '/data/data-curation' },
      { id: 'marketplace', labelKey: 'page_form_marketplace_title', icon: '◇', href: '/forms/form-marketplace' },
    ],
  },
  {
    key: 'org',
    labelKey: 'nav_group_org',
    items: [
      { id: 'dashboard', labelKey: 'breadcrumb_dashboard', icon: '◧', href: '/quick-start' },
      { id: 'settings', labelKey: 'account_settings_title', icon: '◌', href: '/account/management' },
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

      {/* Only sign-out down here. An "Account" link used to sit beside it and
          open the same page as Account Settings above. */}
      <div className={styles.navBottom}>
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
  activeRoute: null,
  onClose: null,
  orgName: null,
};

Sidebar.propTypes = {
  activeRoute: PropTypes.string,
  /** Set when the sidebar is shown in the drawer: renders a close button. */
  onClose: PropTypes.func,
  orgName: PropTypes.string,
};
