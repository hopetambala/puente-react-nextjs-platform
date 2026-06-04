import { AppShell, Badge, PageHeader, Skeleton } from 'app/impacto-design-system';
import { retrieveCurrentUserAsyncFunction } from 'app/modules/user';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Parse } from 'parse';
import { useEffect, useState } from 'react';

import styles from './index.module.scss';

const FORM_DOT_COLORS = [
  'var(--tk-dlite-primitive-color-blue-500)',
  'var(--tk-dlite-primitive-color-green-500)',
  'var(--tk-dlite-primitive-color-yellow-500)',
  'var(--tk-dlite-primitive-color-purple-500)',
  'var(--tk-dlite-primitive-color-orange-500)',
];

const SPARKBAR_HEIGHTS = [20, 35, 15, 50, 30, 45, 100];

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatWhen(d: Date): string {
  // Date + time so rows from different days read in the right order.
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export default function Dashboard() {
  const { t } = useTranslation('common');

  const [firstName, setFirstName] = useState('');
  const [org, setOrg] = useState('');
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityItems, setActivityItems] = useState<{ when: string; text: string }[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);
  const [forms, setForms] = useState<{ name: string; count: number; active: boolean }[]>([]);
  const [recordsLast30, setRecordsLast30] = useState<number | null>(null);
  const [activeSurveyors, setActiveSurveyors] = useState<number | null>(null);

  useEffect(() => {
    const user = retrieveCurrentUserAsyncFunction();
    if (user) {
      setFirstName(user.get('firstname') || user.get('username') || '');
      setOrg(user.get('organization') || '');
    }
  }, []);

  useEffect(() => {
    if (!org) return;
    async function fetchStats() {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Records (org-wide, last 30 days)
        const recordsQuery = new Parse.Query('SurveyData');
        recordsQuery.equalTo('surveyingOrganization', org);
        recordsQuery.greaterThanOrEqualTo('createdAt', thirtyDaysAgo);
        const n = await recordsQuery.count();
        setRecordsLast30(n);

        // Active surveyors (org-wide, last 30 days). The browser SDK can't use
        // the Master Key, so distinct() is unavailable — sample records and
        // reduce to a distinct set of surveyors client-side.
        const surveyorsQuery = new Parse.Query('SurveyData');
        surveyorsQuery.equalTo('surveyingOrganization', org);
        surveyorsQuery.greaterThanOrEqualTo('createdAt', thirtyDaysAgo);
        surveyorsQuery.select('surveyingUser');
        surveyorsQuery.limit(1000);
        const surveyorRecords = await surveyorsQuery.find();
        const uniqueSurveyors = new Set(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          surveyorRecords.map((r: any) => r.get('surveyingUser')).filter(Boolean),
        );
        setActiveSurveyors(uniqueSurveyors.size);
      } catch {
        setRecordsLast30(0);
        setActiveSurveyors(0);
      }
    }
    fetchStats();
  }, [org]);

  useEffect(() => {
    if (!org) return;
    async function fetchActivity() {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const query = new Parse.Query('SurveyData');
        query.equalTo('surveyingOrganization', org);
        query.greaterThanOrEqualTo('createdAt', thirtyDaysAgo);
        query.descending('createdAt');
        query.limit(200);
        const results = await query.find();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = results.map((r: any) => ({
          when: formatWhen(r.createdAt),
          text: `${r.get('surveyingUser') || 'Someone'} submitted a record`,
        }));
        setActivityItems(items);
      } catch {
        setActivityItems([]);
      } finally {
        setActivityLoading(false);
      }
    }
    fetchActivity();
  }, [org]);

  useEffect(() => {
    if (!org) return;
    async function fetchForms() {
      try {
        const query = new Parse.Query('FormSpecificationsV2');
        query.equalTo('organizations', org);
        query.equalTo('active', 'true');
        query.descending('updatedAt');
        query.limit(8);
        const results = await query.find();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = results.map((r: any) => ({
          name: r.get('name') || 'Untitled form',
          count: 0,
          active: r.get('active') === 'true',
        }));
        setForms(items);
      } catch {
        setForms([]);
      } finally {
        setFormsLoading(false);
      }
    }
    fetchForms();
  }, [org]);

  const today = formatDate(new Date());

  return (
    <AppShell
      breadcrumb={['Dashboard']}
    >
      <div className={styles.dashboard}>
        <PageHeader
          eyebrow={today}
          title={firstName ? t('dashboard_good_morning', { name: firstName }) : t('dashboard_good_morning', { name: '…' })}
          sub={t('dashboard_sub')}
        />

        {/* stat strip */}
        <div className={styles.statStrip}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t('stat_records')}</span>
            {recordsLast30 === null
              ? <Skeleton width={48} height={28} style={{ margin: '2px 0' }} />
              : <span className={styles.statValue}>{recordsLast30}</span>}
            <div className={styles.statMeta}>
              {recordsLast30 === null
                ? <Skeleton width={80} height={12} style={{ marginTop: 6 }} />
                : <span>{t('stat_window_30d')}</span>}
            </div>
            <div className={styles.sparkline}>
              {/* eslint-disable react/no-array-index-key */}
              {SPARKBAR_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  className={`${styles.bar}${i === SPARKBAR_HEIGHTS.length - 1 ? ` ${styles.barActive}` : ''}`}
                  style={{ height: `${h}%` }}
                />
              ))}
              {/* eslint-enable react/no-array-index-key */}
            </div>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t('stat_active_surveyors')}</span>
            {activeSurveyors === null
              ? <Skeleton width={48} height={28} style={{ margin: '2px 0' }} />
              : <span className={styles.statValue}>{activeSurveyors}</span>}
            <div className={styles.statMeta}>
              <span className={styles.pulse} />
              {activeSurveyors === null
                ? <Skeleton width={80} height={12} style={{ marginTop: 6 }} />
                : <span>{t('stat_window_30d')}</span>}
            </div>
          </div>
        </div>

        {/* two-column body */}
        <div className={styles.body}>
          {/* field activity feed */}
          <div>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>{t('field_activity')}</span>
            </div>
            {activityLoading && (
              <div className={styles.activityList}>
                {/* eslint-disable react/no-array-index-key */}
                {[100, 75, 88, 60, 92].map((w, i) => (
                  <div key={i} className={styles.skeletonRow}>
                    <Skeleton width={40} height={11} />
                    <span className={styles.activityDot} />
                    <Skeleton width={`${w}%`} height={13} />
                  </div>
                ))}
                {/* eslint-enable react/no-array-index-key */}
              </div>
            )}
            {!activityLoading && activityItems.length === 0 && (
              <div className={styles.activityEmpty}>No recent submissions.</div>
            )}
            {!activityLoading && activityItems.length > 0 && (
              <div className={styles.activityList}>
                {activityItems.map((item, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} className={styles.activityRow}>
                    <span className={styles.activityTime}>{item.when}</span>
                    <span className={styles.activityDot} />
                    <span className={styles.activityText}>{item.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* your forms */}
          <div>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>{t('your_forms')}</span>
            {/* eslint-disable jsx-a11y/anchor-is-valid */}
            <Link href="/forms/form-manager" passHref>
              <a className={styles.panelLink}>View all →</a>
            </Link>
            {/* eslint-enable jsx-a11y/anchor-is-valid */}
            </div>
            {formsLoading && (
              <div className={styles.formList}>
                {/* eslint-disable react/no-array-index-key */}
                {[65, 80, 50].map((w, i) => (
                  <div key={i} className={styles.skeletonRow}>
                    <Skeleton width={8} height={8} style={{ borderRadius: '50%' }} />
                    <Skeleton width={`${w}%`} height={13} />
                  </div>
                ))}
                {/* eslint-enable react/no-array-index-key */}
              </div>
            )}
            {!formsLoading && forms.length === 0 && (
              <div className={styles.activityEmpty}>No forms yet.</div>
            )}
            {!formsLoading && forms.length > 0 && (
              <div className={styles.formList}>
                {forms.map((form, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} className={styles.formRow}>
                    <span
                      className={styles.formDot}
                      style={{ background: FORM_DOT_COLORS[i % FORM_DOT_COLORS.length] }}
                    />
                    <span className={styles.formName}>{form.name}</span>
                    <span className={styles.formCount}>{form.count}</span>
                    {form.active && <Badge variant="yellow">Field-active</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
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
