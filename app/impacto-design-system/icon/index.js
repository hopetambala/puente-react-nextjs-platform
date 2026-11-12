import classNames from 'classnames';
import PropTypes from 'prop-types';

import styles from './css/icon.module.css';

/**
 * The design system's own icon set: only the glyphs the app uses, drawn as
 * strokes on a 24-unit grid. It replaces a registry of 170 Material-UI icon
 * imports. Icons are decorative: they inherit the text colour
 * (`currentColor`) and are hidden from screen readers, so the control they
 * sit in carries the name.
 */
const PATHS = {
  add: 'M12 5v14M5 12h14',
  arrowDropDown: 'M7 10l5 5 5-5',
  arrowDropUp: 'M7 14l5-5 5 5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  delete: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  dragIndicator: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  menu: 'M4 6h16M4 12h16M4 18h16',
};

export const ICON_NAMES = Object.keys(PATHS);

const Icon = ({ name, className, size }) => (
  <svg
    className={classNames(styles.icon, styles[size], className)}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path d={PATHS[name]} />
  </svg>
);

Icon.propTypes = {
  className: PropTypes.string,
  /** One of ICON_NAMES. */
  name: PropTypes.oneOf(ICON_NAMES).isRequired,
  /** tiny 16px, small 20px, medium 24px, large 32px. */
  size: PropTypes.oneOf(['tiny', 'small', 'medium', 'large']),
};

Icon.defaultProps = {
  className: undefined,
  size: 'medium',
};

export default Icon;
