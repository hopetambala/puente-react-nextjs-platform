import { EmptyState, Skeleton } from 'app/impacto-design-system';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';

import { formatQuietDuration, QUIET_DAYS } from './coverage';
import styles from './CoverageRail.module.css';

/**
 * Community coverage — the dashboard's right rail.
 *
 * Answers "where do I send a team next?" rather than "how many records do we
 * have?". The finding is SILENCE, so the quiet communities sort to the top and
 * carry a text marker.
 *
 * The disclosure rules here are the point of the component:
 * - it says "sampled" ONLY when the sample actually saturated, so the warning
 *   keeps meaning something;
 * - it reports records it could not attribute to a community, rather than
 *   quietly dropping them from a total the reader assumes is complete.
 *
 * Every "quiet N days" means nobody has HEARD from that community. A phone
 * there may hold newer unsynced work. Sync, not fieldwork.
 */
/**
 * Cap on rows shown. Visual QA drove this: with real data the rail rendered 20+
 * communities, ran off the screen, visually outweighed the queue it is meant to
 * support, and pushed the context strip below the fold. Six keeps it a rail.
 */
export const MAX_ROWS = 6;

export default function CoverageRail({ summary, loading }) {
  const { t } = useTranslation('common');

  if (loading || !summary) {
    return (
      <div className={styles.list} data-testid="coverage-loading">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.skeletonRow}>
            <Skeleton width="60%" height={12} />
            <Skeleton width={28} height={12} />
          </div>
        ))}
      </div>
    );
  }

  const { communities, approximate, skippedNoCommunity } = summary;

  if (communities.length === 0) {
    return (
      <div data-testid="coverage-empty">
        <EmptyState message={t('coverage_empty')} sub={t('coverage_empty_sub')} />
      </div>
    );
  }

  // Quietest-first ordering means the head of the list IS the finding, so the
  // colour on these rows is meaningful rather than decorating every row.
  const shown = communities.slice(0, MAX_ROWS);
  const hidden = communities.length - shown.length;

  return (
    <div>
      <ul className={styles.list}>
        {shown.map((c) => {
          const quiet = c.daysQuiet !== null && c.daysQuiet >= QUIET_DAYS;
          const quietFmt = quiet ? formatQuietDuration(c.daysQuiet) : null;
          return (
            <li key={c.name} className={styles.row} data-testid={`coverage-row-${c.name}`}>
              <span className={styles.name}>{c.name}</span>
              <span className={styles.records}>{c.records}</span>
              <span className={quiet ? styles.quiet : styles.synced}>
                {quietFmt
                  // Coarsened: day-precision on a multi-year silence is false
                  // precision and hides the actual finding.
                  ? t(quietFmt.key, { count: quietFmt.count })
                  // Under the quiet threshold, days are still meaningful.
                  : t('coverage_synced_days', { count: c.daysQuiet })}
              </span>
            </li>
          );
        })}
      </ul>

      {hidden > 0 && (
        <p className={styles.more}>{t('coverage_more', { count: hidden })}</p>
      )}

      {(approximate || skippedNoCommunity > 0) && (
        <p className={styles.disclosure}>
          {approximate && <span>{t('coverage_sampled')}</span>}
          {skippedNoCommunity > 0 && (
            <span>{t('coverage_unattributed', { count: skippedNoCommunity })}</span>
          )}
        </p>
      )}
    </div>
  );
}

CoverageRail.defaultProps = { summary: null, loading: false };

CoverageRail.propTypes = {
  summary: PropTypes.shape({
    communities: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string.isRequired,
      records: PropTypes.number.isRequired,
      daysQuiet: PropTypes.number,
    })).isRequired,
    approximate: PropTypes.bool,
    skippedNoCommunity: PropTypes.number,
  }),
  loading: PropTypes.bool,
};
