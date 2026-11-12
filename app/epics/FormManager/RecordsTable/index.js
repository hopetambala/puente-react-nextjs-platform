import { Badge, EmptyState, Spinner } from 'app/impacto-design-system';
import { settleWithin } from 'app/modules/async/settleWithin';
import { formatDate } from 'app/modules/i18n/format';
import { loadOrganizationScope } from 'app/modules/organization';
import { useTranslation } from 'next-i18next';
import Parse from 'parse';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import formDisplayName from '../_utils/formDisplayName';
import formRecordsQuery from '../_utils/formRecordsQuery';
import styles from './index.module.css';

const PAGE_SIZE = 20;

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function RecordsTable({ form, organization }) {
  const { t, i18n } = useTranslation('common');
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  // Whether any page has loaded. Only the first load shows the spinner; later
  // page turns keep the table (and the focused Next button) in place.
  const [loadedOnce, setLoadedOnce] = useState(false);
  // A failed load is not an empty form: "No records found" after a failed
  // request reads as "my data is gone". `attempt` re-runs the fetch on retry.
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchRecords = async () => {
      setLoading(true);
      setFailed(false);
      try {
        const scope = await settleWithin(loadOrganizationScope(Parse, organization));
        const query = formRecordsQuery(Parse, form, scope);
        if (!query) {
          if (!cancelled) {
            setRecords([]);
            setTotal(0);
          }
          return;
        }
        query.limit(PAGE_SIZE);
        query.skip(page * PAGE_SIZE);

        const [results, count] = await settleWithin(Promise.all([
          query.find(),
          query.count(),
        ]));

        if (!cancelled) {
          setRecords(results);
          setTotal(count);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadedOnce(true);
        }
      }
    };

    fetchRecords();

    return () => {
      cancelled = true;
    };
  }, [form.objectId, form.name, organization, page, attempt]);

  const start = page * PAGE_SIZE + 1;
  const end = Math.min(start + PAGE_SIZE - 1, total);

  const name = formDisplayName(form, t);
  const heading = <h2 className={styles.heading}>{name}</h2>;

  if (loading && !loadedOnce) {
    return (
      <div>
        {heading}
        <div className={styles.spinnerWrap}>
          <Spinner />
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div>
        {heading}
        {/* role="alert": the spinner disappearing is the only other cue. */}
        <div role="alert" className={styles.failed}>
          <p>{t('form_manager_records_error')}</p>
          <p>{t('form_manager_custom_forms_error_sub')}</p>
          <button type="button" className={styles.pageBtn} onClick={() => setAttempt((n) => n + 1)}>
            {t('form_manager_retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {heading}
      {records.length === 0 ? (
        <EmptyState message={t('form_manager_records_empty')} />
      ) : (
        // A real table (it was a grid of divs). Below 40rem of container each
        // row is a card; explicit roles survive that display change.
        <div className={styles.tableWrap}>
          <table className={styles.table} role="table" aria-busy={loading}>
            <caption className="sr-only">{t('form_manager_records_caption', { name })}</caption>
            <thead>
              <tr role="row">
                <th role="columnheader" scope="col">{t('form_manager_col_record')}</th>
                <th role="columnheader" scope="col">{t('field_surveyor')}</th>
                <th role="columnheader" scope="col">{t('field_submitted')}</th>
                <th role="columnheader" scope="col">{t('field_status')}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const surveyor = record.get('surveyingUser') || '—';
                const syncStatus = record.get('syncStatus') || 'synced';
                return (
                  <tr key={record.id} role="row">
                    <td role="cell" className={styles.cellId} data-label={t('form_manager_col_record')}>{record.id}</td>
                    <td role="cell" data-label={t('field_surveyor')}>
                      <span className={styles.surveyor}>
                        <span className={styles.avatar} aria-hidden="true">{getInitials(surveyor)}</span>
                        {surveyor}
                      </span>
                    </td>
                    <td role="cell" data-label={t('field_submitted')}>{formatDate(record.createdAt, i18n?.language)}</td>
                    <td role="cell" data-label={t('field_status')}>
                      {syncStatus === 'conflict' ? (
                        <Badge variant="orange">{t('form_manager_status_conflict')}</Badge>
                      ) : (
                        // The same key the sync ribbon uses — one word for one state.
                        <Badge variant="green">{t('sync_ribbon_synced')}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Prev/Next are named by their visible words (design review X10).
          Not disabled while a page loads: disabling the focused button would
          drop focus to <body>; the click handler ignores it instead. */}
      {total > 0 && (
        <div className={styles.pagination}>
          <span>{t('pagination_showing', { from: start, to: end, total })}</span>
          <div className={styles.pageButtons}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page === 0}
              onClick={() => { if (!loading) setPage((p) => p - 1); }}
            >
              {t('form_manager_prev')}
            </button>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={end >= total}
              onClick={() => { if (!loading) setPage((p) => p + 1); }}
            >
              {t('form_manager_next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

RecordsTable.propTypes = {
  form: PropTypes.shape({
    // Optional: Puente cards (Vitals, SurveyData, …) are classes, not form specifications.
    objectId: PropTypes.string,
    name: PropTypes.string,
    /** Puente forms only: the catalog key of their translated name. */
    labelKey: PropTypes.string,
  }).isRequired,
  organization: PropTypes.string,
};

RecordsTable.defaultProps = {
  organization: '',
};

export default RecordsTable;
