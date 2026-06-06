import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './css/segmented-control.module.css';

const SegmentedControl = ({ options, value, onChange }) => (
  <div className={styles.root}>
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        className={classNames(styles.btn, { [styles.active]: opt.value === value })}
        onClick={() => onChange?.(opt.value)}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

SegmentedControl.defaultProps = {
  onChange: undefined,
};

SegmentedControl.propTypes = {
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.shape({ label: PropTypes.string.isRequired, value: PropTypes.string.isRequired }),
  ).isRequired,
  value: PropTypes.string.isRequired,
};

export default SegmentedControl;
