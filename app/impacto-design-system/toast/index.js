import classNames from 'classnames';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';
import React from 'react';

import Text from '../text';
import styles from './css/toast.module.css';

// const AUTO_DISMISS_DURATION_IN_MS = 4000;

const Toast = ({
  // duration,
  // id,
  isError,
  isWarning,
  isSuccess,
  text,
  shouldHideDismissButton,
  closeToast,
}) => {
  const { t } = useTranslation('common');

  return (
    <div
      className={classNames(styles.toast, {
        [styles.error]: isError,
        [styles.warning]: isWarning,
        [styles.success]: isSuccess,
      })}
    >
      <div className={styles.message}>
        <Text text={text} />
      </div>
      {!shouldHideDismissButton && (
        // The button is labelled: <Text> renders the dismiss word as the
        // button's text content. jsx-a11y cannot follow a label passed through
        // a component prop rather than as children, so it reports a false
        // positive. Adding an aria-label here would duplicate a control that
        // already has a visible, translated one.
        // eslint-disable-next-line jsx-a11y/control-has-associated-label
        <button className={styles.action} onClick={closeToast} type="button">
          <Text text={t('action_dismiss')} />
        </button>
      )}
    </div>
  );
};

Toast.propTypes = {
  /** Auto-dismiss duration in ms. When set to `null`, Toast will not auto-dismiss.
   * @default 4000
   */
  // duration: PropTypes.number,

  /** Icon to display. */
  //  icon?: IconName;

  /** A unique ID to identify the toast. This is used to dismiss the appropriate toast on click.
    * It gets set automatically, but if you want a particular toast to _not_ be duplicated, you
    * can pass it a custom ID so that when it re-renders, it will replace any existing toasts
    * with the same ID.
    */
  // id: PropTypes.string,

  /** When true, displays a red toast. */
  isError: PropTypes.bool,

  /** When true, displays a yellow toast. */
  isWarning: PropTypes.bool,

  /** When true, displays a green toast. */
  isSuccess: PropTypes.bool,

  /** The primary message to render within the toast. */
  text: PropTypes.string.isRequired,

  /** When true, do not display 'Dismiss' button on toast. */
  shouldHideDismissButton: PropTypes.bool,

  /** Closes the toast */
  closeToast: PropTypes.func,
};

Toast.defaultProps = {
  isError: false,
  isWarning: false,
  isSuccess: false,
  shouldHideDismissButton: false,
};

export default Toast;
