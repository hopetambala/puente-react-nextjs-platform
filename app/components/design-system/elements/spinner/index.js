import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './css/spinner.module.css';

const Spinner = ({ isSmall }) => {
  const className = classNames(styles.spinner, {
    [styles.smallModifier]: isSmall,
  });

  return (
    <svg className={className} role="progressbar" aria-valuetext="Loading…">
      <circle width="100%" height="100%" cx="50%" cy="50%" r="42.5%" />
    </svg>
  );
};

Spinner.propTypes = {
  isSmall: PropTypes.bool,
};

Spinner.defaultProps = {
  isSmall: false,
};

export default Spinner;
