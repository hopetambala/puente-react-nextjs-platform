import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './css/badge.module.css';

const Badge = ({ children, variant, dot }) => (
  <span className={classNames(styles.badge, styles[variant])}>
    {dot && <span className={styles.dot} />}
    {children}
  </span>
);

Badge.defaultProps = {
  dot: false,
  variant: 'blue',
};

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  dot: PropTypes.bool,
  variant: PropTypes.oneOf(['green', 'yellow', 'orange', 'blue', 'red', 'purple']),
};

export default Badge;
