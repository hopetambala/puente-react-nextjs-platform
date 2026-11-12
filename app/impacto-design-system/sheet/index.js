import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';

import useModalDialog from '../dialog/useModalDialog';
import styles from './sheet.module.css';

/**
 * A panel of secondary work over the page: a record's details, an inspector,
 * a preview. From dlite's `lg` breakpoint up it slides in from the inline end;
 * below it, it rises from the bottom and takes the width of the phone.
 *
 * Built on the native <dialog> (dialog/useModalDialog.js): modal, Esc and the
 * backdrop close it, and focus returns to what opened it. Its title is its
 * accessible name and its heading. `footer` stays pinned below the scrolling
 * body, so Save is never under the phone's toolbar.
 */
export default function Sheet({
  open, onClose, title, footer, children,
}) {
  const { t } = useTranslation('common');
  const ref = useModalDialog(open, onClose);

  return (
    <dialog ref={ref} className={styles.sheet} aria-label={title}>
      <div className={styles.frame}>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.close}
            aria-label={t('action_close')}
            onClick={onClose}
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className={styles.closeIcon}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className={styles.body}>{open ? children : null}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </dialog>
  );
}

Sheet.defaultProps = {
  footer: null,
};

Sheet.propTypes = {
  children: PropTypes.node.isRequired,
  /** Pinned actions (Save, Discard). */
  footer: PropTypes.node,
  /** Called on every way of closing: the close button, Esc, the backdrop. */
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  /** Heading and accessible name. */
  title: PropTypes.string.isRequired,
};
