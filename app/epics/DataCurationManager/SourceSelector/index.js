import { Parse } from 'parse';
import { useEffect, useState } from 'react';
import Select from 'react-select';

import styles from './index.module.css';

const FIXED_SOURCES = [
  { value: 'survey-data',  label: 'People Records' },
  { value: 'env-health',   label: 'Environmental Health' },
  { value: 'eval-medical', label: 'Medical Evaluation' },
  { value: 'vitals',       label: 'Vitals' },
];

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
    backgroundColor: state.isSelected ? 'var(--tk-dlite-semantic-color-action-primary)' : state.isFocused ? 'var(--tk-dlite-semantic-color-surface-raised)' : 'transparent',
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

export default function SourceSelector({ source, org, onChange }) {
  const [customForms, setCustomForms] = useState([]);

  useEffect(() => {
    if (!org) return;
    const q = new Parse.Query('FormSpecificationsV2');
    q.equalTo('organizations', org);
    q.notEqualTo('active', 'false');
    q.find()
      .then((forms) => setCustomForms(forms.map((f) => ({
        value: `form-results:${f.id}`,
        label: f.get('name') || 'Untitled form',
      }))))
      .catch(() => setCustomForms([]));
  }, [org]);

  const grouped = [
    {
      label: 'System Records',
      options: FIXED_SOURCES,
    },
    ...(customForms.length > 0 ? [{ label: 'Custom Forms', options: customForms }] : []),
  ];
  const currentValue = [...FIXED_SOURCES, ...customForms].find((o) => o.value === source) ?? null;

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>DATA SOURCE</span>
      <Select
        inputId="source-select"
        options={grouped}
        value={currentValue}
        onChange={(opt) => onChange(opt.value)}
        isSearchable
        placeholder="Search sources…"
        styles={selectStyles}
      />
    </div>
  );
}
