import { Button, Modal } from 'app/impacto-design-system';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

import styles from './index.module.css';

// `field_*` keys are the ones more than one surface shows; inspector-only
// labels keep the `data_curation_field_*` prefix. Minting a second key for
// "First name" here would let the two surfaces drift apart in translation
// while both still looked right in English.
const COMPARE_FIELDS = [
  { key: 'fname', labelKey: 'field_fname' },
  { key: 'lname', labelKey: 'field_lname' },
  { key: 'communityname', labelKey: 'field_community' },
  { key: 'householdId', labelKey: 'field_household_id' },
  { key: 'surveyingUser', labelKey: 'field_surveyor' },
];

function RecordCard({ record, other, label }) {
  const { t } = useTranslation('common');
  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>{t('data_curation_dup_record', { label })}</div>
      <dl className={styles.fieldList}>
        {COMPARE_FIELDS.map((f) => {
          const value = record.get(f.key) || '—';
          const differs = (record.get(f.key) || '') !== (other.get(f.key) || '');
          return (
            <div key={f.key} className={styles.fieldRow} data-differs={differs ? 'true' : 'false'}>
              <dt className={styles.fieldKey}>{t(f.labelKey)}</dt>
              <dd className={styles.fieldVal}>{value}</dd>
            </div>
          );
        })}
        <div className={styles.fieldRow}>
          <dt className={styles.fieldKey}>{t('field_submitted')}</dt>
          <dd className={styles.fieldVal}>{record.createdAt ? record.createdAt.toLocaleString() : '—'}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function DuplicateResolver({ recordA, recordB, onResolved }) {
  const { t } = useTranslation('common');
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
        text={t('data_curation_dup_delete_confirm')}
        actionText={t('data_curation_dup_delete_action')}
        intent="danger"
        action={confirmDelete}
      />
      <div className={styles.cards}>
        {/* "A" and "B" are identifiers for the two cards, not copy — the word
            around them lives in `data_curation_dup_record`. They stay literal
            deliberately. */}
        <RecordCard record={recordA} other={recordB} label="A" />
        <RecordCard record={recordB} other={recordA} label="B" />
      </div>
      <div className={styles.actions}>
        {/* Which record is kept and which is dismissed are values in the
            sentence, not fixed halves of it — their order is the translator's
            to set. */}
        <Button
          text={t('data_curation_dup_keep', { keep: 'A', dismiss: 'B' })}
          intent="primary"
          isDisabled={busy}
          onClick={() => setPendingDiscard(recordB)}
        />
        <Button
          text={t('data_curation_dup_keep', { keep: 'B', dismiss: 'A' })}
          intent="primary"
          isDisabled={busy}
          onClick={() => setPendingDiscard(recordA)}
        />
        <Button text={t('data_curation_dup_both_unique')} isDisabled={busy} onClick={() => onResolved()} />
      </div>
    </div>
  );
}
