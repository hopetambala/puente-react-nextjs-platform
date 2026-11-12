import classNames from 'classnames';
import PropTypes from 'prop-types';

import styles from './css/segmented-control.module.css';

/**
 * A row of mutually exclusive choices (a view switch, a filter). Each is a
 * toggle button that says whether it is pressed (WCAG 4.1.2): the selected one
 * was marked by colour alone. The group carries the control's name when given.
 */
const SegmentedControl = ({
  options, value, onChange, label,
}) => (
  <div className={styles.root} role="group" aria-label={label || undefined}>
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        aria-pressed={opt.value === value}
        className={classNames(styles.btn, { [styles.active]: opt.value === value })}
        onClick={() => onChange?.(opt.value)}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

SegmentedControl.defaultProps = {
  label: null,
  onChange: undefined,
};

SegmentedControl.propTypes = {
  /** What is being chosen ("Status"). Names the group for screen readers. */
  label: PropTypes.string,
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.shape({ label: PropTypes.string.isRequired, value: PropTypes.string.isRequired }),
  ).isRequired,
  value: PropTypes.string.isRequired,
};

export default SegmentedControl;
