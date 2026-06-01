import { Parse } from 'parse';
import { useEffect, useState } from 'react';

import styles from './index.module.css';

const FIXED_SOURCES = [
  { value: 'survey-data',  label: 'People Records' },
  { value: 'env-health',   label: 'Environmental Health' },
  { value: 'eval-medical', label: 'Medical Evaluation' },
  { value: 'vitals',       label: 'Vitals' },
];

export default function SourceSelector({ source, org, onChange }) {
  const [customForms, setCustomForms] = useState([]);

  useEffect(() => {
    if (!org) return;
    const q = new Parse.Query('FormSpecificationsV2');
    q.equalTo('surveyingOrganization', org);
    q.equalTo('active', 'true');
    q.find()
      .then((forms) => setCustomForms(forms.map((f) => ({
        value: `form-results:${f.id}`,
        label: f.get('name') || 'Untitled form',
      }))))
      .catch(() => setCustomForms([]));
  }, [org]);

  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor="source-select">Data source</label>
      <select
        id="source-select"
        className={styles.select}
        value={source}
        onChange={(e) => onChange(e.target.value)}
      >
        <optgroup label="Records">
          {FIXED_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </optgroup>
        {customForms.length > 0 && (
          <optgroup label="Custom Forms">
            {customForms.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
