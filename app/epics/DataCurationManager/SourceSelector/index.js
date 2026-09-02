import { useTranslation } from 'next-i18next';
import { Parse } from 'parse';
import { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';

import styles from './index.module.css';

// Value and catalog key only — the label is resolved inside the component, so
// it follows the reader's locale rather than being frozen at import time.
// Each value names the Parse class the source reads from: `survey-data` is
// SurveyData, which holds people despite its name.
const FIXED_SOURCES = [
  { value: 'survey-data',  key: 'data_curation_source_survey_data' },
  { value: 'env-health',   key: 'data_curation_source_env_health' },
  { value: 'eval-medical', key: 'data_curation_source_eval_medical' },
  { value: 'vitals',       key: 'data_curation_source_vitals' },
];

// Selected outranks focused: the keyboard/pointer focus ring moves between
// options while the chosen one stays chosen, and it must keep reading as chosen
// while that happens.
function optionBackground(state) {
  if (state.isSelected) return 'var(--tk-dlite-semantic-color-action-primary)';
  if (state.isFocused) return 'var(--tk-dlite-semantic-color-surface-raised)';
  return 'transparent';
}

const selectStyles = {
  container: (base) => ({ ...base, minWidth: 220, flex: 1 }),
  control: (base, state) => ({
    ...base,
    minHeight: 32,
    height: 32,
    border: `1px solid var(--tk-dlite-semantic-color-border)`,
    borderRadius: 'var(--tk-dlite-semantic-border-radius-sm)',
    boxShadow: state.isFocused ? 'var(--focus-glow)' : 'none',
    borderColor: state.isFocused ? 'var(--tk-dlite-semantic-color-action-primary)' : 'var(--tk-dlite-semantic-color-border)',
    '&:hover': { borderColor: 'var(--tk-dlite-semantic-color-border)' },
    fontSize: 13,
    fontFamily: 'var(--font-family)',
    backgroundColor: 'var(--tk-dlite-semantic-color-surface-base)',
    cursor: 'pointer',
  }),
  valueContainer: (base) => ({ ...base, padding: '0 8px', height: 32 }),
  indicatorsContainer: (base) => ({ ...base, height: 32 }),
  groupHeading: (base) => ({
    ...base,
    fontFamily: 'var(--font-family-heading)',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: 'var(--tk-dlite-semantic-color-text-secondary)',
  }),
  option: (base, state) => ({
    ...base,
    fontSize: 13,
    fontFamily: 'var(--font-family)',
    backgroundColor: optionBackground(state),
    color: state.isSelected ? 'var(--tk-dlite-semantic-color-text-on-primary)' : 'var(--tk-dlite-semantic-color-text-primary)',
    cursor: 'pointer',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 'var(--tk-dlite-semantic-border-radius-sm)',
    boxShadow: 'var(--tk-dlite-semantic-elevation-high)',
    zIndex: 100,
  }),
  singleValue: (base) => ({ ...base, fontSize: 13, color: 'var(--tk-dlite-semantic-color-text-primary)' }),
  placeholder: (base) => ({ ...base, fontSize: 13, color: 'var(--tk-dlite-semantic-color-text-secondary)' }),
};

export default function SourceSelector({ source, orgValues, onChange }) {
  const { t } = useTranslation('common');
  const [customForms, setCustomForms] = useState([]);

  useEffect(() => {
    if (!orgValues || !orgValues.length) return;
    const q = new Parse.Query('FormSpecificationsV2');
    q.containedIn('organizations', orgValues);
    q.notEqualTo('active', 'false');
    q.find()
      // The name is field data, so it is shown as collected. Only the fallback
      // for a form that has none is ours to translate.
      .then((forms) => setCustomForms(forms.map((f) => ({
        value: `form-results:${f.id}`,
        name: f.get('name'),
      }))))
      .catch(() => setCustomForms([]));
  }, [orgValues]);

  const fixedOptions = useMemo(
    () => FIXED_SOURCES.map(({ value, key }) => ({ value, label: t(key) })),
    [t],
  );
  const formOptions = useMemo(
    () => customForms.map(({ value, name }) => ({
      value,
      label: name || t('data_curation_source_untitled_form'),
    })),
    [customForms, t],
  );

  const grouped = [
    {
      label: t('data_curation_source_group_system'),
      options: fixedOptions,
    },
    ...(formOptions.length > 0
      ? [{ label: t('data_curation_source_group_custom'), options: formOptions }]
      : []),
  ];
  const currentValue = [...fixedOptions, ...formOptions].find((o) => o.value === source) ?? null;

  return (
    <div className={styles.wrapper}>
      {/* Sentence case in the catalog; `.label` uppercases it in CSS. Storing
          it shouting would make every locale hand-uppercase its own string,
          and casing is not uniform across languages. */}
      <span className={styles.label}>{t('data_curation_source_label')}</span>
      <Select
        inputId="source-select"
        options={grouped}
        value={currentValue}
        onChange={(opt) => onChange(opt.value)}
        isSearchable
        placeholder={t('data_curation_source_placeholder')}
        styles={selectStyles}
      />
    </div>
  );
}
