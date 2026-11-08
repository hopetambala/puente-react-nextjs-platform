import { useTranslation } from 'next-i18next';
import { Parse } from 'parse';
import { useEffect, useMemo, useState } from 'react';

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

  const known = [...fixedOptions, ...formOptions].some((o) => o.value === source);

  // A native <select>: a real label, the platform's own keyboard behaviour and
  // type-ahead, the phone's own picker, and the app's focus ring. The list is
  // four record types plus the organization's forms, short enough that the
  // searchable react-select it replaced bought nothing a coordinator on a
  // phone could use.
  return (
    <div className={styles.wrapper}>
      {/* Sentence case in the catalog; `.label` uppercases it in CSS. Storing
          it shouting would make every locale hand-uppercase its own string,
          and casing is not uniform across languages. */}
      <label htmlFor="source-select" className={styles.label}>{t('data_curation_source_label')}</label>
      <select
        id="source-select"
        className={styles.select}
        value={known ? source : ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {!known && <option value="" disabled>{t('data_curation_source_placeholder')}</option>}
        <optgroup label={t('data_curation_source_group_system')}>
          {fixedOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </optgroup>
        {formOptions.length > 0 && (
          <optgroup label={t('data_curation_source_group_custom')}>
            {formOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </optgroup>
        )}
      </select>
    </div>
  );
}
