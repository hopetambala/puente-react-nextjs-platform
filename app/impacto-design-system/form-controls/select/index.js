import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';

import inputStyles from '../input/index.module.scss';

/**
 * A choice from a list for react-hook-form: a visible <label> on a native
 * <select>, its error announced and linked, the same as FormInput.
 *
 * Native, not a custom combobox: type-ahead jumps to a name, phones open their
 * own accessible picker, and it works in every browser and screen reader. It
 * replaces a react-select + Material-UI autocomplete whose focused option was
 * invisible to keyboard users and whose error wasn't linked to the field.
 *
 * Each option's `label` is also its submitted value (the organization picker
 * submits the organization's canonical name).
 */
function FormSelect({
  id, name, label, required, errorobj, options, placeholder,
}) {
  const { t } = useTranslation('common');
  const { register } = useFormContext();
  const fieldId = id || `field-${name}`;
  const message = errorobj?.[name]?.message || '';
  const messageId = `${fieldId}-error`;

  return (
    <div className={inputStyles.field}>
      <label htmlFor={fieldId} className={inputStyles.label}>
        {label}
        {required && <span className={inputStyles.required} aria-hidden="true"> *</span>}
      </label>
      <select
        id={fieldId}
        name={name}
        ref={register}
        defaultValue=""
        aria-required={required || undefined}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={inputStyles.input}
      >
        <option value="" disabled>{placeholder || t('select_placeholder')}</option>
        {options.map((option) => (
          <option key={option.id ?? option.label} value={option.label}>{option.label}</option>
        ))}
      </select>
      {message && <p id={messageId} className={inputStyles.error}>{message}</p>}
    </div>
  );
}

FormSelect.propTypes = {
  errorobj: PropTypes.shape({}),
  id: PropTypes.string,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string.isRequired,
  })).isRequired,
  /** The empty first option's text. Defaults to the catalog's "Select…". */
  placeholder: PropTypes.string,
  required: PropTypes.bool,
};

FormSelect.defaultProps = {
  errorobj: undefined,
  id: undefined,
  placeholder: null,
  required: false,
};

export default FormSelect;
