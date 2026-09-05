import { Badge, Skeleton } from 'app/impacto-design-system';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';

import styles from './SyncRibbon.module.css';

/**
 * The provenance strip at ORGANIZATION scale — the dashboard's first element and
 * the answer to "can I trust what I'm about to read?" before any count appears.
 *
 * Always the same fields in the same order, so it becomes readable at a glance
 * and a missing part is noticeable.
 *
 * Every timestamp here is SYNC time (`SurveyData.createdAt` = when Parse
 * received the record), never collection time. The copy says "synced" for that
 * reason; changing it to "collected" would be a factual error, not a wording
 * preference. See the puente-domain-expert skill.
 */

// Only non-fresh states earn a badge — a badge on every state carries no signal.
// `unknown` warns in yellow rather than `never`'s blue: `never` is settled
// information, `unknown` is a caution that the field itself can't be trusted.
const STATUS_VARIANT = { aging: 'yellow', stale: 'red', never: 'blue', unknown: 'yellow' };

export default function SyncRibbon({ state, loading }) {
  const { t } = useTranslation('common');

  if (loading || !state) {
    return (
      // aria-busy: Skeleton is aria-hidden, so without it the provenance strip
      // is absent rather than pending to a screen reader.
      <div className={styles.ribbon} data-testid="sync-ribbon-loading" aria-busy="true">
        <Skeleton width={180} height={13} />
        <Skeleton width={90} height={13} />
      </div>
    );
  }

  const { status, hoursSince, daysSince, recordsLast24h } = state;

  // A `null` count means the 24h count query never ran. A bare `null` renders as
  // a gap and a `0` would claim nothing arrived — a claim the ribbon cannot
  // support — so it falls back to the em-dash the page's context strip uses.
  //
  // A real count goes through the locale's number format rather than out as a
  // raw JS integer: Spanish groups with '.', and every other figure on this
  // screen is already formatted, so an unformatted one here made the same
  // quantity render two different ways on one page.
  const records = recordsLast24h === null || recordsLast24h === undefined
    ? '—'
    : t('number_value', { value: recordsLast24h });

  const recency = () => {
    // `never` has no sync to age, and `unknown` means we couldn't read the sync
    // time — stating an elapsed time for a timestamp we never read would invent it.
    if (status === 'never' || status === 'unknown') return null;
    if (hoursSince < 24) return t('sync_ribbon_hours_ago', { count: hoursSince });
    return t('sync_ribbon_days_ago', { count: daysSince });
  };

  return (
    <section
      className={styles.ribbon}
      data-testid="sync-ribbon"
      aria-label={t('sync_ribbon_region')}
    >
      <span className={styles.group}>
        <span className={styles.label}>{t('sync_ribbon_synced')}</span>
        {recency() && <span className={styles.value}>{recency()}</span>}
      </span>

      <span className={styles.separator} aria-hidden="true">·</span>

      <span className={styles.group}>
        <span className={styles.numeral}>{records}</span>
        <span className={styles.label}>{t('sync_ribbon_records_24h')}</span>
      </span>

      {status !== 'fresh' && (
        <Badge variant={STATUS_VARIANT[status]}>
          {t(`sync_ribbon_status_${status}`)}
        </Badge>
      )}
    </section>
  );
}

SyncRibbon.defaultProps = {
  state: null,
  loading: false,
};

SyncRibbon.propTypes = {
  state: PropTypes.shape({
    status: PropTypes.oneOf(['never', 'fresh', 'aging', 'stale', 'unknown']).isRequired,
    hoursSince: PropTypes.number,
    daysSince: PropTypes.number,
    // Optional (not `isRequired`), which is what makes a `null` count valid here:
    // PropTypes only warns on a null value when the prop is required.
    recordsLast24h: PropTypes.number,
  }),
  loading: PropTypes.bool,
};
