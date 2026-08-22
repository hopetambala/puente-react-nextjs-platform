import { summarizeCoverage } from 'app/epics/DashboardTriage/coverage';
import CoverageRail from 'app/epics/DashboardTriage/CoverageRail';
import { loadDashboardTriage } from 'app/epics/DashboardTriage/loadTriage';
import NeedsAttention from 'app/epics/DashboardTriage/NeedsAttention';
import SyncRibbon from 'app/epics/DashboardTriage/SyncRibbon';
import { summarizeSyncState } from 'app/epics/DashboardTriage/syncState';
import { buildTriageQueue, findUnavailableSignals } from 'app/epics/DashboardTriage/triageQueue';
import { AppShell } from 'app/impacto-design-system';
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
  accountsSynced: { count: number; exact: boolean };
  sync: { lastSyncAt: Date | null; recordsLast24h: number };
  signals: {
    missingKeyFields: Signal;
    unresolvedParent: Signal;
    possibleDuplicates: Signal;
    possibleFormDrift: Signal;
  };
  coverage: { records: { community: string; syncedAt: Date }[]; sampleSize: number };
};

/**
 * The dashboard is a DISPATCHER, not a scoreboard. Success is a click into
 * curation, not time spent here. So it carries exactly three things: whether
 * today's data can be trusted (the ribbon), what to do about it (the queue),
 * and where to send a team next (coverage). Totals are demoted to a footer
 * because they inform nothing on their own.
 *
 * Deliberately absent — each was in the previous version and each was removed
 * on purpose, so please read docs/design-direction.md §11.3 before adding one
 * back: a greeting, an activity feed, a forms list, any chart.
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

  useEffect(() => {
    if (!org) return;
    let ignore = false;

    loadDashboardTriage({ Parse, org, now: new Date() })
      .then((d) => { if (!ignore) setData(d); })
      // A failed load must leave the page standing, not blank it.
      .catch(() => { if (!ignore) setData(null); })
      .finally(() => { if (!ignore) setLoading(false); });

    // eslint-disable-next-line consistent-return
    return () => { ignore = true; };
  }, [org]);

  const syncState = data ? summarizeSyncState({ ...data.sync, now: new Date() }) : null;
  const queue = data ? buildTriageQueue(data.signals) : [];
  // A check that could not run must not read as a check that passed.
  const unavailable = data ? findUnavailableSignals(data.signals) : [];
  const coverage = data
    ? summarizeCoverage({ ...data.coverage, now: new Date() })
    : null;

  return (
    <AppShell breadcrumb={['Dashboard']}>
      <SyncRibbon state={syncState} loading={loading} />

      <div className={styles.body}>
        <section className={styles.queue}>
          <h2 className={styles.panelTitle}>{t('dashboard_needs_attention')}</h2>
          <NeedsAttention rows={queue} unavailable={unavailable} loading={loading} />
        </section>

        <aside className={styles.rail}>
          <h2 className={styles.panelTitle}>{t('dashboard_coverage')}</h2>
          <CoverageRail summary={coverage} loading={loading} />
        </aside>
      </div>

      {/* Totals live here, demoted, each with its denominator and its caveat. */}
      <footer className={styles.contextStrip} data-testid="context-strip">
        <span className={styles.contextItem}>
          <span className={styles.contextValue}>{data ? data.sync.recordsLast24h : '—'}</span>
          <span className={styles.contextLabel}>
            {t('context_records_synced')}
            {' · '}
            {t('context_window_24h')}
          </span>
        </span>
        <span className={styles.contextItem}>
          <span className={styles.contextValue}>{data ? data.accountsSynced.count : '—'}</span>
          <span className={styles.contextLabel}>
            {t('context_accounts_synced')}
            {' · '}
            {t('context_accounts_note')}
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
