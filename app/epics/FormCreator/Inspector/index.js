import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';

import { toFormikKey } from '../_utils';
import styles from './index.module.css';

function Inspector({ block, onChange, onClose }) {
  const { t } = useTranslation('common');
  if (!block) return null;

  const {
    label = '',
    formikKey = '',
    required = false,
    allowOther = false,
    multiSelect = false,
    options = [],
  } = block;

  const update = (patch) => onChange({ ...block, ...patch });

  return (
    <div className={styles.inspector}>
      <div className={styles.head}>
        <div>
          <div className={styles.eyebrow}>{t('inspector_editing')}</div>
          <div className={styles.title}>{t('inspector_block_props')}</div>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          data-testid="inspector-close"
          onClick={onClose}
          aria-label="Close inspector"
        >
          ✕
        </button>
      </div>

      <div className={styles.body}>
        {/* Label */}
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="inspector-label">
            {t('inspector_label')}
          </label>
          <input
            id="inspector-label"
            type="text"
            className={styles.textInput}
            value={label}
            onChange={(e) => {
              const newLabel = e.target.value;
              update({ label: newLabel, formikKey: toFormikKey(newLabel) });
            }}
          />
        </div>

        {/* formikKey — read-only mono */}
        <div className={styles.field}>
          <div className={styles.fieldLabel}>{t('inspector_formik_key')}</div>
          <div
            className={styles.monoField}
            data-testid="inspector-formik-key"
          >
            {formikKey}
          </div>
        </div>

        {/* Toggles */}
        <div className={styles.toggles}>
          <Toggle
            id="toggle-required"
            label={t('inspector_required')}
            checked={required}
            onChange={(v) => update({ required: v })}
          />
          <Toggle
            id="toggle-allow-other"
            label={t('inspector_allow_other')}
            checked={allowOther}
            onChange={(v) => update({ allowOther: v })}
          />
          <Toggle
            id="toggle-multi-select"
            label={t('inspector_multi_select')}
            checked={multiSelect}
            onChange={(v) => update({ multiSelect: v })}
          />
        </div>

        {/* Options list */}
        {options.length > 0 && (
          <div>
            <div className={styles.sectionHead}>
              <span>{t('inspector_options')}</span>
              <span>{options.length} items</span>
            </div>
            <div className={styles.options}>
              {options.map((opt) => {
                const isObj = typeof opt === 'object' && opt !== null;
                const label = isObj ? opt.label : opt;
                const key = isObj ? (opt.id ?? opt.label) : opt;
                return (
                  <div key={key} className={styles.optionRow}>
                    <span className={styles.grip} aria-hidden="true">⋮⋮</span>
                    <span>{label}</span>
                  </div>
                );
              })}
              {allowOther && (
                <div className={styles.optionRow}>
                  <span className={styles.grip} aria-hidden="true">⋮⋮</span>
                  <span>Other (with text)</span>
                  <span className={styles.otherChip}>__KEY__OTHER</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hint */}
        <div className={styles.hint} data-testid="inspector-hint">
          <strong>{t('inspector_schema_hint')}</strong>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  id, label, checked, onChange,
}) {
  return (
    <div className={styles.toggle}>
      <label className={styles.toggleLabel} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="checkbox"
        className={styles.toggleCheckbox}
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <span
        className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
        onClick={() => onChange(!checked)}
        aria-hidden="true"
      />
    </div>
  );
}

Toggle.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

Inspector.defaultProps = {
  block: null,
  onChange: () => {},
  onClose: () => {},
};

Inspector.propTypes = {
  block: PropTypes.shape({
    id: PropTypes.string,
    formikKey: PropTypes.string,
    label: PropTypes.string,
    fieldType: PropTypes.string,
    required: PropTypes.bool,
    allowOther: PropTypes.bool,
    multiSelect: PropTypes.bool,
    options: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          id: PropTypes.string,
          label: PropTypes.string,
          value: PropTypes.string,
        }),
      ]),
    ),
  }),
  onChange: PropTypes.func,
  onClose: PropTypes.func,
};

export default Inspector;
