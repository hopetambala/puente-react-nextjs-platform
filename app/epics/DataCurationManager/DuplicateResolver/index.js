import { Button, Modal } from 'app/impacto-design-system';
import { useState } from 'react';

import styles from './index.module.css';

const COMPARE_FIELDS = [
  { key: 'fname', label: 'First name' },
  { key: 'lname', label: 'Last name' },
  { key: 'communityname', label: 'Community' },
  { key: 'householdId', label: 'Household ID' },
  { key: 'surveyingUser', label: 'Surveyor' },
];

function RecordCard({ record, other, label }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>{label}</div>
      <dl className={styles.fieldList}>
        {COMPARE_FIELDS.map((f) => {
          const value = record.get(f.key) || '—';
          const differs = (record.get(f.key) || '') !== (other.get(f.key) || '');
          return (
            <div key={f.key} className={styles.fieldRow} data-differs={differs ? 'true' : 'false'}>
              <dt className={styles.fieldKey}>{f.label}</dt>
              <dd className={styles.fieldVal}>{value}</dd>
            </div>
          );
        })}
        <div className={styles.fieldRow}>
          <dt className={styles.fieldKey}>Submitted</dt>
          <dd className={styles.fieldVal}>{record.createdAt ? record.createdAt.toLocaleString() : '—'}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function DuplicateResolver({ recordA, recordB, onResolved }) {
  const [busy, setBusy] = useState(false);
  // The record pending deletion, set when a Keep action is clicked. Holds the
  // confirm dialog open until the user explicitly confirms the destroy.
  const [pendingDiscard, setPendingDiscard] = useState(null);

  async function confirmDelete() {
    if (!pendingDiscard) return;
    setBusy(true);
    try {
      await pendingDiscard.destroy();
      setPendingDiscard(null);
      onResolved();
    } catch {
      setBusy(false);
      setPendingDiscard(null);
    }
  }

  return (
    <div className={styles.resolver}>
      <Modal
        open={!!pendingDiscard}
        handleClose={() => setPendingDiscard(null)}
        text="Permanently delete this record? This cannot be undone."
        actionText="Delete record"
        intent="danger"
        action={confirmDelete}
      />
      <div className={styles.cards}>
        <RecordCard record={recordA} other={recordB} label="Record A" />
        <RecordCard record={recordB} other={recordA} label="Record B" />
      </div>
      <div className={styles.actions}>
        <Button text="Keep A, dismiss B" intent="primary" isDisabled={busy} onClick={() => setPendingDiscard(recordB)} />
        <Button text="Keep B, dismiss A" intent="primary" isDisabled={busy} onClick={() => setPendingDiscard(recordA)} />
        <Button text="Both are unique — dismiss" isDisabled={busy} onClick={() => onResolved()} />
      </div>
    </div>
  );
}
