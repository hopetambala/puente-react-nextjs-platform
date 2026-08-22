import { Badge, EmptyState, Skeleton } from 'app/impacto-design-system';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';

import styles from './NeedsAttention.module.css';

/**
 * The needs-attention queue — the dashboard's focal point and its only
 * interactive rows. The dashboard is a dispatcher: success is a click OUT of
 * here into curation.
 *
 * Two honesty rules are enforced structurally rather than by convention:
 *
 * 1. An approximate row renders a DIFFERENT translation key (`<key>_approx`),
 *    so the hedge has to exist in every locale. A shared key with a separate
 *    visual marker would let the hedge get lost in translation — literally.
 * 2. Severity and estimation are always TEXT (a Badge with a label), never a
 *    bare colour. A reviewer making a data-quality call may not see colour.
 */

const SEVERITY_VARIANT = { critical: 'red', high: 'orange', medium: 'yellow' };

export default function NeedsAttention({ rows, loading }) {
  const { t } = useTranslation('common');

  if (loading) {
    return (
      <div className={styles.list} data-testid="triage-loading">
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeletonRow}>
            <Skeleton width={32} height={20} />
            <Skeleton width="55%" height={13} />
          </div>
        ))}
      </div>
    );
  }

  // An empty queue is a GOOD outcome on this screen. Say so, rather than
  // rendering the same grey void as "no data".
  if (rows.length === 0) {
    return (
      <div data-testid="triage-clear">
        <EmptyState message={t('triage_clear')} sub={t('triage_clear_sub')} />
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {rows.map((r) => (
        <li key={r.id}>
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <Link href={r.href} passHref>
            <a className={styles.row} data-testid={`triage-row-${r.id}`}>
              <span className={styles.count}>{r.count}</span>
              <span className={styles.label}>
                {t(r.approximate ? `${r.labelKey}_approx` : r.labelKey, { count: r.count })}
              </span>
              <span className={styles.tags}>
                {r.approximate && (
                  <span className={styles.estimated}>{t('triage_estimated')}</span>
                )}
                <Badge variant={SEVERITY_VARIANT[r.severity]}>
                  {t(`triage_severity_${r.severity}`)}
                </Badge>
              </span>
            </a>
          </Link>
        </li>
      ))}
    </ul>
  );
}

NeedsAttention.defaultProps = { rows: [], loading: false };

NeedsAttention.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    labelKey: PropTypes.string.isRequired,
    count: PropTypes.number.isRequired,
    severity: PropTypes.oneOf(['critical', 'high', 'medium']).isRequired,
    approximate: PropTypes.bool,
    href: PropTypes.string.isRequired,
  })),
  loading: PropTypes.bool,
};
