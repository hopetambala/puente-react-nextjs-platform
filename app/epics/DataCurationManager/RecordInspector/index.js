import { Button, Modal, Toast } from 'app/impacto-design-system';
import { useTranslation } from 'next-i18next';
import { useMemo, useState } from 'react';

import styles from './index.module.css';

// `sex` is stored as a code. The value below is what Collect wrote and what a
// save writes back — only `labelKey` is ours to translate, which is why the two
// are separate fields rather than one string doing both jobs.
const SEX_OPTIONS = [
  { value: '',                  labelKey: null },
  { value: 'male',              labelKey: 'data_curation_sex_male' },
  { value: 'female',            labelKey: 'data_curation_sex_female' },
  { value: 'prefer_not_to_say', labelKey: 'data_curation_sex_prefer_not_to_say' },
];

// SurveyData field layout — section → fields, with read-only flags. Titles and
// labels are catalog keys, resolved per render; a label baked in here would be
// fixed at import, before the reader's locale is known.
const SURVEY_SECTIONS = [
  {
    titleKey: 'data_curation_inspector_section_identity',
    fields: [
      { key: 'fname', labelKey: 'field_fname' },
      { key: 'lname', labelKey: 'field_lname' },
      { key: 'nickname', labelKey: 'data_curation_field_nickname' },
      { key: 'dob', labelKey: 'data_curation_field_dob' },
      { key: 'age', labelKey: 'data_curation_field_age' },
      { key: 'sex', labelKey: 'data_curation_field_sex', type: 'select', options: SEX_OPTIONS },
    ],
  },
  {
    titleKey: 'data_curation_inspector_section_contact',
    fields: [
      { key: 'telephoneNumber', labelKey: 'data_curation_field_telephone' },
      { key: 'cedulaNumber', labelKey: 'data_curation_field_cedula' },
    ],
  },
  {
    titleKey: 'data_curation_inspector_section_location',
    fields: [
      { key: 'communityname', labelKey: 'field_community' },
      { key: 'city', labelKey: 'data_curation_field_city' },
      { key: 'province', labelKey: 'data_curation_field_province' },
      { key: 'country', labelKey: 'data_curation_field_country' },
      { key: 'latitude', labelKey: 'data_curation_field_latitude', readOnly: true },
      { key: 'longitude', labelKey: 'data_curation_field_longitude', readOnly: true },
    ],
  },
  {
    titleKey: 'data_curation_inspector_section_household',
    fields: [
      { key: 'householdId', labelKey: 'field_household_id' },
      { key: 'numberofIndividualsLivingintheHouse', labelKey: 'data_curation_field_household_size' },
    ],
  },
  {
    titleKey: 'data_curation_inspector_section_audit',
    fields: [
      { key: 'surveyingUser', labelKey: 'field_surveyor' },
      { key: 'surveyingOrganization', labelKey: 'data_curation_field_organization', readOnly: true },
      { key: 'appVersion', labelKey: 'data_curation_field_app_version', readOnly: true },
      { key: 'phoneOS', labelKey: 'data_curation_field_device_os', readOnly: true },
    ],
  },
];

function FieldRow({ field, value, onChange }) {
  const { t } = useTranslation('common');
  // `labelKey` is a catalog key; `label` is field data (a form definition's own
  // wording), which is shown as collected and never translated.
  const label = field.labelKey ? t(field.labelKey) : field.label;

  if (field.readOnly) {
    return (
      <div className={styles.field}>
        <span className={styles.fieldLabel}>{label}</span>
        <span className={styles.readOnly}>{value || '—'}</span>
      </div>
    );
  }
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={`insp-${field.key}`}>{label}</label>
      {field.type === 'select' ? (
        <select
          id={`insp-${field.key}`}
          className={styles.input}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          {field.options.map((o) => {
          const val = typeof o === 'object' ? (o.value || o.label || '') : o;
          const lbl = typeof o === 'object'
            ? ((o.labelKey && t(o.labelKey)) || o.label || o.value || '—')
            : (o || '—');
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
  const { t } = useTranslation('common');
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
      // Field data, not a catalog key: a form's own wording is shown as the
      // person who built the form wrote it. The fallback to `formikKey` stays —
      // a definition edited after collection can leave `label` unset.
      label: f.label || f.formikKey,
      type: f.fieldType === 'select' ? 'select' : undefined,
      options: f.fieldType === 'select' ? ['', ...(f.options || [])] : undefined,
    };
  }

  return (
    <>
      <button type="button" className={styles.overlay} aria-label={t('data_curation_inspector_close_overlay')} onClick={dirty ? () => setDiscardOpen(true) : onClose} />
      <aside className={styles.panel}>
        <header className={styles.header}>
          <span className={styles.title}>
            {isFormResults
              ? (record.get('title') || t('data_curation_inspector_form_record'))
              : `${record.get('fname') || ''} ${record.get('lname') || ''}`.trim()
                || t('data_curation_inspector_record')}
          </span>
          <button type="button" className={styles.closeBtn} aria-label={t('action_close')} onClick={dirty ? () => setDiscardOpen(true) : onClose}>✕</button>
        </header>

        <div className={styles.body}>
          {error && <Toast text={t('data_curation_inspector_save_failed')} isError />}

          {isFormResults ? (
            <>
              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>{t('data_curation_inspector_section_metadata')}</h4>
                <FieldRow field={{ key: 'surveyingUser', labelKey: 'field_surveyor' }} value={edits.surveyingUser ?? (record.get('surveyingUser') || '')} onChange={handleChange} />
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>{t('data_curation_field_organization')}</span>
                  <span className={styles.readOnly}>{record.get('surveyingOrganization') || '—'}</span>
                </div>
              </section>
              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>{t('data_curation_inspector_section_fields')}</h4>
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
              <section key={sec.titleKey} className={styles.section}>
                <h4 className={styles.sectionTitle}>{t(sec.titleKey)}</h4>
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
          <Button
            text={saving ? t('data_curation_inspector_saving') : t('data_curation_save')}
            intent="primary"
            onClick={handleSave}
            isDisabled={saving}
          />
          <Button text={t('data_curation_cancel')} onClick={onClose} />
          {dirty && <span className={styles.unsavedWarning}>{t('data_curation_inspector_unsaved')}</span>}
        </footer>
      </aside>
      <Modal
        open={discardOpen}
        handleClose={() => setDiscardOpen(false)}
        text={t('data_curation_inspector_discard_confirm')}
        actionText={t('data_curation_inspector_discard_action')}
        intent="danger"
        action={() => { setDiscardOpen(false); onClose(); }}
      />
    </>
  );
}
