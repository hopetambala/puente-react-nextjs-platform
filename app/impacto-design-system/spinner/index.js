import classNames from 'classnames';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';

import styles from './css/spinner.module.css';

/**
 * A loading indicator. On its own it is a status that says "Loading" in the
 * reader's language (it was an unnamed progressbar with English
 * aria-valuetext). Inside a busy control, pass `isDecorative`: the control's
 * aria-busy already says it.
 */
const Spinner = ({ isSmall, isDecorative, label }) => {
  const { t } = useTranslation('common');
  const svg = (
    <svg
      className={classNames(styles.spinner, { [styles.smallModifier]: isSmall })}
      aria-hidden="true"
      focusable="false"
    >
      <circle width="100%" height="100%" cx="50%" cy="50%" r="42.5%" />
    </svg>
  );

  if (isDecorative) return svg;
  return (
    <span role="status" className={styles.wrapper}>
      {svg}
      <span className="sr-only">{label || t('status_loading')}</span>
    </span>
  );
};

Spinner.propTypes = {
  /** Hide it from screen readers: the surrounding control announces the wait. */
  isDecorative: PropTypes.bool,
  isSmall: PropTypes.bool,
  /** What is loading, if more useful than "Loading". */
  label: PropTypes.string,
};

Spinner.defaultProps = {
  isDecorative: false,
  isSmall: false,
  label: null,
};

export default Spinner;
