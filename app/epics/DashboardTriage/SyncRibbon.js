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
const STATUS_VARIANT = { aging: 'yellow', stale: 'red', never: 'blue' };

export default function SyncRibbon({ state, loading }) {
  const { t } = useTranslation('common');

  if (loading || !state) {
    return (
      <div className={styles.ribbon} data-testid="sync-ribbon-loading">
        <Skeleton width={180} height={13} />
        <Skeleton width={90} height={13} />
      </div>
    );
  }

  const { status, hoursSince, daysSince, recordsLast24h } = state;

  const recency = () => {
    if (status === 'never') return null;
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
        <span className={styles.value}>{recordsLast24h}</span>
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
    status: PropTypes.oneOf(['never', 'fresh', 'aging', 'stale']).isRequired,
    hoursSince: PropTypes.number,
    daysSince: PropTypes.number,
    recordsLast24h: PropTypes.number,
  }),
  loading: PropTypes.bool,
};
