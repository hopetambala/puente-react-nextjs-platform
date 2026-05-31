import PropTypes from 'prop-types';
import React from 'react';

import styles from './AppShell.module.css';

export default function PageHeader({
  eyebrow, title, sub, actions,
}) {
  return (
    <div className={styles.pageHeader}>
      <div>
        {eyebrow && <div className={styles.pageHeaderEyebrow}>{eyebrow}</div>}
        <h1 className={styles.pageHeaderTitle}>{title}</h1>
        {sub && <p className={styles.pageHeaderSub}>{sub}</p>}
      </div>
      {actions && <div className={styles.pageHeaderActions}>{actions}</div>}
    </div>
  );
}

PageHeader.defaultProps = {
  actions: null,
  eyebrow: null,
  sub: null,
};

PageHeader.propTypes = {
  actions: PropTypes.node,
  eyebrow: PropTypes.string,
  sub: PropTypes.string,
  title: PropTypes.string.isRequired,
};
