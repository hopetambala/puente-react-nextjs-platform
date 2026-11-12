import { retrieveCurrentUserAsyncFunction } from 'app/modules/user';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';
import {
  useCallback, useEffect, useLayoutEffect, useState,
} from 'react';
import breakpoints from 'style-dictionary-dlite-tokens/web/breakpoints.json';

import useModalDialog from '../dialog/useModalDialog';
import styles from './AppShell.module.css';
import Sidebar from './Sidebar';
import TopBar, { NAV_DRAWER_ID } from './TopBar';

/**
 * The nav item for the current page, or null when the page isn't in the nav
 * (billing, organization admin, data analysis). Those used to fall through to
 * the dashboard or to Data Curation, marking the wrong place as current.
 */
function deriveActiveRoute(pathname) {
  if (pathname === '/quick-start') return 'dashboard';
  if (pathname.startsWith('/forms/form-marketplace')) return 'marketplace';
  if (pathname.startsWith('/forms/form-creator')) return 'form-creator';
  if (pathname.startsWith('/forms/form-manager')) return 'forms';
  if (pathname.startsWith('/data/data-curation')) return 'data';
  if (pathname.startsWith('/account/management')) return 'settings';
  return null;
}

/**
 * The signed-in app frame: sidebar navigation, top bar, and the page's <main>.
 *
 * From dlite's `lg` breakpoint up, the sidebar is docked. Below it, the shell
 * is a single column and the same navigation opens as a modal drawer from the
 * menu button in the top bar, so a phone gets the full width for content.
 */
export default function AppShell({
  breadcrumb, title, topBarActions, fullBleed, children,
}) {
  const { t } = useTranslation('common');
  const { pathname } = useRouter();
  const activeRoute = deriveActiveRoute(pathname);
  const [orgName, setOrgName] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const drawerRef = useModalDialog(navOpen, closeNav);

  useLayoutEffect(() => {
    const fetchUser = async () => {
      const user = await retrieveCurrentUserAsyncFunction();
      if (user) setOrgName(user.get('organization') || null);
    };
    fetchUser();
  }, []);

  // Following a link in the drawer lands on a new page: close it.
  useEffect(() => { setNavOpen(false); }, [pathname]);

  // Widening the window to the docked layout hides the menu button. A drawer
  // left open there would keep the page inert with no visible way out.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const docked = window.matchMedia(`(min-width: ${breakpoints.lg}px)`);
    const onChange = (event) => { if (event.matches) setNavOpen(false); };
    docked.addEventListener('change', onChange);
    return () => docked.removeEventListener('change', onChange);
  }, []);

  // Every page gets its own <title> (WCAG 2.4.2): the explicit title, or the
  // breadcrumb's last crumb, which already names the page.
  const pageTitle = title || breadcrumb[breadcrumb.length - 1];

  return (
    <div className={styles.shell}>
      <Head>
        <title>{pageTitle ? `${pageTitle} · Puente` : 'Puente'}</title>
      </Head>
      <a href="#main" className={styles.skipLink}>{t('skip_to_content')}</a>

      <div className={styles.sidebarDocked}>
        <Sidebar activeRoute={activeRoute} orgName={orgName} />
      </div>

      <dialog
        ref={drawerRef}
        id={NAV_DRAWER_ID}
        className={styles.navDrawer}
        aria-label={t('nav_main_label')}
      >
        {navOpen && <Sidebar activeRoute={activeRoute} orgName={orgName} onClose={closeNav} />}
      </dialog>

      <div className={styles.main}>
        <TopBar
          breadcrumb={breadcrumb}
          topBarActions={topBarActions}
          navOpen={navOpen}
          onOpenNav={() => setNavOpen(true)}
        />
        <main id="main" className={fullBleed ? styles.pageFullBleed : styles.page}>
          {children}
        </main>
      </div>
    </div>
  );
}

AppShell.defaultProps = {
  fullBleed: false,
  title: null,
  topBarActions: null,
};

AppShell.propTypes = {
  breadcrumb: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
  fullBleed: PropTypes.bool,
  /** The document title. Defaults to the last breadcrumb. */
  title: PropTypes.string,
  topBarActions: PropTypes.node,
};
