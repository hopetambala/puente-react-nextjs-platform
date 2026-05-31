import { retrieveSignOutFunction } from 'app/modules/user';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import PropTypes from 'prop-types';

import styles from './AppShell.module.css';

const NAV_GROUPS = [
  {
    key: 'workspace',
    labelKey: 'Workspace',
    items: [
      { id: 'dashboard', labelKey: 'nav_dashboard', icon: '◧', href: '/quick-start' },
      { id: 'forms', labelKey: 'nav_form_manager', icon: '⊟', href: '/forms/form-manager' },
      { id: 'form-creator', labelKey: 'nav_form_creator', icon: '✦', href: '/forms/form-creator' },
      { id: 'data', labelKey: 'nav_data', icon: '⊞', href: '/data/data-curation' },
      { id: 'marketplace', labelKey: 'nav_marketplace', icon: '◇', href: '/forms/form-marketplace' },
    ],
  },
  {
    key: 'org',
    labelKey: 'Org',
    items: [
      { id: 'settings', labelKey: 'nav_settings', icon: '◌', href: '/account/management' },
    ],
  },
];

export default function Sidebar({ activeRoute, orgName }) {
  const { t } = useTranslation('common');
  const router = useRouter();

  const handleLogout = () => {
    retrieveSignOutFunction().then(() => router.push('/account/login'));
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>P</div>
        <div>
          <div className={styles.brandName}>Puente</div>
          {orgName && <div className={styles.brandOrg}>{orgName}</div>}
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV_GROUPS.map((group) => (
          <div key={group.key} className={styles.navGroup}>
            <div className={styles.navGroupTitle}>{group.labelKey}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${activeRoute === item.id ? styles.navItemActive : ''}`}
                onClick={() => item.href !== '#' && router.push(item.href)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{t(item.labelKey)}</span>
                {item.live && (
                  <span className={styles.navPulse} title="Surveyors active in field" />
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.navBottom}>
        <button
          type="button"
          className={styles.navItem}
          onClick={() => router.push('/account/management')}
        >
          <span className={styles.navIcon}>◉</span>
          <span>{t('nav_account')}</span>
        </button>
        <button
          type="button"
          className={`${styles.navItem} ${styles.navDanger}`}
          onClick={handleLogout}
        >
          <span className={styles.navIcon}>→</span>
          <span>{t('nav_logout')}</span>
        </button>
      </div>
    </aside>
  );
}

Sidebar.defaultProps = {
  orgName: null,
};

Sidebar.propTypes = {
  activeRoute: PropTypes.string.isRequired,
  orgName: PropTypes.string,
};
