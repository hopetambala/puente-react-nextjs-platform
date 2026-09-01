import { summarizeCoverage } from 'app/epics/DashboardTriage/coverage';
import CoverageRail from 'app/epics/DashboardTriage/CoverageRail';
import { loadDashboardTriage } from 'app/epics/DashboardTriage/loadTriage';
import NeedsAttention from 'app/epics/DashboardTriage/NeedsAttention';
import SyncRibbon from 'app/epics/DashboardTriage/SyncRibbon';
import { summarizeSyncState } from 'app/epics/DashboardTriage/syncState';
import { buildTriageQueue, findUnavailableSignals } from 'app/epics/DashboardTriage/triageQueue';
import { AppShell } from 'app/impacto-design-system';
import { loadOrganizationScope } from 'app/modules/organization';
import { retrieveCurrentUserAsyncFunction } from 'app/modules/user';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Parse } from 'parse';
import { useEffect, useState } from 'react';

import styles from './index.module.scss';

/**
 * Shape of the loader payload. Declared here because loadTriage is plain JS and
 * TypeScript cannot infer across the boundary. `exact` is the load-bearing
 * field: it decides whether the UI hedges the number.
 */
type Signal = { count: number; exact: boolean } | null;

type TriageData = {
  accountsSynced: { count: number; exact: boolean; sampledFrom: number };
  /** Org-wide record total — the denominator the queue counts are read against. */
  totalRecords: number | null;
  sync: { lastSyncAt: Date | null; lastSyncAvailable: boolean; recordsLast24h: number | null };
  signals: {
    missingKeyFields: Signal;
    unresolvedParent: Signal;
    possibleDuplicates: Signal;
    possibleFormDrift: Signal;
  };
  coverage: { records: { community: string; syncedAt: Date }[]; sampleSize: number };
};

/**
 * How the sync answer decides whether the organization has records to check.
 * Only these two statuses say anything about that; every other status describes
 * a sync that happened, which means records exist, so anything absent from this
 * map means 'some'.
 *
 * 'never' means the last-sync read RAN and found nothing, so there is no data
 * for the checks to have cleared. 'unknown' means that read FAILED, which
 * leaves us unable to tell an empty organization from a clean one; our own
 * broken request is not evidence about their fieldwork either way, so the page
 * forwards that uncertainty to the queue rather than resolving it — collapsing
 * it into 'some' would quietly license the all-clear.
 */
const RECORD_STATE_BY_SYNC_STATUS: Record<string, 'none' | 'unknown'> = {
  never: 'none',
  unknown: 'unknown',
};

/**
 * The dashboard is a DISPATCHER, not a scoreboard. Success is a click into
 * curation, not time spent here. So it carries exactly three things: whether
 * today's data can be trusted (the ribbon), what to do about it (the queue),
 * and where to send a team next (coverage). Totals are demoted to a footer
 * because they inform nothing on their own.
 *
 * Deliberately absent, each removed on purpose — a greeting, an activity feed,
 * a forms list, any chart. The greeting cost a row of vertical space on the
 * most-visited screen in the product and answered nothing; fifty rows of the
 * same sentence is a log, not awareness; a forms list is navigation, not
 * attention; and nothing here is a trend question yet. Before adding one back,
 * make it answer the only two questions this screen takes: does it tell you
 * whether to trust today's data, or does it hand you work?
 */
