import { Badge, Button, Skeleton } from 'app/impacto-design-system';

import { computeFormResultsCompleteness } from '../index';
import styles from './index.module.css';

const PAGE_SIZE = 50;

function CompletenessBar({ pct }) {
  let toneClass = styles.barHigh;
  if (pct < 60) toneClass = styles.barLow;
  else if (pct < 80) toneClass = styles.barMid;
  return (
    <div className={styles.barTrack} aria-label={`${pct}% complete`}>
      <div className={`${styles.barFill} ${toneClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function FlagChips({ isDup, isAnomaly, onDupClick }) {
  return (
    <div className={styles.flags}>
      {isDup && (
        <button type="button" className={styles.dupChip} onClick={onDupClick}>
          <Badge variant="yellow">Dup</Badge>
        </button>
      )}
      {isAnomaly && <Badge variant="red">Low</Badge>}
    </div>
  );
}

function personName(record, source) {
  if (source.startsWith('form-results:') || source === 'eval-medical' || source === 'vitals' || source === 'env-health') {
    const client = record.get('client');
    if (client && typeof client.get === 'function') {
      return `${client.get('fname') || ''} ${client.get('lname') || ''}`.trim() || '—';
    }
    return record.get('surveyingUser') || '—';
  }
  return `${record.get('fname') || ''} ${record.get('lname') || ''}`.trim() || '—';
}

function completeness(record) {
  const FIELDS = ['fname', 'lname', 'dob', 'sex', 'householdId', 'communityname', 'surveyingUser', 'telephoneNumber'];
  const filled = FIELDS.filter((f) => {
    const v = record.get(f);
    return v !== null && v !== undefined && v !== '';
  });
  return Math.round((filled.length / FIELDS.length) * 100);
}

function FormResultsCompleteness({ record, formDefinition }) {
  const s = computeFormResultsCompleteness(record, formDefinition);
  return (
    <>
      <td>{s.meta}%</td>
      <td>{s.fields}%</td>
    </>
  );
}

export default function RecordsTable({
  source, records, total, page, dups, anomalies,
  onSelectRecord, onPageChange, onDuplicateGroup, loading, formDefinition,
}) {
  const isFormResults = source.startsWith('form-results:');
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, total);
  const hasNext = (page + 1) * PAGE_SIZE < total;
  const hasPrev = page > 0;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{isFormResults ? 'Person' : 'Name'}</th>
            {!isFormResults && <th>Community</th>}
            <th>Surveyor</th>
            <th>Submitted</th>
            {isFormResults ? (
              <>
                <th>Metadata %</th>
                <th>Fields %</th>
              </>
            ) : (
              <th>Completeness</th>
            )}
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            // eslint-disable-next-line react/no-array-index-key
            [0, 1, 2, 3, 4].map((i) => (
              <tr key={i}>
                <td colSpan={isFormResults ? 6 : 6}>
                  <Skeleton width="100%" height={16} />
                </td>
              </tr>
            ))
          )}
          {!loading && records.map((r) => (
            <tr key={r.id} className={styles.row} onClick={() => onSelectRecord(r)}>
              <td className={styles.nameCell}>{personName(r, source)}</td>
              {!isFormResults && <td>{r.get('communityname') || '—'}</td>}
              <td>{r.get('surveyingUser') || '—'}</td>
              <td>{r.createdAt ? r.createdAt.toLocaleDateString() : '—'}</td>
              {isFormResults ? (
                <FormResultsCompleteness record={r} formDefinition={formDefinition} />
              ) : (
                <td className={styles.completenessCell}>
                  <CompletenessBar pct={completeness(r)} />
                </td>
              )}
              <td onClick={(e) => e.stopPropagation()}>
                <FlagChips
                  isDup={dups.has(r.id)}
                  isAnomaly={anomalies.has(r.id)}
                  onDupClick={() => onDuplicateGroup && onDuplicateGroup(r)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.pagination}>
        <span className={styles.pageInfo}>{`Showing ${from}–${to} of ${total}`}</span>
        <div className={styles.pageButtons}>
          <Button text="← Prev" isSmall isDisabled={!hasPrev} onClick={() => onPageChange(page - 1)} />
          <Button text="Next →" isSmall isDisabled={!hasNext} onClick={() => onPageChange(page + 1)} />
        </div>
      </div>
    </div>
  );
}
