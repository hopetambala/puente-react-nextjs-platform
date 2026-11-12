import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';

// Imported from the concrete modules, not the barrel: Modal is itself exported
// from app/impacto-design-system, so importing the barrel here made the package
// index depend on itself.
import Button from '../button';
import useModalDialog from '../dialog/useModalDialog';
import styles from './modal.module.css';

/**
 * A confirmation dialog: one question, one action, and a way out.
 *
 * Built on the native <dialog> (dialog/useModalDialog.js): the page behind is
 * inert, Esc and the backdrop close it, focus returns to whatever opened it,
 * and the question is the dialog's accessible name. Centred on wide screens,
 * a bottom sheet on phones so the buttons sit within thumb reach.
 */
function Modal({
  open, handleClose, text, action, actionText, intent,
}) {
  const { t } = useTranslation('common');
  const ref = useModalDialog(open, handleClose);

  return (
    // Named by its question via aria-label rather than aria-labelledby: React 17
    // has no useId, and an id built from a counter differs between the server
    // and the client render.
    <dialog ref={ref} className={styles.dialog} aria-label={text}>
      <div className={styles.content}>
        <h2 className={styles.title}>{text}</h2>
        <div className={styles.actions}>
          <Button text={t('action_cancel')} onClick={handleClose} />
          <Button intent={intent} onClick={action} text={actionText} />
        </div>
      </div>
    </dialog>
  );
}

Modal.defaultProps = {
  intent: 'primary',
};

Modal.propTypes = {
  /** What runs when the action button is pressed. */
  action: PropTypes.func.isRequired,
  /** The action button's label: say what happens ("Delete form"). */
  actionText: PropTypes.string.isRequired,
  /** Called on every way of closing: Cancel, Esc, the backdrop. */
  handleClose: PropTypes.func.isRequired,
  intent: PropTypes.oneOf(['primary', 'danger']),
  open: PropTypes.bool.isRequired,
  /** The question. Also the dialog's accessible name. */
  text: PropTypes.string.isRequired,
};

export default Modal;
