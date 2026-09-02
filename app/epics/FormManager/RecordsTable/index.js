import { Badge, EmptyState, Spinner } from 'app/impacto-design-system';
import { useTranslation } from 'next-i18next';
import Parse from 'parse';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

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

function RecordsTable({ form }) {
  const { t } = useTranslation('common');
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchRecords = async () => {
      setLoading(true);
      try {
        const query = new Parse.Query('SurveyData');
        query.equalTo('formSpecification', form.objectId);
        query.limit(PAGE_SIZE);
        query.skip(page * PAGE_SIZE);

        const [results, count] = await Promise.all([
          query.find(),
          query.count(),
        ]);

        if (!cancelled) {
          setRecords(results);
          setTotal(count);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRecords();

    return () => {
      cancelled = true;
    };
  }, [form.objectId, page]);

  const start = page * PAGE_SIZE + 1;
  const end = Math.min(start + PAGE_SIZE - 1, total);

  if (loading) {
    return (
      <div className={styles.spinnerWrap}>
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      {/* Head */}
      <div className={styles.tableHead}>
        <div className={`${styles.cell} ${styles.cellHead} ${styles.cellCheck}`} />
        <div className={`${styles.cell} ${styles.cellHead} ${styles.cellId}`}>{t('form_manager_col_record')}</div>
        <div className={`${styles.cell} ${styles.cellHead}`}>{t('field_household')}</div>
        <div className={`${styles.cell} ${styles.cellHead}`}>{t('field_surveyor')}</div>
        <div className={`${styles.cell} ${styles.cellHead}`}>{t('field_submitted')}</div>
        <div className={`${styles.cell} ${styles.cellHead}`}>{t('field_status')}</div>
        <div className={`${styles.cell} ${styles.cellHead}`}>{t('form_manager_col_water_source')}</div>
        <div className={`${styles.cell} ${styles.cellHead} ${styles.cellMenu}`} />
      </div>

      {/* Rows or empty state */}
      {records.length === 0 ? (
        <EmptyState message={t('form_manager_records_empty')} />
      ) : (
        records.map((record) => {
          const recordId = record.id;
          const household = record.get('household') || '—';
          const surveyor = record.get('surveyingUser') || '—';
          const submitted = record.createdAt
            ? record.createdAt.toLocaleDateString()
            : '—';
          const syncStatus = record.get('syncStatus') || 'synced';
          const waterSource = record.get('waterSource') || '—';

          return (
            <div key={recordId} className={styles.tableRow}>
              <div className={`${styles.cell} ${styles.cellCheck}`}>
                <input type="checkbox" aria-label={t('form_manager_select_record', { id: recordId })} />
              </div>
              <div className={`${styles.cell} ${styles.cellId}`}>{recordId}</div>
              <div className={styles.cell}>{household}</div>
              <div className={`${styles.cell} ${styles.cellSurveyor}`}>
                <span className={styles.avatar}>{getInitials(surveyor)}</span>
                {surveyor}
              </div>
              <div className={styles.cell}>{submitted}</div>
              <div className={styles.cell}>
                {syncStatus === 'conflict' ? (
                  <Badge variant="orange">{t('form_manager_status_conflict')}</Badge>
                ) : (
                  // The same key the sync ribbon uses — one word for one state.
                  <Badge variant="green">{t('sync_ribbon_synced')}</Badge>
                )}
              </div>
              <div className={styles.cell}>{waterSource}</div>
              <div className={`${styles.cell} ${styles.cellMenu}`}>⋯</div>
            </div>
          );
        })
      )}

      {/* Pagination — only shown when there are records */}
      {total > 0 && (
        <div className={styles.pagination}>
          <span>{t('pagination_showing', { from: start, to: end, total })}</span>
          <div className={styles.pageButtons}>
            <button
              type="button"
              className={styles.pageBtn}
              aria-label={t('pagination_prev_page')}
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              {t('form_manager_prev')}
            </button>
            <button
              type="button"
              className={styles.pageBtn}
              aria-label={t('pagination_next_page')}
              disabled={end >= total}
              onClick={() => setPage((p) => p + 1)}
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
    objectId: PropTypes.string.isRequired,
    name: PropTypes.string,
  }).isRequired,
};

export default RecordsTable;
