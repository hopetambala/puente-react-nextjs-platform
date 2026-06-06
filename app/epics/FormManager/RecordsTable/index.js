import Parse from 'parse';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import { Badge, EmptyState, Spinner } from 'app/impacto-design-system';

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
        <div className={`${styles.cell} ${styles.cellHead} ${styles.cellId}`}>Record</div>
        <div className={`${styles.cell} ${styles.cellHead}`}>Household</div>
        <div className={`${styles.cell} ${styles.cellHead}`}>Surveyor</div>
        <div className={`${styles.cell} ${styles.cellHead}`}>Submitted</div>
        <div className={`${styles.cell} ${styles.cellHead}`}>Status</div>
        <div className={`${styles.cell} ${styles.cellHead}`}>Water source</div>
        <div className={`${styles.cell} ${styles.cellHead} ${styles.cellMenu}`} />
      </div>

      {/* Rows or empty state */}
      {records.length === 0 ? (
        <EmptyState message="No records found for this form." />
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
                <input type="checkbox" aria-label={`Select ${recordId}`} />
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
                  <Badge variant="orange">Conflict</Badge>
                ) : (
                  <Badge variant="green">Synced</Badge>
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
          <span>
            Showing {start}–{end} of {total}
          </span>
          <div className={styles.pageButtons}>
            <button
              type="button"
              className={styles.pageBtn}
              aria-label="Previous page"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹ Prev
            </button>
            <button
              type="button"
              className={styles.pageBtn}
              aria-label="Next page"
              disabled={end >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next ›
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
