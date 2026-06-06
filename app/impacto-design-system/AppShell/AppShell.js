import { retrieveCurrentUserAsyncFunction } from 'app/modules/user';
import { useRouter } from 'next/router';
import PropTypes from 'prop-types';
import { useLayoutEffect, useState } from 'react';

import styles from './AppShell.module.css';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

function deriveActiveRoute(pathname) {
  if (pathname === '/quick-start') return 'dashboard';
  if (pathname.startsWith('/forms/form-marketplace')) return 'marketplace';
  if (pathname.startsWith('/forms/form-creator')) return 'form-creator';
  if (pathname.startsWith('/forms')) return 'forms';
  if (pathname.startsWith('/data')) return 'data';
  if (pathname.startsWith('/account/management')) return 'settings';
  return 'dashboard';
}

export default function AppShell({
  breadcrumb, topBarActions, fullBleed, children,
}) {
  const { pathname } = useRouter();
  const activeRoute = deriveActiveRoute(pathname);
  const [orgName, setOrgName] = useState(null);

  useLayoutEffect(() => {
    const fetchUser = async () => {
      const user = await retrieveCurrentUserAsyncFunction();
      if (user) setOrgName(user.get('organization') || null);
    };
    fetchUser();
  }, []);

  return (
    <div className={styles.shell}>
      <Sidebar activeRoute={activeRoute} orgName={orgName} />
      <div className={styles.main}>
        <TopBar breadcrumb={breadcrumb} topBarActions={topBarActions} />
        <div className={fullBleed ? styles.pageFullBleed : styles.page}>
          {children}
        </div>
      </div>
    </div>
  );
}

AppShell.defaultProps = {
  fullBleed: false,
  topBarActions: null,
};

AppShell.propTypes = {
  breadcrumb: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
  fullBleed: PropTypes.bool,
  topBarActions: PropTypes.node,
};
