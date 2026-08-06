import { retrieveCurrentUserAsyncFunction } from 'app/modules/user';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

import styles from './AppShell.module.css';

function initials(user) {
  if (!user) return '?';
  const first = user.get ? user.get('firstname') : user.firstname;
  const last = user.get ? user.get('lastname') : user.lastname;
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first[0].toUpperCase();
  return '?';
}

export default function TopBar({ breadcrumb, topBarActions, onAssistantOpen }) {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const { t } = useTranslation('common');

  useEffect(() => {
    const user = retrieveCurrentUserAsyncFunction();
    if (user) setUser(user);
  }, []);

  return (
    <header className={styles.topbar}>
      <div className={styles.breadcrumb}>
        {breadcrumb.map((crumb, i) => (
          <React.Fragment key={`${i}-${crumb}`}>
            <span className={i === breadcrumb.length - 1 ? styles.crumbCurrent : ''}>
              {crumb}
            </span>
            {i < breadcrumb.length - 1 && <span className={styles.crumbSep}>/</span>}
          </React.Fragment>
        ))}
      </div>
      <div className={styles.topbarActions}>
        {topBarActions}
        {onAssistantOpen && (
          <button
            type="button"
            className={styles.assistantButton}
            aria-label={t('assistant_open')}
            onClick={onAssistantOpen}
          >
            ✦
          </button>
        )}
        <button
          type="button"
          className={styles.avatar}
          aria-label="Account settings"
          onClick={() => router.push('/account/management')}
        >
          {initials(user)}
        </button>
      </div>
    </header>
  );
}

TopBar.defaultProps = {
  topBarActions: null,
  onAssistantOpen: null,
};

TopBar.propTypes = {
  breadcrumb: PropTypes.arrayOf(PropTypes.string).isRequired,
  topBarActions: PropTypes.node,
  onAssistantOpen: PropTypes.func,
};
