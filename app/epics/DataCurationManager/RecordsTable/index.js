import { Badge, Button, Skeleton } from 'app/impacto-design-system';
// Straight from the shared module, not from the parent epic: the epic imports
// this table, so reaching back into it for these would be an import cycle.
import { computeFormResultsCompleteness, scoreRecord, sourceHasClientPointer } from 'app/modules/data-quality';
import { useTranslation } from 'next-i18next';

import styles from './index.module.css';

const PAGE_SIZE = 50;

function CompletenessBar({ pct }) {
  const { t } = useTranslation('common');
  let toneClass = styles.barHigh;
  if (pct < 60) toneClass = styles.barLow;
  else if (pct < 80) toneClass = styles.barMid;
  return (
    <div className={styles.barTrack} aria-label={t('data_curation_completeness_aria', { pct })}>
      <div className={`${styles.barFill} ${toneClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function FlagChips({ isDup, isAnomaly, onDupClick }) {
  const { t } = useTranslation('common');
  return (
    <div className={styles.flags}>
      {isDup && (
        <button type="button" className={styles.dupChip} onClick={onDupClick}>
          <Badge variant="yellow">{t('data_curation_flag_dup')}</Badge>
        </button>
      )}
      {isAnomaly && <Badge variant="red">{t('data_curation_flag_low')}</Badge>}
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
  const { t } = useTranslation('common');
  const s = computeFormResultsCompleteness(record, formDefinition);
  // Through the catalog rather than `{n}%`: the completeness bar's aria-label
  // states the same quantity, and one figure rendered two ways reads as two.
  return (
    <>
      <td>{t('data_curation_percent', { pct: s.meta })}</td>
      <td>{t('data_curation_percent', { pct: s.fields })}</td>
    </>
  );
}

export default function RecordsTable({
  source, records, total, page, dups, anomalies,
  onSelectRecord, onPageChange, onDuplicateGroup, loading, formDefinition,
}) {
  const { t } = useTranslation('common');
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
            <th>{isFormResults ? t('data_curation_col_person') : t('data_curation_col_name')}</th>
            {!isFormResults && <th>{t('field_community')}</th>}
            <th>{t('field_surveyor')}</th>
            <th>{t('field_submitted')}</th>
            {isFormResults ? (
              <>
                <th>{t('data_curation_col_metadata_pct')}</th>
                <th>{t('data_curation_col_fields_pct')}</th>
              </>
            ) : (
              <th>{t('data_curation_col_completeness')}</th>
            )}
            <th>{t('data_curation_col_flags')}</th>
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
        {/* Three numbers in one sentence, so all three are interpolated and
            formatted by the catalog. Assembling this from fragments would fix
            English word order for every locale. */}
        <span className={styles.pageInfo}>
          {t('pagination_showing', { from, to, total })}
        </span>
        <div className={styles.pageButtons}>
          <Button text={t('data_curation_prev')} isSmall isDisabled={!hasPrev} onClick={() => onPageChange(page - 1)} />
          <Button text={t('data_curation_next')} isSmall isDisabled={!hasNext} onClick={() => onPageChange(page + 1)} />
        </div>
      </div>
    </div>
  );
}
