import { Button, Modal } from 'app/impacto-design-system';
import { formatDateTime } from 'app/modules/i18n/format';
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
  const { t, i18n } = useTranslation('common');
  return (
    <article className={styles.card} aria-labelledby={`dup-record-${label}`}>
      <h3 className={styles.cardHeader} id={`dup-record-${label}`}>{t('data_curation_dup_record', { label })}</h3>
      <dl className={styles.fieldList}>
        {COMPARE_FIELDS.map((f) => {
          const value = record.get(f.key) || '—';
          const differs = (record.get(f.key) || '') !== (other.get(f.key) || '');
          return (
            <div key={f.key} className={styles.fieldRow} data-differs={differs ? 'true' : 'false'}>
              <dt className={styles.fieldKey}>{t(f.labelKey)}</dt>
              <dd className={styles.fieldVal}>
                {value}
                {/* In words as well as the row tint (WCAG 1.4.1). */}
                {differs && <span className={styles.differs}>{t('data_curation_dup_differs')}</span>}
              </dd>
            </div>
          );
        })}
        <div className={styles.fieldRow}>
          <dt className={styles.fieldKey}>{t('field_submitted')}</dt>
          <dd className={styles.fieldVal}>{formatDateTime(record.createdAt, i18n?.language)}</dd>
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
  // { record, label, keep }: which record goes, and its card's letter.
  const [pendingDiscard, setPendingDiscard] = useState(null);
  // The letter of a record whose delete failed. A failure used to close the
  // dialog and say nothing, so the record looked deleted until a reload.
  const [failedLabel, setFailedLabel] = useState(null);

  async function confirmDelete() {
    if (!pendingDiscard) return;
    setBusy(true);
    setFailedLabel(null);
    try {
      await pendingDiscard.record.destroy();
      setPendingDiscard(null);
      onResolved();
    } catch {
      setBusy(false);
      setFailedLabel(pendingDiscard.label);
      setPendingDiscard(null);
    }
  }

  return (
    <section className={styles.resolver} aria-labelledby="dup-title">
      <h2 className={styles.title} id="dup-title">{t('data_curation_dup_title')}</h2>
      <p className={styles.intro}>{t('data_curation_dup_intro')}</p>
      {failedLabel && (
        <p className={styles.error} role="alert">{t('data_curation_dup_delete_failed', { label: failedLabel })}</p>
      )}
      <Modal
        open={!!pendingDiscard}
        handleClose={() => setPendingDiscard(null)}
        text={pendingDiscard
          ? t('data_curation_dup_delete_confirm', { discard: pendingDiscard.label, keep: pendingDiscard.keep })
          : ''}
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
        {/* Which record is kept and which is deleted are values in the
            sentence, not fixed halves of it — their order is the translator's
            to set. "Delete", not "dismiss": the other record is destroyed
            (design review X12). */}
        <Button
          text={t('data_curation_dup_keep', { keep: 'A', discard: 'B' })}
          isDisabled={busy}
          onClick={() => setPendingDiscard({ record: recordB, label: 'B', keep: 'A' })}
        />
        <Button
          text={t('data_curation_dup_keep', { keep: 'B', discard: 'A' })}
          isDisabled={busy}
          onClick={() => setPendingDiscard({ record: recordA, label: 'A', keep: 'B' })}
        />
        <Button text={t('data_curation_dup_both_unique')} isDisabled={busy} onClick={() => onResolved()} />
      </div>
    </section>
  );
}
