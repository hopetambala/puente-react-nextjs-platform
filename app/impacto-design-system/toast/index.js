import classNames from 'classnames';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';

import Text from '../text';
import styles from './css/toast.module.css';

function Toast({
  isError,
  isWarning,
  isSuccess,
  text,
  shouldHideDismissButton,
  closeToast,
  isQueued,
}) {
  const { t } = useTranslation('common');

  // Shown inline (not through toast()), the toast is its own live region so
  // it is still announced: an alert for errors, a status otherwise. Queued
  // toasts sit inside ToastRegion's regions and must not nest another.
  let role;
  if (!isQueued) role = isError ? 'alert' : 'status';

  return (
    <div
      role={role}
      className={classNames(styles.toast, {
        [styles.error]: isError,
        [styles.warning]: isWarning,
        [styles.success]: isSuccess,
      })}
    >
      <div className={styles.message}>
        <Text text={text} />
      </div>
      {!shouldHideDismissButton && closeToast && (
        <button className={styles.action} onClick={closeToast} type="button">
          {t('action_dismiss')}
        </button>
      )}
    </div>
  );
}

Toast.propTypes = {
  /** Closes the toast. Without it there is no Dismiss button. */
  closeToast: PropTypes.func,
  /** A red toast, announced assertively. Errors are never auto-dismissed. */
  isError: PropTypes.bool,
  /** Set by ToastRegion: the toast is inside a live region already. */
  isQueued: PropTypes.bool,
  /** A green toast. */
  isSuccess: PropTypes.bool,
  /** A yellow toast. */
  isWarning: PropTypes.bool,
  /** When true, no Dismiss button even if closeToast is given. */
  shouldHideDismissButton: PropTypes.bool,
  /** The message. */
  text: PropTypes.string.isRequired,
};

Toast.defaultProps = {
  isError: false,
  isWarning: false,
  isSuccess: false,
  shouldHideDismissButton: false,
  closeToast: null,
  isQueued: false,
};

export default Toast;
