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

export default function NeedsAttention({
  rows, unavailable, recordState, total, loading,
}) {
  const { t } = useTranslation('common');

  /**
   * A queue count is a numerator, and a numerator alone cannot be triaged: 12 of
   * 43,979 means ignore this today, 12 of 15 means stop everything. Reading a
   * count without its base rate is denominator neglect, and it produces
   * systematically wrong severity judgements — on the one screen whose job is
   * telling a coordinator what to trust.
   *
   * When the total failed to load we say so rather than dropping the phrase.
   * A bare `12` does not read as "denominator unavailable", it reads as a
   * complete answer, which is the exact misreading this row exists to prevent.
   */
  const quantity = (count) => (
    total === null || total === undefined
      ? t('triage_count_of_unknown', { count })
      : t('triage_count_of_total', { count, total })
  );

  const note = unavailable.length > 0 && (
    <p className={styles.unavailable} data-testid="triage-unavailable-note">
      {t('triage_unavailable_intro')}
      {' '}
      {unavailable.map((id) => t(`triage_unavailable_${id}`)).join(', ')}
    </p>
  );

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

  // An empty queue is a GOOD outcome on this screen — but only if every check
  // actually ran, and only if there were records to run them against. An
  // all-clear that might be wrong is worse than no answer, so it is the LAST of
  // three branches: each branch above it is a state that disqualifies the claim.
  if (rows.length === 0) {
    // An organization that has definitively never synced has no records for
    // those checks to have found anything in, so "no records yet" is the more
    // useful, equally true thing to say. It outranks the partial result below
    // because it stays true even when a check also failed — and the note still
    // discloses that. Unlike the all-clear it never claims a check passed.
    // Records are not entered here; they arrive from the Collect mobile app,
    // which is why this names the app rather than offering a create action.
    if (recordState === 'none') {
      return (
        <div data-testid="triage-no-records">
          <EmptyState message={t('triage_no_records')} sub={t('triage_no_records_sub')} />
          {note}
        </div>
      );
    }
    // Not knowing whether records exist disqualifies BOTH claims above: the
    // all-clear would assert the checks found nothing in real data, and the
    // no-records message would assert there is none. "Nothing found, but not
    // everything could be checked" is the strongest honest reading of an empty
    // queue we cannot fully account for, so an unknown record state lands here
    // even when every check ran.
    if (unavailable.length > 0 || recordState === 'unknown') {
      return (
        <div data-testid="triage-partial">
          <EmptyState message={t('triage_partial')} sub={t('triage_partial_sub')} />
          {note}
        </div>
      );
    }
    return (
      <div data-testid="triage-clear">
        <EmptyState message={t('triage_clear')} sub={t('triage_clear_sub')} />
      </div>
    );
  }

  return (
    <>
      <ul className={styles.list}>
      {rows.map((r) => (
        <li key={r.id}>
          {/* Next 12's Link injects href into this anchor at runtime via
              passHref, so it IS keyboard-navigable — the rule cannot see
              that and reports a false positive. */}
          <Link href={r.href} passHref>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a className={styles.row} data-testid={`triage-row-${r.id}`}>
              <span className={styles.count}>{quantity(r.count)}</span>
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
      {note}
    </>
  );
}

NeedsAttention.defaultProps = {
  rows: [], unavailable: [], recordState: 'some', total: null, loading: false,
};

NeedsAttention.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    labelKey: PropTypes.string.isRequired,
    count: PropTypes.number.isRequired,
    severity: PropTypes.oneOf(['critical', 'high', 'medium']).isRequired,
    approximate: PropTypes.bool,
    href: PropTypes.string.isRequired,
  })),
  /** Signal ids whose check could not run — see findUnavailableSignals. */
  unavailable: PropTypes.arrayOf(PropTypes.string),
  /** Whether the organization has any records at all to check. */
  recordState: PropTypes.oneOf(['some', 'none', 'unknown']),
  /**
   * Org-wide record total — the denominator every queue count is read against.
   * Null when that count could not be read; the row then says the total is
   * unknown rather than showing a bare numerator.
   */
  total: PropTypes.number,
  loading: PropTypes.bool,
};
