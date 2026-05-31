import { retrieveCurrentUserAsyncFunction } from 'app/modules/user';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

import styles from './AppShell.module.css';

function initials(user) {
  if (!user) return '?';
  const first = user.get ? user.get('firstName') : user.firstName;
  const last = user.get ? user.get('lastName') : user.lastName;
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first[0].toUpperCase();
  return '?';
}

export default function TopBar({ breadcrumb, topBarActions }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const user = retrieveCurrentUserAsyncFunction();
    if (user) setUser(user);
  }, []);

  return (
    <header className={styles.topbar}>
      <div className={styles.breadcrumb}>
        {breadcrumb.map((crumb, i) => (
          <React.Fragment key={crumb}>
            <span className={i === breadcrumb.length - 1 ? styles.crumbCurrent : ''}>
              {crumb}
            </span>
            {i < breadcrumb.length - 1 && <span className={styles.crumbSep}>/</span>}
          </React.Fragment>
        ))}
      </div>
      <div className={styles.topbarActions}>
        {topBarActions}
        <div className={styles.avatar}>{initials(user)}</div>
      </div>
    </header>
  );
}

TopBar.defaultProps = {
  topBarActions: null,
};

TopBar.propTypes = {
  breadcrumb: PropTypes.arrayOf(PropTypes.string).isRequired,
  topBarActions: PropTypes.node,
};
