import { Button, Modal, Toast } from 'app/impacto-design-system';
import { useMemo, useState } from 'react';

import styles from './index.module.css';

// SurveyData field layout — section → fields, with read-only flags
const SURVEY_SECTIONS = [
  {
    title: 'Identity',
    fields: [
      { key: 'fname', label: 'First name' },
      { key: 'lname', label: 'Last name' },
      { key: 'nickname', label: 'Nickname' },
      { key: 'dob', label: 'Date of birth' },
      { key: 'age', label: 'Age' },
      { key: 'sex', label: 'Sex', type: 'select', options: ['', 'male', 'female', 'prefer_not_to_say'] },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { key: 'telephoneNumber', label: 'Phone' },
      { key: 'cedulaNumber', label: 'Cédula / ID' },
    ],
  },
  {
    title: 'Location',
    fields: [
      { key: 'communityname', label: 'Community' },
      { key: 'city', label: 'City' },
      { key: 'province', label: 'Province' },
      { key: 'country', label: 'Country' },
      { key: 'latitude', label: 'Latitude', readOnly: true },
      { key: 'longitude', label: 'Longitude', readOnly: true },
    ],
  },
  {
    title: 'Household',
    fields: [
      { key: 'householdId', label: 'Household ID' },
      { key: 'numberofIndividualsLivingintheHouse', label: 'Household size' },
    ],
  },
  {
    title: 'Audit',
    fields: [
      { key: 'surveyingUser', label: 'Surveyor' },
      { key: 'surveyingOrganization', label: 'Organization', readOnly: true },
      { key: 'appVersion', label: 'App version', readOnly: true },
      { key: 'phoneOS', label: 'Device OS', readOnly: true },
    ],
  },
];

function FieldRow({ field, value, onChange }) {
  if (field.readOnly) {
    return (
      <div className={styles.field}>
        <span className={styles.fieldLabel}>{field.label}</span>
        <span className={styles.readOnly}>{value || '—'}</span>
      </div>
    );
  }
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={`insp-${field.key}`}>{field.label}</label>
      {field.type === 'select' ? (
        <select
          id={`insp-${field.key}`}
          className={styles.input}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          {field.options.map((o) => {
          const val = typeof o === 'object' ? (o.value || o.label || '') : o;
          const lbl = typeof o === 'object' ? (o.label || o.value || '—') : (o || '—');
          return <option key={val} value={val}>{lbl}</option>;
        })}
        </select>
      ) : (
        <input
          id={`insp-${field.key}`}
          className={styles.input}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      )}
    </div>
  );
}

export default function RecordInspector({ record, source, formDefinition, onClose, onSaved }) {
  const isFormResults = source.startsWith('form-results:');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  // Build initial edit state
  const initial = useMemo(() => {
    const state = {};
    if (isFormResults) {
      const answers = record.get('fields') || [];
      answers.forEach((a) => { state[a.title] = a.answer; });
    } else {
      SURVEY_SECTIONS.forEach((sec) => sec.fields.forEach((f) => {
        if (!f.readOnly) state[f.key] = record.get(f.key) || '';
      }));
    }
    return state;
  }, [record, isFormResults]);

  const [edits, setEdits] = useState(initial);

  const handleChange = (key, value) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  async function handleSave() {
    setSaving(true);
    setError(false);
    try {
      if (isFormResults) {
        const existing = record.get('fields') || [];
        const merged = existing.map((f) => (
          edits[f.title] !== undefined ? { title: f.title, answer: edits[f.title] } : f
        ));
        record.set('fields', merged);
      } else {
        Object.entries(edits).forEach(([key, value]) => {
          if (value !== (record.get(key) || '')) record.set(key, value);
        });
      }
      await record.save();
      onSaved(record);
      setDirty(false);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  const formFields = isFormResults ? (formDefinition?.get('fields') || []) : [];

  function toFieldDescriptor(f) {
    return {
      key: f.formikKey,
      label: f.label || f.formikKey,
      type: f.fieldType === 'select' ? 'select' : undefined,
      options: f.fieldType === 'select' ? ['', ...(f.options || [])] : undefined,
    };
  }

  return (
    <>
      <button type="button" className={styles.overlay} aria-label="Close inspector overlay" onClick={dirty ? () => setDiscardOpen(true) : onClose} />
      <aside className={styles.panel}>
        <header className={styles.header}>
          <span className={styles.title}>
            {isFormResults
              ? (record.get('title') || 'Form Record')
              : `${record.get('fname') || ''} ${record.get('lname') || ''}`.trim() || 'Record'}
          </span>
          <button type="button" className={styles.closeBtn} aria-label="Close" onClick={dirty ? () => setDiscardOpen(true) : onClose}>✕</button>
        </header>

        <div className={styles.body}>
          {error && <Toast text="Save failed — try again" isError />}

          {isFormResults ? (
            <>
              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Metadata</h4>
                <FieldRow field={{ key: 'surveyingUser', label: 'Surveyor' }} value={edits.surveyingUser ?? (record.get('surveyingUser') || '')} onChange={handleChange} />
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Organization</span>
                  <span className={styles.readOnly}>{record.get('surveyingOrganization') || '—'}</span>
                </div>
              </section>
              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Fields</h4>
                {formFields.map((f) => (
                  <FieldRow
                    key={f.formikKey}
                    field={toFieldDescriptor(f)}
                    value={edits[f.formikKey] ?? ''}
                    onChange={handleChange}
                  />
                ))}
              </section>
            </>
          ) : (
            SURVEY_SECTIONS.map((sec) => (
              <section key={sec.title} className={styles.section}>
                <h4 className={styles.sectionTitle}>{sec.title}</h4>
                {sec.fields.map((f) => (
                  <FieldRow
                    key={f.key}
                    field={f}
                    value={f.readOnly ? (record.get(f.key) || '') : (edits[f.key] ?? '')}
                    onChange={handleChange}
                  />
                ))}
              </section>
            ))
          )}
        </div>

        <footer className={styles.footer}>
          <Button text={saving ? 'Saving…' : 'Save'} intent="primary" onClick={handleSave} isDisabled={saving} />
          <Button text="Cancel" onClick={onClose} />
          {dirty && <span className={styles.unsavedWarning}>Unsaved changes</span>}
        </footer>
      </aside>
      <Modal
        open={discardOpen}
        handleClose={() => setDiscardOpen(false)}
        text="Discard unsaved changes?"
        actionText="Discard"
        intent="danger"
        action={() => { setDiscardOpen(false); onClose(); }}
      />
    </>
  );
}
