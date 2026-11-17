import { myOrganizationAccess } from 'app/modules/cloud-code';
import { retrieveSignOutFunction } from 'app/modules/user';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

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

// Shown only to Puente staff and organization admins, the people
// /organization-admin lets in. Hiding it is a courtesy, not security: the page
// and every endpoint it calls check access themselves.
const ORG_ADMIN_ITEM = {
  id: 'organization-admin', labelKey: 'org_admin_breadcrumb', icon: '▣', href: '/organization-admin',
};

// One server call per session, not one per page: the sidebar remounts on
// every navigation. Cleared on sign-out so the next account asks again.
let organizationAccess = null;
export function resetOrganizationAccessCache() {
  organizationAccess = null;
}
function loadOrganizationAccess() {
  if (!organizationAccess) organizationAccess = myOrganizationAccess();
  return organizationAccess;
}

function useCanAdministerOrganizations() {
  const [canAdminister, setCanAdminister] = useState(false);
  useEffect(() => {
    let cancelled = false;
    // myOrganizationAccess fails closed and never throws.
    loadOrganizationAccess().then(({ isStaff, orgAdminOf }) => {
      if (!cancelled) setCanAdminister(isStaff || orgAdminOf.length > 0);
    });
    return () => { cancelled = true; };
  }, []);
  return canAdminister;
}

export default function Sidebar({ activeRoute, orgName }) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const canAdministerOrganizations = useCanAdministerOrganizations();
  const navGroups = NAV_GROUPS.map((group) => (
    group.key === 'org' && canAdministerOrganizations
      ? { ...group, items: [...group.items, ORG_ADMIN_ITEM] }
      : group
  ));

  const handleLogout = () => {
    resetOrganizationAccessCache();
    retrieveSignOutFunction().then(() => router.push('/account/login'));
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        {/* Brand mark and product name — not copy, never translated. */}
        <div className={styles.brandMark}>P</div>
        <div>
          <div className={styles.brandName}>Puente</div>
          {orgName && <div className={styles.brandOrg}>{orgName}</div>}
        </div>
      </div>

      <nav className={styles.nav}>
        {navGroups.map((group) => (
          <div key={group.key} className={styles.navGroup}>
            <div className={styles.navGroupTitle}>{t(group.labelKey)}</div>
            {group.items.map((item) => (
              <Link key={item.id} href={item.href} passHref>
                <a
                  className={`${styles.navItem} ${activeRoute === item.id ? styles.navItemActive : ''}`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span>{t(item.labelKey)}</span>
                  {item.live && (
                    <span className={styles.navPulse} title={t('nav_surveyors_active')} />
                  )}
                </a>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.navBottom}>
        <Link href="/account/management" passHref>
          <a className={styles.navItem}>
            <span className={styles.navIcon}>◉</span>
            <span>{t('nav_account')}</span>
          </a>
        </Link>
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
