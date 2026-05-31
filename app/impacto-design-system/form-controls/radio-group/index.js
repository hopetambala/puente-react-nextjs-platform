import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './css/radio-group.module.css';

const RadioGroup = ({ options, value, onChange }) => (
  <div className={styles.root}>
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          className={classNames(styles.item, { [styles.active]: active })}
          onClick={() => onChange(opt.value)}
        >
          <span className={classNames(styles.radio, { [styles.radioChecked]: active })} />
          <span className={styles.labels}>
            <span className={styles.label}>{opt.label}</span>
            {opt.subLabel && <span className={styles.subLabel}>{opt.subLabel}</span>}
          </span>
        </button>
      );
    })}
  </div>
);

RadioGroup.defaultProps = {
  onChange: undefined,
};

RadioGroup.propTypes = {
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      subLabel: PropTypes.string,
      value: PropTypes.string.isRequired,
    }),
  ).isRequired,
  value: PropTypes.string.isRequired,
};

export default RadioGroup;
