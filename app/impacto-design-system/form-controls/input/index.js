import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';

import styles from './index.module.scss';

/**
 * A text field for react-hook-form: a visible <label> tied to a native <input>,
 * with its error announced and linked (WCAG 1.3.1, 3.3.1, 3.3.2, 4.1.2).
 *
 * Replaces a Material-UI TextField. An error message from `errorMessage` or
 * from react-hook-form's `errors` (passed as `errorobj`) sets aria-invalid and
 * is the field's description, so a screen reader reads it with the field.
 * `required` is aria-required, not the HTML attribute, so the browser's own
 * validation bubbles don't fight the form's Yup messages.
 */
function FormInput({
  id, name, label, required, errorobj, errorMessage, type, autoComplete, ...rest
}) {
  const { register } = useFormContext();
  const fieldId = id || `field-${name}`;
  const message = errorMessage || errorobj?.[name]?.message || '';
  const messageId = `${fieldId}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={fieldId} className={styles.label}>
        {label}
        {required && <span className={styles.required} aria-hidden="true"> *</span>}
      </label>
      <input
        {...rest}
        id={fieldId}
        name={name}
        ref={register}
        type={type}
        autoComplete={autoComplete}
        aria-required={required || undefined}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={styles.input}
      />
      {message && <p id={messageId} className={styles.error}>{message}</p>}
    </div>
  );
}

FormInput.propTypes = {
  /** The autocomplete token (username, current-password, email…): WCAG 1.3.5. */
  autoComplete: PropTypes.string,
  /** An error to show regardless of react-hook-form's state. */
  errorMessage: PropTypes.string,
  /** react-hook-form's `errors`; the field's own entry is shown. */
  errorobj: PropTypes.shape({}),
  id: PropTypes.string,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  required: PropTypes.bool,
  type: PropTypes.string,
};

FormInput.defaultProps = {
  autoComplete: undefined,
  errorMessage: '',
  errorobj: undefined,
  id: undefined,
  required: false,
  type: 'text',
};

export default FormInput;
