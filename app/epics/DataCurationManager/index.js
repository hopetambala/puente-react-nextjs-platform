import { Button } from 'app/impacto-design-system';
import { retrieveCurrentUserAsyncFunction } from 'app/modules/user';
import { useTranslation } from 'next-i18next';
import { Parse } from 'parse';
import { useEffect, useState } from 'react';

import styles from './index.module.css';

const KEY_FIELDS = ['fname', 'lname', 'householdId', 'surveyingUser', 'communityname'];

export function computeCompleteness(record) {
  const filled = KEY_FIELDS.filter((f) => {
    const v = record.get(f);
    return v !== null && v !== undefined && v !== '';
  });
  return Math.round((filled.length / KEY_FIELDS.length) * 100);
}

export function detectDuplicates(records) {
  const seen = {};
  const dups = new Set();
  records.forEach((r) => {
    const hid = r.get('householdId');
    if (!hid) return; // skip records without a household ID — they'd all share the same key
    const day = r.createdAt ? r.createdAt.toISOString().slice(0, 10) : 'unknown';
    const key = `${hid}__${day}`;
    if (seen[key]) {
      dups.add(seen[key]);
      dups.add(r.id);
    } else {
      seen[key] = r.id;
    }
  });
  return dups;
}

export function flagAnomalies(records) {
  const anomalies = new Set();
  records.forEach((r) => {
    if (computeCompleteness(r) < 60) {
      anomalies.add(r.id);
    }
  });
  return anomalies;
}

export default function DataCurationManager() {
  const { t } = useTranslation('common');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = retrieveCurrentUserAsyncFunction();
    const org = user ? user.get('organization') : '';
    async function load() {
      try {
        const query = new Parse.Query('SurveyData');
        query.equalTo('surveyingOrganization', org);
        query.limit(200);
        const results = await query.find();
        setRecords(results);
      } catch {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const dups = detectDuplicates(records);
  const anomalies = flagAnomalies(records);
  const avgCompleteness = records.length
    ? Math.round(records.reduce((sum, r) => sum + computeCompleteness(r), 0) / records.length)
    : 0;

  function openEdit(record) {
    const fields = {};
    KEY_FIELDS.forEach((f) => {
      fields[f] = record.get(f) || '';
    });
    setEditFields(fields);
    setSelectedRecord(record);
  }

  async function handleSave() {
    if (!selectedRecord) return;
    setSaving(true);
    KEY_FIELDS.forEach((f) => {
      selectedRecord.set(f, editFields[f]);
    });
    await selectedRecord.save();
    setSaving(false);
    setSelectedRecord(null);
  }

  if (loading) {
    return <div className={styles.loading}>Loading…</div>;
  }

  return (
    <div className={styles.manager}>
      {/* Summary bar */}
      <div className={styles.summaryBar}>
        <span>{records.length} {t('data_curation_records')}</span>
        <span>{avgCompleteness}% {t('data_curation_avg')}</span>
        <span>{dups.size} {t('data_curation_dups')}</span>
        <span>{anomalies.size} {t('data_curation_anomalies')}</span>
      </div>

      {/* Records table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Surveyor</th>
            <th>Submitted</th>
            <th>Completeness</th>
            <th>Flag</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr
              key={r.id}
              className={styles.row}
              onClick={() => openEdit(r)}
            >
              <td>{r.get('surveyingUser') || '—'}</td>
              <td>{r.createdAt ? r.createdAt.toLocaleDateString() : '—'}</td>
              <td>{computeCompleteness(r)}%</td>
              <td>
                {dups.has(r.id) && <span className={styles.chipDup}>Dup</span>}
                {anomalies.has(r.id) && <span className={styles.chipAnomaly}>Low</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Edit panel — shown inline when a record is selected */}
      {selectedRecord && (
        <div className={styles.editPanel}>
          <div className={styles.editPanelHeader}>
            <span className={styles.editPanelTitle}>{t('data_curation_edit')}</span>
            <Button text="✕" onClick={() => setSelectedRecord(null)} />
          </div>
          <div className={styles.editForm}>
            {KEY_FIELDS.map((f) => (
              <div key={f} className={styles.editField}>
                <label className={styles.editLabel} htmlFor={`edit-${f}`}>{f}</label>
                <input
                  id={`edit-${f}`}
                  className={styles.editInput}
                  value={editFields[f] || ''}
                  onChange={(e) => setEditFields((prev) => ({ ...prev, [f]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className={styles.editActions}>
            <Button
              text={t('data_curation_save')}
              intent="primary"
              onClick={handleSave}
              isDisabled={saving}
            />
            <Button text="Cancel" onClick={() => setSelectedRecord(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
