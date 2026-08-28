import { Badge, Button, Skeleton } from 'app/impacto-design-system';
// Straight from the shared module, not from the parent epic: the epic imports
// this table, so reaching back into it for these would be an import cycle.
import { computeFormResultsCompleteness, scoreRecord, sourceHasClientPointer } from 'app/modules/data-quality';

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

// A SurveyData row *is* the person. Every other class stores only its own
// readings and points at the SurveyData person via `client`, which the query
// include()s — so identity and community are read through that pointer.
function personRecord(record, source) {
  if (!sourceHasClientPointer(source)) return record;
  const client = record.get('client');
  return client && typeof client.get === 'function' ? client : null;
}

function personName(record, source) {
  const person = personRecord(record, source);
  if (!person) return record.get('surveyingUser') || '—';
  return `${person.get('fname') || ''} ${person.get('lname') || ''}`.trim() || '—';
}

function community(record, source) {
  const person = personRecord(record, source);
  return (person && person.get('communityname')) || '—';
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
                {/* A `td` is labelled by its column header, which the rule cannot
                    resolve statically; it also treats every `td` as interactive.
                    The cell holds a loading placeholder, so there is no label to
                    add. */}
                {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
                <td colSpan={isFormResults ? 6 : 6}>
                  <Skeleton width="100%" height={16} />
                </td>
              </tr>
            ))
          )}
          {!loading && records.map((r) => (
            <tr key={r.id} className={styles.row} onClick={() => onSelectRecord(r)}>
              <td className={styles.nameCell}>{personName(r, source)}</td>
              {!isFormResults && <td>{community(r, source)}</td>}
              <td>{r.get('surveyingUser') || '—'}</td>
              <td>{r.createdAt ? r.createdAt.toLocaleDateString() : '—'}</td>
              {isFormResults ? (
                <FormResultsCompleteness record={r} formDefinition={formDefinition} />
              ) : (
                // The score is announced by CompletenessBar's own aria-label,
                // which the rule cannot see across the component boundary.
                // eslint-disable-next-line jsx-a11y/control-has-associated-label
                <td className={styles.completenessCell}>
                  <CompletenessBar pct={scoreRecord(r, source, formDefinition)} />
                </td>
              )}
              {/* Flags are announced by the chips themselves; the rule cannot
                  see labels across the component boundary. */}
              {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
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