export default function Dashboard() {
  const { t } = useTranslation('common');

  const [org, setOrg] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TriageData | null>(null);

  useEffect(() => {
    const user = retrieveCurrentUserAsyncFunction();
    if (user) setOrg(user.get('organization') || '');
  }, []);

  // Every string this organization's records may carry. Resolved once, then
  // every query below is scoped with containedIn instead of equalTo — records
  // hold the string that was COLLECTED, and one organization's are spread
  // across several. Measured in production: DR Missions has 11 rows under
  // "DR Missions" and 611 under "DRMT", so equalTo showed that user 1% of
  // their own data with no error and no way to tell.
  const [orgValues, setOrgValues] = useState<string[]>([]);
  useEffect(() => {
    if (!org) return undefined;
    let ignore = false;
    loadOrganizationScope(Parse, org).then((values: string[]) => {
      if (!ignore) setOrgValues(values);
    });
    return () => { ignore = true; };
  }, [org]);

  useEffect(() => {
    if (!orgValues.length) return;
    let ignore = false;

    loadDashboardTriage({ Parse, orgValues, now: new Date() })
      .then((d) => { if (!ignore) setData(d); })
      // A failed load must leave the page standing, not blank it.
      .catch(() => { if (!ignore) setData(null); })
      .finally(() => { if (!ignore) setLoading(false); });

    // eslint-disable-next-line consistent-return
    return () => { ignore = true; };
  }, [orgValues]);

  const syncState = data ? summarizeSyncState({ ...data.sync, now: new Date() }) : null;
  const queue = data ? buildTriageQueue(data.signals) : [];
  // A check that could not run must not read as a check that passed.
  const unavailable = data ? findUnavailableSignals(data.signals) : [];
  const coverage = data
    ? summarizeCoverage({ ...data.coverage, now: new Date() })
    : null;
  // Read off the same sync answer the ribbon uses, so the queue and the ribbon
  // cannot disagree about whether this organization has ever synced. A load that
  // never returned is the strongest form of "we don't know" — nothing was
  // checked at all — so it takes the same branch as an unreadable freshness
  // query rather than defaulting to 'some' and licensing the all-clear.
  const recordState = syncState
    ? (RECORD_STATE_BY_SYNC_STATUS[syncState.status] || 'some')
    : 'unknown';

  return (
    <AppShell breadcrumb={[t('breadcrumb_dashboard')]}>
      <SyncRibbon state={syncState} loading={loading} />

      <div className={styles.body}>
        <section className={styles.queue}>
          <h2 className={styles.panelTitle}>{t('dashboard_needs_attention')}</h2>
          <NeedsAttention
            rows={queue}
            unavailable={unavailable}
            recordState={recordState}
            total={data ? data.totalRecords : null}
            loading={loading}
          />
        </section>

        <aside className={styles.rail}>
          <h2 className={styles.panelTitle}>{t('dashboard_coverage')}</h2>
          <CoverageRail summary={coverage} loading={loading} />
        </aside>
      </div>

      {/* Totals live here, demoted, each carrying its own denominator.
          The 24h sync volume used to sit here too and has been removed: the
          ribbon already states it at the top of the same screen, so the footer
          copy was the identical value under a different label — which reads as
          two independent facts that happen to agree. */}
      <footer className={styles.contextStrip} data-testid="context-strip">
        <span className={styles.contextItem}>
          {/* Formatted through i18next rather than emitted as a raw JS number.
              This is the SAME quantity the queue rows quote as their
              denominator, and the queue formats it — so unformatted here it
              rendered "43979" directly under a queue reading "12 of 43,979",
              which looks like two different figures on a screen whose whole
              job is telling a coordinator what to trust. Spanish groups with
              '.', so the raw form was wrong, not merely inconsistent. */}
          <span className={styles.contextValue}>
            {data?.totalRecords === null || data?.totalRecords === undefined
              ? '—'
              : t('number_value', { value: data.totalRecords })}
          </span>
          <span className={styles.contextLabel}>{t('context_records_total')}</span>
        </span>
        <span className={styles.contextItem}>
          {/* The denominator moves INTO the label instead of trailing behind a
              prose caveat: this is a count of accounts seen in a sample, and
              "7" alone reads as the organization's entire staff. The figure is
              the rows actually read, not the sample cap — an org with 343
              records was never sampled from 1,000. */}
          <span className={styles.contextValue}>
            {data ? t('number_value', { value: data.accountsSynced.count }) : '—'}
          </span>
          <span className={styles.contextLabel}>
            {t('context_accounts_synced_of', { count: data ? data.accountsSynced.sampledFrom : 0 })}
          </span>
        </span>
      </footer>
    </AppShell>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
